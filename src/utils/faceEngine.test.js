// faceEngine.init() bootstraps the manifest fetch that both the staff-session
// enrollment UI and the unattended check-in kiosk depend on. The kiosk has no
// session cookie, so it must authenticate via X-Device-Secret instead — these
// tests pin that header behavior (and the idempotent-promise caching it shares
// with the enrollment call) against regressions.

jest.mock('@litertjs/core', () => ({
  loadLiteRt: jest.fn().mockResolvedValue(undefined),
  loadAndCompile: jest.fn().mockResolvedValue({ __mockModel: true }),
  Tensor: class {},
}));

jest.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: jest.fn().mockResolvedValue({ __mockFileset: true }) },
  FaceLandmarker: {
    createFromOptions: jest.fn().mockResolvedValue({ __mockLandmarker: true }),
  },
}));

const MANIFEST_BODY = {
  data: {
    modelVersion: 'v1',
    litertWasmPath: '/litert.wasm',
    embedder: { url: '/embedder.tflite' },
    mediapipeWasmPath: '/mediapipe.wasm',
    landmarker: { url: '/landmarker.task' },
  },
};

function mockManifestFetch({ ok = true, status = 200 } = {}) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => MANIFEST_BODY,
  });
}

// Each test needs a pristine singleton (init() memoizes on the module-level
// instance), so reload the module fresh instead of relying on dispose().
function freshFaceEngine() {
  let faceEngine;
  jest.isolateModules(() => {
    faceEngine = require('./faceEngine').default;
  });
  return faceEngine;
}

describe('faceEngine.init — device secret header (kiosk bootstrap)', () => {
  afterEach(() => {
    delete global.fetch;
    jest.clearAllMocks();
  });

  it('attaches X-Device-Secret when a secret is passed (kiosk path)', async () => {
    const fetchMock = mockManifestFetch();
    global.fetch = fetchMock;
    const faceEngine = freshFaceEngine();

    await faceEngine.init('s3cret');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/biometric/face/model-manifest');
    expect(opts.credentials).toBe('include');
    expect(opts.headers['X-Device-Secret']).toBe('s3cret');
  });

  it('sends no X-Device-Secret header when called without one (staff-session path)', async () => {
    const fetchMock = mockManifestFetch();
    global.fetch = fetchMock;
    const faceEngine = freshFaceEngine();

    await faceEngine.init();

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers['X-Device-Secret']).toBeUndefined();
    expect(opts.credentials).toBe('include');
  });

  it('is idempotent: concurrent callers share one in-flight fetch', async () => {
    const fetchMock = mockManifestFetch();
    global.fetch = fetchMock;
    const faceEngine = freshFaceEngine();

    const [a, b] = await Promise.all([faceEngine.init('s3cret'), faceEngine.init('s3cret')]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('a later caller does not retrigger the fetch once init has resolved, even with a different secret', async () => {
    const fetchMock = mockManifestFetch();
    global.fetch = fetchMock;
    const faceEngine = freshFaceEngine();

    await faceEngine.init('s3cret');
    await faceEngine.init('a-different-secret');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('populates modelVersion from the fetched manifest on success', async () => {
    global.fetch = mockManifestFetch();
    const faceEngine = freshFaceEngine();

    await faceEngine.init('s3cret');

    expect(faceEngine.modelVersion).toBe('v1');
  });

  it('throws a specific message on 404 (no manifest deployed)', async () => {
    global.fetch = mockManifestFetch({ ok: false, status: 404 });
    const faceEngine = freshFaceEngine();

    await expect(faceEngine.init('s3cret')).rejects.toThrow(/no face model manifest deployed/i);
  });

  it('throws a generic HTTP-status message on other failures (e.g. 401 missing/invalid secret)', async () => {
    global.fetch = mockManifestFetch({ ok: false, status: 401 });
    const faceEngine = freshFaceEngine();

    await expect(faceEngine.init('wrong-secret')).rejects.toThrow(/HTTP 401/);
  });

  it('clears the cached promise on failure so a retry with the corrected secret can succeed', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => MANIFEST_BODY });
    global.fetch = fetchMock;
    const faceEngine = freshFaceEngine();

    await expect(faceEngine.init()).rejects.toThrow(/HTTP 401/);
    await expect(faceEngine.init('s3cret')).resolves.toBe(faceEngine);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers['X-Device-Secret']).toBe('s3cret');
  });
});

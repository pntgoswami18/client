import {
  deriveStationStatus,
  hasStationSecret,
  loadStationConfig,
  saveStationConfig,
  clearStationConfig,
  submitCheckIn,
} from './faceStation';

describe('deriveStationStatus — fail-closed screen selection (plan 6.2)', () => {
  const ready = { enabled: true, doorDeviceConfigured: true };

  it('demands setup before anything else when no secret is provisioned', () => {
    // Even a fully-ready config cannot matter if the station cannot authenticate.
    expect(deriveStationStatus({ hasSecret: false, config: ready })).toBe('setup');
    expect(deriveStationStatus({ hasSecret: false, config: null, configError: true })).toBe(
      'setup'
    );
  });

  it('reports error when the config fetch failed (server unreachable / unauthorized)', () => {
    expect(deriveStationStatus({ hasSecret: true, config: null, configError: true })).toBe('error');
    expect(deriveStationStatus({ hasSecret: true, config: null })).toBe('error');
  });

  it('distinguishes feature-disabled from no-door so setup mistakes are diagnosable', () => {
    expect(
      deriveStationStatus({
        hasSecret: true,
        config: { enabled: false, doorDeviceConfigured: true },
      })
    ).toBe('disabled');
    expect(
      deriveStationStatus({
        hasSecret: true,
        config: { enabled: true, doorDeviceConfigured: false },
      })
    ).toBe('no_door');
  });

  it('is ready only when provisioned, enabled, and a door is configured', () => {
    expect(deriveStationStatus({ hasSecret: true, config: ready })).toBe('ready');
  });

  it('checks disabled before no_door (a disabled feature is the more fundamental block)', () => {
    expect(
      deriveStationStatus({
        hasSecret: true,
        config: { enabled: false, doorDeviceConfigured: false },
      })
    ).toBe('disabled');
  });
});

describe('hasStationSecret', () => {
  it('treats empty / whitespace / missing as unprovisioned', () => {
    expect(hasStationSecret(null)).toBe(false);
    expect(hasStationSecret({ deviceSecret: '' })).toBe(false);
    expect(hasStationSecret({ deviceSecret: '   ' })).toBe(false);
    expect(hasStationSecret({ deviceSecret: 'abc' })).toBe(true);
  });
});

describe('station config round-trip (localStorage)', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty strings when nothing is stored', () => {
    expect(loadStationConfig()).toEqual({ deviceSecret: '', stationLabel: '' });
  });

  it('persists and reloads, trimming surrounding whitespace', () => {
    saveStationConfig({ deviceSecret: '  s3cret ', stationLabel: '  Front Desk ' });
    expect(loadStationConfig()).toEqual({ deviceSecret: 's3cret', stationLabel: 'Front Desk' });
  });

  it('survives corrupt JSON without throwing', () => {
    localStorage.setItem('gmgmt_face_station', '{not json');
    expect(loadStationConfig()).toEqual({ deviceSecret: '', stationLabel: '' });
  });

  it('clears', () => {
    saveStationConfig({ deviceSecret: 'x', stationLabel: 'y' });
    clearStationConfig();
    expect(loadStationConfig()).toEqual({ deviceSecret: '', stationLabel: '' });
  });
});

describe('submitCheckIn — sends the probe for server-side re-scoring', () => {
  afterEach(() => {
    delete global.fetch;
  });

  it('includes the probe embedding and device secret in the POST body', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authorized: true, action: 'checkin', memberName: 'A' }),
    });
    global.fetch = fetchMock;

    const embedding = Array.from({ length: 128 }, (_, i) => i / 128);
    const resp = await submitCheckIn('s3cret', {
      memberId: 7,
      matchScore: 0.8,
      livenessPassed: true,
      deviceId: 'Front Desk',
      embedding,
    });

    expect(resp.authorized).toBe(true);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/face/check-in');
    expect(opts.headers['X-Device-Secret']).toBe('s3cret');
    const sent = JSON.parse(opts.body);
    expect(sent.embedding).toEqual(embedding);
    expect(sent.memberId).toBe(7);
  });

  it('throws on 5xx so the kiosk fails closed rather than guessing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ reason: 'face_checkin_disabled' }),
    });
    await expect(submitCheckIn('s3cret', { memberId: 1, embedding: [] })).rejects.toThrow();
  });

  it('does NOT throw on a 4xx — surfaces the structured denial so the kiosk shows the reason', async () => {
    // 403/400 (disabled, bad claim, invalid_probe_embedding) are business
    // denials, not outages: the hook renders resp.reason and keeps the door
    // locked. Throwing here would flip a specific denial into a generic
    // "offline" screen.
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ authorized: false, reason: 'invalid_probe_embedding' }),
    });
    const resp = await submitCheckIn('s3cret', { memberId: 1, embedding: [] });
    expect(resp.authorized).toBe(false);
    expect(resp.reason).toBe('invalid_probe_embedding');
  });

  it('returns a 2xx-but-unauthorized body as-is (deny path, no throw)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ authorized: false, reason: 'below_match_threshold' }),
    });
    const resp = await submitCheckIn('s3cret', { memberId: 1, embedding: [0.1, 0.2] });
    expect(resp.authorized).toBe(false);
    expect(resp.reason).toBe('below_match_threshold');
  });
});

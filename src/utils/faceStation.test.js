import {
  deriveStationStatus,
  hasStationSecret,
  loadStationConfig,
  saveStationConfig,
  clearStationConfig,
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

import {
  appendWorkstreamIdsParam,
  dashboardWorkstreamScopeKey,
  loadDashboardWorkstreamScope,
  loadDashboardWorkstreamScopeFromCookies,
  migrateLocalStorageScopeToCookie,
  parseDashboardWorkstreamScope,
  parseScopedWorkstreamIds,
  resolveDashboardWorkstreamScope,
  saveDashboardWorkstreamScope,
  saveDashboardWorkstreamScopeToCookie,
} from '@/lib/dashboard/workstream-scope';

describe('dashboard workstream scope helper', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0]?.trim();
      if (name) {
        document.cookie = `${name}=; Max-Age=0; Path=/`;
      }
    });
  });

  it('namespaces storage keys by dashboard ID', () => {
    expect(dashboardWorkstreamScopeKey('main')).toBe('dashboardWorkstreamScope:v1:main');
    expect(dashboardWorkstreamScopeKey('streams')).toBe('dashboardWorkstreamScope:v1:streams');
  });

  it('falls back when stored payload is absent, malformed, empty, or inaccessible', () => {
    expect(parseDashboardWorkstreamScope(null)).toBeNull();
    expect(parseDashboardWorkstreamScope('{bad-json')).toBeNull();
    expect(parseDashboardWorkstreamScope(JSON.stringify({ includedWorkstreamIds: [] }))).toBeNull();
    expect(
      loadDashboardWorkstreamScope(
        {
          getItem: () => {
            throw new Error('blocked');
          },
        },
        'main'
      )
    ).toBeNull();
  });

  it('saves non-empty unique IDs and rejects empty selections', () => {
    const setItem = jest.fn();

    expect(() => saveDashboardWorkstreamScope({ setItem }, 'main', [])).toThrow(
      /at least one workstream/i
    );

    saveDashboardWorkstreamScope({ setItem }, 'main', ['ws-1', 'ws-1', ' ws-2 '], new Date(0));

    expect(setItem).toHaveBeenCalledWith(
      'dashboardWorkstreamScope:v1:main',
      JSON.stringify({
        includedWorkstreamIds: ['ws-1', 'ws-2'],
        updatedAt: '1970-01-01T00:00:00.000Z',
      })
    );
  });

  it('loads and saves scope through cookie adapters', () => {
    expect(() => saveDashboardWorkstreamScopeToCookie('main', [])).toThrow(
      /at least one workstream/i
    );

    saveDashboardWorkstreamScopeToCookie('main', ['ws-1', 'ws-1', ' ws-2 '], new Date(0));

    expect(loadDashboardWorkstreamScopeFromCookies(document.cookie, 'main')).toEqual([
      'ws-1',
      'ws-2',
    ]);
    expect(loadDashboardWorkstreamScopeFromCookies('{bad-cookie', 'main')).toBeNull();
  });

  it('migrates valid localStorage scope to cookies and removes the legacy key', () => {
    const storage = window.localStorage;
    storage.setItem(
      dashboardWorkstreamScopeKey('main'),
      JSON.stringify({
        includedWorkstreamIds: ['ws-1', 'ws-2'],
        updatedAt: '2026-06-17T00:00:00.000Z',
      })
    );

    expect(migrateLocalStorageScopeToCookie(storage, 'main')).toEqual(['ws-1', 'ws-2']);
    expect(storage.getItem(dashboardWorkstreamScopeKey('main'))).toBeNull();
    expect(loadDashboardWorkstreamScopeFromCookies(document.cookie, 'main')).toEqual([
      'ws-1',
      'ws-2',
    ]);
  });

  it('skips migration when a cookie already exists or legacy storage is invalid', () => {
    const removeItem = jest.fn();
    const setItem = jest.fn();
    const cookieHeader = `${dashboardWorkstreamScopeKey('main')}=${encodeURIComponent(
      JSON.stringify({
        includedWorkstreamIds: ['cookie-ws'],
        updatedAt: '2026-06-17T00:00:00.000Z',
      })
    )}`;

    expect(
      migrateLocalStorageScopeToCookie(
        {
          getItem: () =>
            JSON.stringify({
              includedWorkstreamIds: ['legacy-ws'],
              updatedAt: '2026-06-17T00:00:00.000Z',
            }),
          removeItem,
        },
        'main',
        cookieHeader
      )
    ).toBeNull();
    expect(removeItem).not.toHaveBeenCalled();

    expect(
      migrateLocalStorageScopeToCookie(
        {
          getItem: () => '{bad-json',
          removeItem: setItem,
        },
        'main',
        ''
      )
    ).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('skips migration when legacy storage is inaccessible', () => {
    const removeItem = jest.fn();

    expect(
      migrateLocalStorageScopeToCookie(
        {
          getItem: () => {
            throw new Error('blocked');
          },
          removeItem,
        },
        'main',
        ''
      )
    ).toBeNull();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('reconciles stale saved IDs and falls back to default names when none remain', () => {
    const workstreams = [
      { id: 'ws-1', name: 'Action Tracker' },
      { id: 'ws-2', name: 'Pitch Tracker' },
      { id: 'ws-3', name: 'Other' },
    ];

    expect(
      resolveDashboardWorkstreamScope({
        storedIds: ['stale', 'ws-2'],
        workstreams,
        defaultWorkstreamNames: ['Action Tracker'],
      })
    ).toEqual({ includedWorkstreamIds: ['ws-2'], source: 'saved' });

    expect(
      resolveDashboardWorkstreamScope({
        storedIds: ['stale'],
        workstreams,
        defaultWorkstreamNames: ['Action Tracker'],
      })
    ).toEqual({ includedWorkstreamIds: ['ws-1'], source: 'default' });
  });

  it('parses and builds scoped query parameters', () => {
    expect(parseScopedWorkstreamIds(new URLSearchParams(''))).toEqual({
      kind: 'absent',
      ids: null,
    });
    expect(parseScopedWorkstreamIds(new URLSearchParams('workstreamIds='))).toEqual({
      kind: 'invalid',
      ids: [],
    });
    expect(parseScopedWorkstreamIds(new URLSearchParams('workstreamIds=ws-1,ws-2,ws-1'))).toEqual({
      kind: 'scoped',
      ids: ['ws-1', 'ws-2'],
    });
    expect(appendWorkstreamIdsParam('/api/metrics?dashboard=main', ['ws-1', 'ws-2'])).toBe(
      '/api/metrics?dashboard=main&workstreamIds=ws-1%2Cws-2'
    );
  });
});

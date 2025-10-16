import type { SessionPayload } from '../../apps/web/src/lib/auth/session';
import { fetchServerSession } from '../../apps/web/src/lib/auth/server-session';
import { __resetCookiesStore, cookies, headers } from 'next/headers';

describe('fetchServerSession', () => {
  const originalFetch = global.fetch;
  const headersMock = headers as jest.MockedFunction<typeof headers>;
  const cookiesMock = cookies as jest.MockedFunction<typeof cookies>;

  beforeEach(() => {
    __resetCookiesStore();
    headersMock.mockReturnValue({
      get: (key: string) => {
        if (key === 'host') {
          return 'localhost:3000';
        }
        if (key === 'x-forwarded-proto') {
          return 'http';
        }
        return null;
      },
    });
    const cookieStore = cookiesMock();
    cookieStore.set({ name: 'ams.session', value: 'encoded-session' });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('refreshes the session when access token expired but refresh token is valid', async () => {
    const refreshedSession: SessionPayload = {
      accessToken: 'new-access-token',
      refreshToken: 'still-valid-refresh-token',
      user: {
        id: 1,
        email: 'admin@example.com',
        role: 'ADMIN',
      },
    };

    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        authenticated: true,
        session: refreshedSession,
      }),
    })) as unknown as typeof fetch;

    const session = await fetchServerSession();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/session',
      expect.objectContaining({
        cache: 'no-store',
      })
    );
    expect(session).toEqual(refreshedSession);
  });

  it('returns null when the API reports the user is not authenticated', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ authenticated: false }),
    })) as unknown as typeof fetch;

    const session = await fetchServerSession();

    expect(session).toBeNull();
  });
});

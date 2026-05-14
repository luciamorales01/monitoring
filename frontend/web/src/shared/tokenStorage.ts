const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const PERSISTENCE_KEY = 'tokenPersistence';

type TokenPersistence = 'local' | 'session';

function getStorage(persistence?: TokenPersistence) {
  const savedPersistence = localStorage.getItem(PERSISTENCE_KEY) as
    | TokenPersistence
    | null;

  const targetPersistence = persistence ?? savedPersistence ?? 'local';
  return targetPersistence === 'session' ? sessionStorage : localStorage;
}

export const tokenStorage = {
  get() {
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },
  getPersistence(): TokenPersistence {
    return (localStorage.getItem(PERSISTENCE_KEY) as TokenPersistence | null) ?? 'local';
  },
  set(token: string, persistence: TokenPersistence = 'local', refreshToken?: string) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.setItem(PERSISTENCE_KEY, persistence);
    getStorage(persistence).setItem(ACCESS_TOKEN_KEY, token);

    if (refreshToken) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      getStorage(persistence).setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(PERSISTENCE_KEY);
  },
};

export type { TokenPersistence };

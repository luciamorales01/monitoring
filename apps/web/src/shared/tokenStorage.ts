const TOKEN_KEY = 'accessToken';
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
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  },
  set(token: string, persistence: TokenPersistence = 'local') {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(PERSISTENCE_KEY, persistence);
    getStorage(persistence).setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PERSISTENCE_KEY);
  },
};

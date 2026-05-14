import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { refreshSession } from '../modules/auth/authApi';
import { tokenStorage } from '../shared/tokenStorage';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasSession, setHasSession] = useState(() => Boolean(tokenStorage.get()));

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      if (tokenStorage.get()) {
        setHasSession(true);
        return;
      }

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        setHasSession(false);
        return;
      }

      setIsRestoring(true);
      try {
        const res = await refreshSession(refreshToken);
        if (!cancelled) {
          tokenStorage.set(
            res.accessToken,
            tokenStorage.getPersistence(),
            res.refreshToken,
          );
          setHasSession(true);
        }
      } catch {
        tokenStorage.clear();
        if (!cancelled) setHasSession(false);
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isRestoring) {
    return <div style={{ padding: 32 }}>Restaurando sesión...</div>;
  }

  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

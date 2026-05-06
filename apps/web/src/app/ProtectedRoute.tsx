import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { tokenStorage } from '../shared/tokenStorage';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = tokenStorage.get();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

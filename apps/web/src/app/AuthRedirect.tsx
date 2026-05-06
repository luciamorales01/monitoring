import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { tokenStorage } from '../shared/tokenStorage';

export default function AuthRedirect({ children }: { children: ReactNode }) {
  if (tokenStorage.get()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

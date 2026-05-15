import { useEffect, useState } from 'react';
import { getMe } from '../modules/auth/authApi';

export type AuthRole = 'OWNER' | 'ADMIN' | 'VIEWER';

let cachedRole: string | null = null;

export function canWrite(role?: string | null) {
  return role === 'OWNER' || role === 'ADMIN';
}

export function canManageUsers(role?: string | null) {
  return role === 'OWNER';
}


export function useCurrentUserPermissions() {
  const [role, setRole] = useState<string | null>(cachedRole);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((user) => {
        cachedRole = user.role;
        if (!cancelled) setRole(user.role);
      })
      .catch(() => {
        cachedRole = null;
        if (!cancelled) setRole(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    canWrite: canWrite(role),
    canManageUsers: canManageUsers(role),
    isLoading,
    role: role as AuthRole | null,
  };
}
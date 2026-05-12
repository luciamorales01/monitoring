import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUserPermissions } from "../shared/permissions";

export function OwnerRoute({ children }: { children: ReactNode }) {
  const { canManageUsers, isLoading } = useCurrentUserPermissions();

  if (isLoading) {
    return <div style={{ padding: 32 }}>Comprobando permisos...</div>;
  }

  if (!canManageUsers) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

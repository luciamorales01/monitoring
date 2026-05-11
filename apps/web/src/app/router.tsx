import { type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ForgotPasswordPage from "../modules/auth/ForgotPasswordPage";
import LoginPage from "../modules/auth/LoginPage";
import RegisterPage from "../modules/auth/RegisterPage";
import CreateMonitorPage from "../modules/monitors/CreateMonitorPage";
import IncidentsPage from "../modules/incidents/IncidentsPage";
import IncidentDetailPage from "../modules/incidents/IncidentDetailPage";
import { ProtectedRoute } from "./ProtectedRoute";
import DashboardPage from "../modules/dashboard/DashboardPage";
import AppLayout from "./AppLayout";
import MonitorDetailPage from "../modules/monitors/MonitorDetailPage";
import MonitorsPage from "../modules/monitors/MonitorsPage";
import SectionDetailPage from "../modules/sections/SectionDetailPage";
import SectionsPage from "../modules/sections/SectionsPage";
import UsersPage from "../modules/users/UsersPage";
import ProfilePage from "../modules/profile/ProfilePage";
import PublicStatusPage from "../modules/status/PublicStatusPage";
import AuthRedirect from "./AuthRedirect";
import RouteErrorPage from "./RouteErrorPage";
import NotFoundPage from "./NotFoundPage";
import ResetPasswordPage from "../modules/auth/ResetPasswordPage";
import AcceptInvitationPage from "../modules/auth/AcceptInvitationPage";
import { useCurrentUserPermissions } from "../shared/permissions";

function OwnerRoute({ children }: { children: ReactNode }) {
  const { canManageUsers, isLoading } = useCurrentUserPermissions();

  if (isLoading) {
    return <div style={{ padding: 32 }}>Comprobando permisos...</div>;
  }

  if (!canManageUsers) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export const router = createBrowserRouter([
  {
    path: "/restablecer-password",
    element: <ResetPasswordPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/login",
    element: (
      <AuthRedirect>
        <LoginPage />
      </AuthRedirect>
    ),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/registro",
    element: (
      <AuthRedirect>
        <RegisterPage />
      </AuthRedirect>
    ),
    errorElement: <RouteErrorPage />,
  },
  { path: "/register", element: <Navigate to="/registro" replace /> },
  { path: "/recuperar-password", element: <ForgotPasswordPage /> },
  {path: "/restablecer-password", element: <ResetPasswordPage />,},
  {path: "/aceptar-invitacion", element: <AcceptInvitationPage />,},
  { path: "/status/:slug", element: <PublicStatusPage /> },
  { path: "/mi-perfil", element: <Navigate to="/profile" replace /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      {
        path: "monitors/create",
        element: (
          <OwnerRoute>
            <CreateMonitorPage />
          </OwnerRoute>
        ),
      },
      { path: "incidents", element: <IncidentsPage /> },
      { path: "incidents/:id", element: <IncidentDetailPage /> },
      { path: "monitors/:id", element: <MonitorDetailPage /> },
      { path: "monitors", element: <MonitorsPage /> },
      { path: "sections/:sectionId", element: <SectionDetailPage /> },
      { path: "sections", element: <SectionsPage /> },
      {
  path: "users",
  element: (
    <OwnerRoute>
      <UsersPage />
    </OwnerRoute>
  ),
},
      { path: "profile", element: <ProfilePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

import type { ComponentType, ReactElement } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import AppLayout from "./AppLayout";
import AuthRedirect from "./AuthRedirect";
import RouteErrorPage from "./RouteErrorPage";
import NotFoundPage from "./NotFoundPage";
import { OwnerRoute } from "./OwnerRoute";
import {
  AcceptInvitationPage,
  CreateMonitorPage,
  DashboardPage,
  ForgotPasswordPage,
  IncidentDetailPage,
  IncidentsPage,
  LoginPage,
  MonitorDetailPage,
  MonitorsPage,
  ProfilePage,
  PublicStatusPage,
  RegisterPage,
  ResetPasswordPage,
  RouteSuspense,
  SectionDetailPage,
  SectionsPage,
  UsersPage,
} from "./lazyRoutePages";

function lazyRoute(Page: ComponentType): ReactElement {
  return (
    <RouteSuspense>
      <Page />
    </RouteSuspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/restablecer-password",
    element: lazyRoute(ResetPasswordPage),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/login",
    element: (
      <AuthRedirect>
        {lazyRoute(LoginPage)}
      </AuthRedirect>
    ),
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/registro",
    element: (
      <AuthRedirect>
        {lazyRoute(RegisterPage)}
      </AuthRedirect>
    ),
    errorElement: <RouteErrorPage />,
  },
  { path: "/register", element: <Navigate to="/registro" replace /> },
  { path: "/recuperar-password", element: lazyRoute(ForgotPasswordPage) },
  { path: "/aceptar-invitacion", element: lazyRoute(AcceptInvitationPage) },
  { path: "/status/:slug", element: lazyRoute(PublicStatusPage) },
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
      { path: "dashboard", element: lazyRoute(DashboardPage) },
      {
        path: "monitors/create",
        element: (
          <OwnerRoute>
            {lazyRoute(CreateMonitorPage)}
          </OwnerRoute>
        ),
      },
      { path: "incidents", element: lazyRoute(IncidentsPage) },
      { path: "incidents/:id", element: lazyRoute(IncidentDetailPage) },
      { path: "monitors/:id", element: lazyRoute(MonitorDetailPage) },
      { path: "monitors", element: lazyRoute(MonitorsPage) },
      { path: "sections/:sectionId", element: lazyRoute(SectionDetailPage) },
      { path: "sections", element: lazyRoute(SectionsPage) },
      {
        path: "users",
        element: (
          <OwnerRoute>
            {lazyRoute(UsersPage)}
          </OwnerRoute>
        ),
      },
      { path: "profile", element: lazyRoute(ProfilePage) },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

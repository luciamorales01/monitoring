import { lazy, Suspense, type ReactNode } from "react";
import LoadingState from "../shared/LoadingState";

export const AcceptInvitationPage = lazy(
  () => import("../modules/auth/AcceptInvitationPage"),
);
export const CreateMonitorPage = lazy(
  () => import("../modules/monitors/CreateMonitorPage"),
);
export const DashboardPage = lazy(
  () => import("../modules/dashboard/DashboardPage"),
);
export const ForgotPasswordPage = lazy(
  () => import("../modules/auth/ForgotPasswordPage"),
);
export const IncidentDetailPage = lazy(
  () => import("../modules/incidents/IncidentDetailPage"),
);
export const IncidentsPage = lazy(
  () => import("../modules/incidents/IncidentsPage"),
);
export const LoginPage = lazy(() => import("../modules/auth/LoginPage"));
export const MonitorDetailPage = lazy(
  () => import("../modules/monitors/MonitorDetailPage"),
);
export const MonitorsPage = lazy(
  () => import("../modules/monitors/MonitorsPage"),
);
export const ProfilePage = lazy(() => import("../modules/profile/ProfilePage"));
export const PublicStatusPage = lazy(
  () => import("../modules/status/PublicStatusPage"),
);
export const RegisterPage = lazy(() => import("../modules/auth/RegisterPage"));
export const ResetPasswordPage = lazy(
  () => import("../modules/auth/ResetPasswordPage"),
);
export const SectionDetailPage = lazy(
  () => import("../modules/sections/SectionDetailPage"),
);
export const SectionsPage = lazy(
  () => import("../modules/sections/SectionsPage"),
);
export const UsersPage = lazy(() => import("../modules/users/UsersPage"));

export function RouteSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<LoadingState label="Cargando pagina..." variant="page" />}
    >
      {children}
    </Suspense>
  );
}

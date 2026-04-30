import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../modules/auth/LoginPage';
import RegisterPage from '../modules/auth/RegisterPage';
import CreateMonitorPage from '../modules/monitors/CreateMonitorPage';
import IncidentsPage from '../modules/incidents/IncidentsPage';
import IncidentDetailPage from '../modules/incidents/IncidentDetailPage';
import { ProtectedRoute } from './ProtectedRoute';
import DashboardPage from '../modules/dashboard/DashboardPage';
import AppLayout from './AppLayout';
import MonitorDetailPage from '../modules/monitors/MonitorDetailPage.tsx';
import MonitorsPage from '../modules/monitors/MonitorsPage';
import SectionDetailPage from '../modules/sections/SectionDetailPage';
import SectionsPage from '../modules/sections/SectionsPage';
import UsersPage from '../modules/users/UsersPage';
import SettingsPage from '../modules/settings/SettingsPage';
import ReportsPage from '../modules/reports/ReportsPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'monitors/create', element: <CreateMonitorPage /> },
      { path: 'incidents', element: <IncidentsPage /> },
      { path: 'incidents/:id', element: <IncidentDetailPage /> },
      { path: 'monitors/:id', element: <MonitorDetailPage /> },
      { path: 'monitors', element: <MonitorsPage /> },
      { path: 'sections/:sectionId', element: <SectionDetailPage /> },
      { path: 'sections', element: <SectionsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'settings', element: <SettingsPage/> },
    ],
  },
]);

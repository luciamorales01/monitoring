import { tabs } from './profileConstants';
export { getInitials } from '../../shared/userDisplay';
import type { ProfileData, ProfileFormState, ProfileTab } from './profileTypes';

export function pickForm(profile: ProfileData): ProfileFormState {
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    timezone: profile.timezone,
  };
}

export function getRoleLabel(role: string) {
  const roleMap: Record<string, string> = {
    OWNER: "Administrador",
    ADMIN: "Editor",
    VIEWER: "Solo lectura",
  };

  return roleMap[role] ?? role;
}

export function getRoleDescription(role: string) {
  const roleMap: Record<string, string> = {
    OWNER: "Acceso completo a la plataforma",
    ADMIN: "Gestion operativa y de contenidos",
    VIEWER: "Acceso de solo lectura",
  };

  return roleMap[role] ?? "Permisos personalizados del usuario";
}

export function getCurrentTabLabel(tab: ProfileTab) {
  const currentTab = tabs.find((item) => item.key === tab);
  return currentTab?.label ?? "Mi perfil";
}


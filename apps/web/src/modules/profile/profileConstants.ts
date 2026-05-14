import type { ThemePreference } from '../../theme/themePreferences';
import type { ProfileData, ProfileTab } from './profileTypes';

export const tabs: Array<{ key: ProfileTab; label: string }> = [
  { key: "personal", label: "Informacion personal" },
  { key: "security", label: "Seguridad" },
  { key: "notifications", label: "Notificaciones" },
  { key: "appearance", label: "Apariencia" },
];

export const themeOptions: Array<{
  id: ThemePreference;
  title: string;
  text: string;
}> = [
  {
    id: "light",
    title: "Claro",
    text: "Interfaz luminosa para entornos con mucha luz.",
  },
  {
    id: "dark",
    title: "Oscuro",
    text: "Menos brillo y mejor foco en sesiones largas.",
  },
  {
    id: "system",
    title: "Segun el dispositivo",
    text: "Respeta el modo configurado en el sistema.",
  },
];

export const emptyProfile: ProfileData = {
  name: "Usuario",
  role: "Sin rol",
  roleDescription: "Sesion no cargada",
  email: "",
  phone: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Madrid",
  memberSince: "No disponible",
  lastAccess: "Sesion actual",
  location: "No disponible",
};


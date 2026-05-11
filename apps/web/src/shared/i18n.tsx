import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getCurrentUser, updateCurrentUser, type LanguageCode } from './userApi';

type TranslationKey =
  | 'actions.cancel'
  | 'actions.clearFilters'
  | 'actions.clearSelection'
  | 'actions.configure'
  | 'actions.export'
  | 'actions.exportCsv'
  | 'actions.exportPdf'
  | 'actions.exportXlsx'
  | 'actions.refresh'
  | 'actions.runCheck'
  | 'actions.save'
  | 'actions.viewDetail'
  | 'app.statusGlobal'
  | 'billing.title'
  | 'billing.subtitle'
  | 'billing.currentPlan'
  | 'billing.monitorsUsed'
  | 'common.alerts'
  | 'common.dashboard'
  | 'common.monitor'
  | 'common.monitors'
  | 'common.responseTime'
  | 'common.sections'
  | 'common.settings'
  | 'common.status'
  | 'common.type'
  | 'common.uptime'
  | 'dashboard.title'
  | 'dashboard.subtitle'
  | 'dashboard.allMonitors'
  | 'language.en'
  | 'language.es'
  | 'monitors.title'
  | 'monitors.subtitle'
  | 'monitors.empty'
  | 'nav.dashboard'
  | 'nav.incidents'
  | 'nav.monitors'
  | 'nav.profile'
  | 'nav.sections'
  | 'nav.users'
  | 'profile.title'
  | 'profile.language'
  | 'profile.personalInfo'
  | 'reports.customRange'
  | 'reports.last24h'
  | 'reports.last7d'
  | 'reports.last30d'
  | 'sections.detailTitle'
  | 'sections.exportTitle'
  | 'settings.title'
  | 'settings.subtitle';

const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  es: {
    'actions.cancel': 'Cancelar',
    'actions.clearFilters': 'Limpiar filtros',
    'actions.clearSelection': 'Limpiar selección',
    'actions.configure': 'Configurar',
    'actions.export': 'Exportar',
    'actions.exportCsv': 'CSV',
    'actions.exportPdf': 'PDF',
    'actions.exportXlsx': 'XLSX',
    'actions.refresh': 'Actualizar',
    'actions.runCheck': 'Comprobar ahora',
    'actions.save': 'Guardar cambios',
    'actions.viewDetail': 'Ver detalle',
    'app.statusGlobal': 'Estado global',
    'billing.title': 'Billing',
    'billing.subtitle': 'Uso actual del plan y límites disponibles.',
    'billing.currentPlan': 'Plan actual',
    'billing.monitorsUsed': 'Monitores usados',
    'common.alerts': 'Alertas',
    'common.dashboard': 'Dashboard',
    'common.monitor': 'Monitor',
    'common.monitors': 'Monitores',
    'common.responseTime': 'Tiempo de respuesta',
    'common.sections': 'Secciones',
    'common.settings': 'Configuración',
    'common.status': 'Estado',
    'common.type': 'Tipo',
    'common.uptime': 'Uptime',
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Resumen general de todas las webs monitorizadas',
    'dashboard.allMonitors': 'Todas las webs monitorizadas',
    'language.en': 'English',
    'language.es': 'Español',
    'monitors.title': 'Webs monitorizadas',
    'monitors.subtitle': 'Gestiona y consulta el estado de todas las webs que tienes monitorizadas.',
    'monitors.empty': 'No hay monitores que coincidan con los filtros.',
    'nav.dashboard': 'Dashboard',
    'nav.incidents': 'Incidencias',
    'nav.monitors': 'Monitores',
    'nav.profile': 'Perfil',
    'nav.sections': 'Secciones',
    'nav.users': 'Usuarios',
    'profile.title': 'Mi perfil',
    'profile.language': 'Idioma',
    'profile.personalInfo': 'Información personal',
    'reports.customRange': 'Rango personalizado',
    'reports.last24h': 'Últimas 24 horas',
    'reports.last7d': 'Últimos 7 días',
    'reports.last30d': 'Últimos 30 días',
    'sections.detailTitle': 'Detalle de sección',
    'sections.exportTitle': 'Exportar informe de la sección',
    'settings.title': 'Configuración',
    'settings.subtitle': 'Personaliza la aplicación, gestiona preferencias y configura el sistema.',
  },
  en: {
    'actions.cancel': 'Cancel',
    'actions.clearFilters': 'Clear filters',
    'actions.clearSelection': 'Clear selection',
    'actions.configure': 'Configure',
    'actions.export': 'Export',
    'actions.exportCsv': 'CSV',
    'actions.exportPdf': 'PDF',
    'actions.exportXlsx': 'XLSX',
    'actions.refresh': 'Refresh',
    'actions.runCheck': 'Run check',
    'actions.save': 'Save changes',
    'actions.viewDetail': 'View detail',
    'app.statusGlobal': 'Global status',
    'billing.title': 'Billing',
    'billing.subtitle': 'Current plan usage and available limits.',
    'billing.currentPlan': 'Current plan',
    'billing.monitorsUsed': 'Monitors used',
    'common.alerts': 'Alerts',
    'common.dashboard': 'Dashboard',
    'common.monitor': 'Monitor',
    'common.monitors': 'Monitors',
    'common.responseTime': 'Response time',
    'common.sections': 'Sections',
    'common.settings': 'Settings',
    'common.status': 'Status',
    'common.type': 'Type',
    'common.uptime': 'Uptime',
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Overview of all monitored websites',
    'dashboard.allMonitors': 'All monitored websites',
    'language.en': 'English',
    'language.es': 'Español',
    'monitors.title': 'Monitored websites',
    'monitors.subtitle': 'Manage and review the status of every monitored website.',
    'monitors.empty': 'No monitors match the current filters.',
    'nav.dashboard': 'Dashboard',
    'nav.incidents': 'Incidents',
    'nav.monitors': 'Monitors',
    'nav.profile': 'Profile',
    'nav.sections': 'Sections',
    'nav.users': 'Users',
    'profile.title': 'My profile',
    'profile.language': 'Language',
    'profile.personalInfo': 'Personal information',
    'reports.customRange': 'Custom range',
    'reports.last24h': 'Last 24 hours',
    'reports.last7d': 'Last 7 days',
    'reports.last30d': 'Last 30 days',
    'sections.detailTitle': 'Section detail',
    'sections.exportTitle': 'Export section report',
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize the app, manage preferences, and configure the system.',
  },
};

type I18nContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('es');

  useEffect(() => {
    let cancelled = false;

    getCurrentUser()
      .then((user) => {
        if (!cancelled) setLanguageState(user.language ?? 'es');
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
    const updatedUser = await updateCurrentUser({ language: nextLanguage });
    setLanguageState(updatedUser.language ?? nextLanguage);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => translations[language][key] ?? translations.es[key],
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return context;
}

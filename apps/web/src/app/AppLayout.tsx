import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { getActiveIncidents } from "../shared/incidentApi";
import { surfaceCard, uiTheme } from "../theme/commonStyles";
import {
  AlertTriangleIcon,
  BrandMark,
  FolderIcon,
  HomeIcon,
  MonitorIcon,
  ReportIcon,
  SettingsIcon,
  UsersIcon,
} from "../shared/uiIcons";

const navItems = [
  { icon: <HomeIcon size={16} />, label: "Dashboard", to: "/dashboard" },
  {
    icon: <MonitorIcon size={16} />,
    label: "Webs monitorizadas",
    to: "/monitors",
  },
  { icon: <FolderIcon size={16} />, label: "Secciones", to: "/sections" },
  { icon: <ReportIcon size={16} />, label: "Informes" },
  {
    icon: <AlertTriangleIcon size={16} />,
    label: "Incidencias",
    to: "/incidents",
  },
  { icon: <SettingsIcon size={16} />, label: "Configuración", to: "/settings" },
  { icon: <UsersIcon size={16} />, label: "Usuarios", to: "/users" },
];

export default function AppLayout() {
  const location = useLocation();
  const [activeIncidentsCount, setActiveIncidentsCount] = useState(0);

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  useEffect(() => {
    let cancelled = false;

    const refreshActiveIncidents = async () => {
      try {
        const incidents = await getActiveIncidents();
        if (!cancelled) setActiveIncidentsCount(incidents.length);
      } catch {
        if (!cancelled) setActiveIncidentsCount(0);
      }
    };

    refreshActiveIncidents();
    const intervalId = window.setInterval(refreshActiveIncidents, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [location.pathname]);

  const hasActiveIncidents = activeIncidentsCount > 0;

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>
            <BrandMark size={18} />
          </span>
          <span>Monitoring TFG</span>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              to={item.to}
              active={isActive(item.to)}
            />
          ))}
        </nav>

        <div style={styles.globalCard}>
          <p style={styles.globalTitle}>Estado global</p>

          <strong
            style={hasActiveIncidents ? styles.redText : styles.greenText}
          >
            ● {hasActiveIncidents ? "Con incidencias" : "Operativo"}
          </strong>

          <div style={hasActiveIncidents ? styles.bigRed : styles.bigGreen}>
            {hasActiveIncidents ? `${activeIncidentsCount} activa` : "99.9%"}
          </div>

          <p style={styles.globalSubtitle}>
            {hasActiveIncidents ? "Incidencia pendiente" : "Uptime promedio"}
          </p>

          <MiniSparkline warning={hasActiveIncidents} />
        </div>

        <p style={styles.footerText}>© 2026 Monitoring TFG</p>
      </aside>

      <div style={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  to,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  to?: string;
  active?: boolean;
}) {
  const content = (
    <>
      <span>{icon}</span>
      <span>{label}</span>
    </>
  );

  const style: React.CSSProperties = {
    ...styles.navItem,
    ...(active ? styles.navItemActive : {}),
  };

  if (to) {
    return (
      <Link
        to={to}
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        style={{
          ...style,
          textDecoration: "none",
          outline: "0",
          outlineOffset: 0,
          boxShadow: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {content}
      </Link>
    );
  }

  return <div style={style}>{content}</div>;
}

function MiniSparkline({ warning }: { warning: boolean }) {
  return (
    <svg
      width="100%"
      height="34"
      viewBox="0 0 180 34"
      preserveAspectRatio="none"
      style={styles.sparklineSvg}
    >
      <path d="M0 24h180" stroke="rgba(148, 163, 184, 0.18)" />
      <path
        d="M0 22 C18 20, 28 12, 42 14 C56 16, 66 26, 80 20 C94 14, 110 8, 126 12 C140 15, 150 22, 166 18 C172 16, 176 13, 180 12"
        fill="none"
        stroke={warning ? uiTheme.colors.danger : uiTheme.colors.success}
        strokeWidth="2"
      />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100vh",
    display: "flex",
    overflow: "hidden",
    background: uiTheme.colors.background,
    color: uiTheme.colors.text,
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  sidebar: {
    width: 250,
    height: "100vh",
    background: uiTheme.colors.sidebar,
    color: uiTheme.colors.text,
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    flexShrink: 0,
    boxSizing: "border-box",
    borderRight: `1px solid ${uiTheme.colors.border}`,
  },
  content: {
    flex: 1,
    height: "100vh",
    overflowY: "auto",
    background: uiTheme.colors.background,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 22,
    color: uiTheme.colors.text,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: uiTheme.radii.sm,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    border: `1px solid ${uiTheme.colors.border}`,
  },
  nav: { display: "flex", flexDirection: "column", gap: 6 },
  navItem: {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  borderRadius: uiTheme.radii.sm,
  fontWeight: 700,
  color: uiTheme.colors.muted,
  position: "relative",
  fontSize: 14,
  border: "none",
  boxShadow: "none",
  outline: "0",
  outlineOffset: 0,
  cursor: "pointer",
  transition:
    "background 140ms ease, border-color 140ms ease, color 140ms ease",
},
  navItemActive: {
  background: uiTheme.colors.primarySoft,
  boxShadow: `inset 0 0 0 1px ${uiTheme.colors.primary}`,
  color: uiTheme.colors.primary,
},
  globalCard: {
    marginTop: "auto",
    ...surfaceCard,
    background: uiTheme.colors.surface,
    borderRadius: uiTheme.radii.md,
    padding: 18,
  },
  globalTitle: {
    margin: "0 0 12px",
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 700,
  },
  globalSubtitle: {
    margin: "5px 0 14px",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  sparklineSvg: { display: "block", marginTop: 2 },
  footerText: { color: uiTheme.colors.muted, fontSize: 11, marginTop: 20 },
  greenText: { color: uiTheme.colors.success },
  bigGreen: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: 800,
    color: uiTheme.colors.success,
  },
  redText: { color: uiTheme.colors.danger },
  bigRed: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: 800,
    color: uiTheme.colors.danger,
  },
};

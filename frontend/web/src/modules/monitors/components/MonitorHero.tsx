import type { Monitor, MonitorStatus } from "../../../shared/monitorApi";
import { GlobeIcon } from "../../../shared/uiIcons";
import { MonitorActionsMenu } from "./MonitorActionsMenu";
import { StatusBadge } from "./MonitorDetailPrimitives";
import { monitorDetailStyles as styles } from "./monitorDetailStyles";
import type { MonitorActionState, MonitorSummaryStats } from "./monitorDetailTypes";
import { getStatusColor, getStatusSoftBackground } from "./monitorDetailUtils";

export function MonitorHero({
  monitor,
  status,
  stats,
  canWriteActions,
  isActionMenuOpen,
  actionState,
  onToggleActionMenu,
  onRunCheck,
  onToggleActive,
  onOpenEdit,
}: {
  monitor: Monitor;
  status: MonitorStatus;
  stats: MonitorSummaryStats;
  canWriteActions: boolean;
  isActionMenuOpen: boolean;
  actionState: MonitorActionState;
  onToggleActionMenu: () => void;
  onRunCheck: () => void;
  onToggleActive: () => void;
  onOpenEdit: () => void;
}) {
  const isPaused = !monitor.isActive;

  return (
    <section style={styles.heroCard} className="monitor-detail-hero">
      <div style={styles.heroLeft} className="monitor-detail-hero-left">
        <div
          style={{
            ...styles.monitorIcon,
            background: getStatusSoftBackground(status),
            color: getStatusColor(status),
          }}
        >
          <GlobeIcon size={26} />
        </div>

        <div style={styles.heroText}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>{monitor.name}</h1>
            <StatusBadge status={status} />
            {isPaused && <span style={styles.pausedBadge}>Pausado</span>}
          </div>

          <a href={monitor.target} target="_blank" rel="noreferrer" style={styles.url}>
            {monitor.target}
          </a>

          <div style={styles.metaRow}>
            <span>ID: MON-{String(monitor.id).padStart(4, "0")}</span>
            <span>Tipo: {monitor.type}</span>
            <span>Frecuencia: {monitor.frequencySeconds}s</span>
            <span>Timeout: {monitor.timeoutSeconds}s</span>
          </div>
        </div>
      </div>

      <div style={styles.heroRight} className="monitor-detail-hero-right">
        <div style={styles.lastCheckBox} className="monitor-detail-last-check">
          <span>Último check</span>
          <strong>{stats.lastCheckRelative}</strong>
          <small>{stats.lastCheck}</small>
        </div>

        {canWriteActions ? (
          <MonitorActionsMenu
            isOpen={isActionMenuOpen}
            isActive={monitor.isActive}
            checking={actionState.checking}
            toggling={actionState.toggling}
            onToggleMenu={onToggleActionMenu}
            onRunCheck={onRunCheck}
            onToggleActive={onToggleActive}
            onOpenEdit={onOpenEdit}
          />
        ) : null}
      </div>
    </section>
  );
}

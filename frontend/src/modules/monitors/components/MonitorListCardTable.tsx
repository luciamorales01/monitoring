import type { MouseEventHandler, RefObject } from 'react';
import LoadingState from '../../../shared/LoadingState';
import type { Monitor } from '../../../shared/monitorApi';
import { getMonitorViewStatus } from '../../../shared/monitorFilters';
import {
  ActivityIcon,
  EditIcon,
  GlobeIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
} from '../../../shared/uiIcons';
import { styles } from '../MonitorListCard.styles';
import {
  formatRelativeDate,
  formatResponseTime,
  getUptimeLabel,
} from '../MonitorListCard.utils';
import type { ToggleMonitorSelectionOptions } from '../MonitorListCard.types';
import { MiniSparkline, StatusBadge } from './MonitorListCardParts';

type MonitorListCardTableProps = {
  areAllCurrentPageSelected: boolean;
  canWriteActions: boolean;
  checkingId: number | null;
  hoveredMonitorId: number | null;
  onNavigate: (monitorId: number) => void;
  onOpenEdit: (monitor: Monitor) => void;
  onRunCheck: (monitorId: number) => void;
  onSetHoveredMonitorId: (monitorId: number | null) => void;
  onToggleCurrentPageSelection: () => void;
  onToggleMenu: (monitorId: number) => void;
  onToggleMonitorSelection: (
    monitorId: number,
    options?: ToggleMonitorSelectionOptions,
  ) => void;
  onToggleActive: (monitor: Monitor) => void;
  openMenuMonitorId: number | null;
  pageItems: Monitor[];
  selectAllRef: RefObject<HTMLInputElement | null>;
  selectedMonitorIdSet: Set<number>;
  togglingId: number | null;
};

export default function MonitorListCardTable({
  areAllCurrentPageSelected,
  canWriteActions,
  checkingId,
  hoveredMonitorId,
  onNavigate,
  onOpenEdit,
  onRunCheck,
  onSetHoveredMonitorId,
  onToggleActive,
  onToggleCurrentPageSelection,
  onToggleMenu,
  onToggleMonitorSelection,
  openMenuMonitorId,
  pageItems,
  selectAllRef,
  selectedMonitorIdSet,
  togglingId,
}: MonitorListCardTableProps) {
  const handleCheckboxClick =
    (monitorId: number): MouseEventHandler<HTMLInputElement> =>
    (event) => {
      event.stopPropagation();
      event.preventDefault();
      onToggleMonitorSelection(monitorId, {
        additive: event.metaKey || event.ctrlKey,
        range: event.shiftKey,
      });
    };

  return (
    <div style={styles.tableScroll}>
      <table style={styles.table}>
        <colgroup>
          {canWriteActions ? <col style={{ width: 52 }} /> : null}
          <col style={{ width: '30%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '13%' }} />
          {canWriteActions ? <col style={{ width: 80 }} /> : null}
        </colgroup>
        <thead>
          <tr>
            {canWriteActions ? (
              <th style={styles.checkboxHeader}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={areAllCurrentPageSelected}
                  onChange={onToggleCurrentPageSelection}
                  aria-label="Seleccionar webs visibles"
                />
              </th>
            ) : null}
            <th style={styles.th}>Web</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Uptime (24h)</th>
            <th style={styles.th}>Tiempo de respuesta</th>
            <th style={styles.th}>Alertas</th>
            <th style={styles.th}>Última comprobación</th>
            {canWriteActions ? <th style={styles.thActions}>Acciones</th> : null}
          </tr>
        </thead>

        <tbody>
          {pageItems.map((monitor) => {
            const viewStatus = getMonitorViewStatus(monitor);
            const isSelected = selectedMonitorIdSet.has(monitor.id);

            return (
              <tr
                key={monitor.id}
                style={{
                  ...styles.tr,
                  ...(isSelected ? styles.trSelected : {}),
                  ...(hoveredMonitorId === monitor.id ? styles.trHover : {}),
                }}
                onClick={() => onNavigate(monitor.id)}
                onMouseEnter={() => onSetHoveredMonitorId(monitor.id)}
                onMouseLeave={() => onSetHoveredMonitorId(null)}
              >
                {canWriteActions ? (
                  <td
                    style={styles.checkboxCell}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={handleCheckboxClick(monitor.id)}
                      onChange={() => undefined}
                      aria-label={`Seleccionar ${monitor.name}`}
                    />
                  </td>
                ) : null}

                <td style={styles.td}>
                  <div style={styles.webCell}>
                    <span style={styles.webIcon}>
                      <GlobeIcon size={18} />
                    </span>
                    <div>
                      <strong style={styles.monitorName}>{monitor.name}</strong>
                      <div style={styles.url}>{monitor.target}</div>
                    </div>
                  </div>
                </td>

                <td style={styles.td}>
                  <StatusBadge status={viewStatus} />
                </td>

                <td style={styles.td}>
                  <div style={styles.uptimeCell}>
                    <span>{getUptimeLabel(viewStatus)}</span>
                    <MiniSparkline status={viewStatus} />
                  </div>
                </td>

                <td style={styles.td}>
                  {formatResponseTime(monitor.lastResponseTime)}
                </td>

                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.alertBadge,
                      ...(viewStatus === 'DOWN' ? styles.alertBadgeDanger : {}),
                    }}
                  >
                    {viewStatus === 'DOWN' ? 1 : 0}
                  </span>
                </td>

                <td style={styles.td}>
                  {formatRelativeDate(monitor.lastCheckedAt)}
                </td>

                {canWriteActions ? (
                  <td style={styles.tdActions}>
                    <div
                      style={styles.actions}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        style={styles.actionButton}
                        onClick={() => onToggleMenu(monitor.id)}
                        title="Acciones"
                      >
                        <MoreHorizontalIcon size={16} />
                      </button>

                      {openMenuMonitorId === monitor.id ? (
                        <div style={styles.actionMenu}>
                          <button
                            type="button"
                            style={styles.actionMenuItem}
                            onClick={() => onRunCheck(monitor.id)}
                            disabled={checkingId === monitor.id}
                          >
                            {checkingId !== monitor.id ? (
                              <ActivityIcon size={15} />
                            ) : null}
                            {checkingId === monitor.id ? (
                              <LoadingState
                                variant="button"
                                label="Comprobando monitor"
                              />
                            ) : (
                              'Comprobar ahora'
                            )}
                          </button>

                          <button
                            type="button"
                            style={styles.actionMenuItem}
                            onClick={() => onOpenEdit(monitor)}
                          >
                            <EditIcon size={15} />
                            Editar monitor
                          </button>

                          <button
                            type="button"
                            style={styles.actionMenuItem}
                            onClick={() => onNavigate(monitor.id)}
                          >
                            <MonitorIcon size={15} />
                            Ver detalle
                          </button>

                          <button
                            type="button"
                            style={styles.actionMenuItem}
                            onClick={() => onToggleActive(monitor)}
                            disabled={togglingId === monitor.id}
                          >
                            {togglingId !== monitor.id ? (
                              monitor.isActive ? (
                                <PauseIcon size={15} />
                              ) : (
                                <PlayIcon size={15} />
                              )
                            ) : null}
                            {togglingId === monitor.id ? (
                              <LoadingState
                                variant="button"
                                label="Actualizando monitor"
                              />
                            ) : monitor.isActive ? (
                              'Pausar monitor'
                            ) : (
                              'Reanudar monitor'
                            )}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

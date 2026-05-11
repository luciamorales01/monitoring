import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import LoadingState from '../../shared/LoadingState';
import { ActionMenu, type ActionMenuItem } from '../../shared/ui';
import type { Monitor } from '../../shared/monitorApi';
import {
  getMonitorViewStatus,
  type MonitorViewStatus,
} from '../../shared/monitorFilters';
import { GlobeIcon } from '../../shared/uiIcons';
import './MonitorTable.css';

type MonitorTablePagination = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  page: number;
  rangeEnd: number;
  rangeStart: number;
  totalItems: number;
  totalPages: number;
};

type MonitorTableSelection = {
  onClear?: () => void;
  onToggle: (id: number, event: MouseEvent<HTMLInputElement>) => void;
  onToggleCurrentPage: () => void;
  selectedIds: number[];
};

type MonitorTableProps = {
  actionsLabel?: string;
  emptyLabel: string;
  error?: string | null;
  getActions?: (monitor: Monitor) => ActionMenuItem[];
  loading?: boolean;
  monitors: Monitor[];
  onRowClick: (monitor: Monitor) => void;
  pagination: MonitorTablePagination;
  selection?: MonitorTableSelection;
  showActions?: boolean;
  showSchedule?: boolean;
  showType?: boolean;
};

export default function MonitorTable({
  actionsLabel = 'Acciones',
  emptyLabel,
  error,
  getActions,
  loading = false,
  monitors,
  onRowClick,
  pagination,
  selection,
  showActions = true,
  showSchedule = false,
  showType = false,
}: MonitorTableProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const selectedSet = useMemo(
    () => new Set(selection?.selectedIds ?? []),
    [selection?.selectedIds],
  );
  const currentPageIds = useMemo(
    () => monitors.map((monitor) => monitor.id),
    [monitors],
  );
  const allCurrentPageSelected =
    Boolean(selection) &&
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedSet.has(id));
  const someCurrentPageSelected =
    Boolean(selection) &&
    !allCurrentPageSelected &&
    currentPageIds.some((id) => selectedSet.has(id));

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someCurrentPageSelected;
  }, [someCurrentPageSelected]);

  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  if (loading) {
    return <LoadingState variant="table" label="Cargando monitores" rows={7} />;
  }

  if (error) {
    return <p className="monitor-table__empty">{error}</p>;
  }

  if (monitors.length === 0) {
    return <p className="monitor-table__empty">{emptyLabel}</p>;
  }

  return (
    <>
      <div className="monitor-table-wrap">
        <table className="monitor-table">
          <colgroup>
            {selection ? <col style={{ width: 52 }} /> : null}
            <col style={{ width: showType ? '26%' : '30%' }} />
            {showType ? <col style={{ width: '10%' }} /> : null}
            <col style={{ width: '14%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '14%' }} />
            {showSchedule ? <col style={{ width: '12%' }} /> : null}
            {showActions ? <col style={{ width: 88 }} /> : null}
          </colgroup>
          <thead>
            <tr>
              {selection ? (
                <th className="monitor-table__checkbox">
                  <input
                    aria-label="Seleccionar monitores visibles"
                    checked={allCurrentPageSelected}
                    onChange={selection.onToggleCurrentPage}
                    ref={selectAllRef}
                    type="checkbox"
                  />
                </th>
              ) : null}
              <th>Monitor</th>
              {showType ? <th>Tipo</th> : null}
              <th>Estado</th>
              <th>Uptime</th>
              <th>Respuesta</th>
              <th>Alertas</th>
              <th>Última comprobación</th>
              {showSchedule ? <th>Programación</th> : null}
              {showActions ? <th>{actionsLabel}</th> : null}
            </tr>
          </thead>
          <tbody>
            {monitors.map((monitor) => {
              const viewStatus = getMonitorViewStatus(monitor);
              const isSelected = selectedSet.has(monitor.id);
              const actions = getActions?.(monitor) ?? [];

              return (
                <tr
                  className={isSelected ? 'monitor-table__selected' : undefined}
                  key={monitor.id}
                  onClick={() => onRowClick(monitor)}
                >
                  {selection ? (
                    <td
                      className="monitor-table__checkbox"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        aria-label={`Seleccionar ${monitor.name}`}
                        checked={isSelected}
                        onChange={() => undefined}
                        onClick={(event) => {
                          event.stopPropagation();
                          selection.onToggle(monitor.id, event);
                        }}
                        type="checkbox"
                      />
                    </td>
                  ) : null}
                  <td>
                    <div className="monitor-table__monitor">
                      <span className="monitor-table__icon">
                        <GlobeIcon size={18} />
                      </span>
                      <span className="monitor-table__copy">
                        <strong>{monitor.name}</strong>
                        <span>{monitor.target}</span>
                      </span>
                    </div>
                  </td>
                  {showType ? (
                    <td>
                      <span className="monitor-table__type">{monitor.type}</span>
                    </td>
                  ) : null}
                  <td>
                    <StatusBadge status={viewStatus} />
                  </td>
                  <td>
                    <span className="monitor-table__uptime">
                      <span>{formatUptime(viewStatus)}</span>
                      {viewStatus === 'UP' ? <small>+0.02%</small> : null}
                    </span>
                  </td>
                  <td>{formatResponseTime(monitor.lastResponseTime)}</td>
                  <td>
                    <span
                      className={
                        viewStatus === 'DOWN'
                          ? 'monitor-table__alert monitor-table__alert--danger'
                          : 'monitor-table__alert'
                      }
                    >
                      {viewStatus === 'DOWN' ? 1 : 0}
                    </span>
                  </td>
                  <td>{formatRelativeDate(monitor.lastCheckedAt)}</td>
                  {showSchedule ? (
                    <td>
                      {monitor.usesSectionSchedule === false
                        ? 'Personalizada'
                        : 'Sección'}
                    </td>
                  ) : null}
                  {showActions ? (
                    <td onClick={(event) => event.stopPropagation()}>
                      {actions.length > 0 ? (
                        <ActionMenu
                          buttonLabel={`${actionsLabel} ${monitor.name}`}
                          items={actions}
                          onOpenChange={(open) =>
                            setOpenMenuId(open ? monitor.id : null)
                          }
                          open={openMenuId === monitor.id}
                        />
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MonitorTablePagination pagination={pagination} />
    </>
  );
}

function MonitorTablePagination({
  pagination,
}: {
  pagination: MonitorTablePagination;
}) {
  return (
    <div className="monitor-table__pagination">
      <span>
        Mostrando {pagination.rangeStart} a {pagination.rangeEnd} de{' '}
        {pagination.totalItems} monitores
      </span>
      <span className="monitor-table__pages">
        <button
          aria-label="Página anterior"
          className="monitor-table__page"
          disabled={!pagination.hasPreviousPage}
          onClick={() => pagination.onPageChange(pagination.page - 1)}
          type="button"
        >
          ‹
        </button>
        {getVisiblePageNumbers(pagination.page, pagination.totalPages).map(
          (pageNumber) => (
            <button
              className={
                pageNumber === pagination.page
                  ? 'monitor-table__page monitor-table__page--active'
                  : 'monitor-table__page'
              }
              key={pageNumber}
              onClick={() => pagination.onPageChange(pageNumber)}
              type="button"
            >
              {pageNumber}
            </button>
          ),
        )}
        <button
          aria-label="Página siguiente"
          className="monitor-table__page"
          disabled={!pagination.hasNextPage}
          onClick={() => pagination.onPageChange(pagination.page + 1)}
          type="button"
        >
          ›
        </button>
      </span>
      <span className="monitor-table__page-size">10 por página</span>
    </div>
  );
}

function StatusBadge({ status }: { status: MonitorViewStatus }) {
  const label = getStatusLabel(status);
  const className = `monitor-table__badge monitor-table__badge--${status.toLowerCase()}`;

  return (
    <span className={className}>
      <span className="monitor-table__badge-dot" />
      {label}
    </span>
  );
}

function getStatusLabel(status: MonitorViewStatus) {
  if (status === 'UP') return 'Operativo';
  if (status === 'DOWN') return 'Problema';
  if (status === 'PAUSED') return 'Pausado';
  return 'Pendiente';
}

function formatUptime(status: MonitorViewStatus) {
  if (status === 'UP') return '99.98%';
  if (status === 'DOWN') return '96.40%';
  if (status === 'PAUSED') return 'Pausado';
  return 'Pendiente';
}

function formatResponseTime(value?: number | null) {
  return typeof value === 'number' ? `${value} ms` : '—';
}

function formatRelativeDate(value?: string | null) {
  if (!value) return '—';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '—';
  const diffMinutes = Math.round((Date.now() - timestamp) / 60000);
  if (diffMinutes <= 1) return 'Hace 1 min';
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getVisiblePageNumbers(page: number, totalPages: number) {
  const maxVisiblePages = 5;
  const halfWindow = Math.floor(maxVisiblePages / 2);
  const startPage = Math.max(
    1,
    Math.min(page - halfWindow, totalPages - maxVisiblePages + 1),
  );
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  return Array.from(
    { length: endPage - startPage + 1 },
    (_, index) => startPage + index,
  );
}

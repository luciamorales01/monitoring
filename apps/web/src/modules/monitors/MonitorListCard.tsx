import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import {
  controlBase,
  filterGroupBase,
  inputBase,
  pageActiveButtonBase,
  pageArrowBase,
  paginationBase,
  secondaryButtonBase,
  surfaceCard,
  tableCardBase,
  toneStyles,
  uiTheme,
} from "../../theme/commonStyles";
import LoadingState from "../../shared/LoadingState";
import type { Monitor, UpdateMonitorInput } from "../../shared/monitorApi";
import {
  useDeleteMonitorsMutation,
  useRunMonitorCheckMutation,
  useToggleMonitorActiveMutation,
  useUpdateMonitorMutation,
} from "../../shared/monitorQueries";
import {
  filterMonitors,
  getMonitorViewStatus,
  sortMonitors,
  type MonitorSortOption,
  type MonitorStatusFilter,
  type MonitorTypeFilter,
  type MonitorViewStatus,
} from "../../shared/monitorFilters";
import { useLocalPagination } from "../../shared/useLocalPagination";
import { useUrlFilterState } from "../../shared/useUrlFilterState";
import { useDebouncedValue } from "../../shared/useDebouncedValue";
import { useCurrentUserPermissions } from "../../shared/permissions";
import {
  ActivityIcon,
  ChevronRightIcon,
  EditIcon,
  FilterIcon,
  GlobeIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from "../../shared/uiIcons";
import MonitorEditModal from "./MonitorEditModal";
import type { MonitorSection } from "../../shared/sectionsStore";

const monitorFilterDefaults = {
  sort: "status",
  search: "",
  status: "ALL",
  type: "ALL",
};

const monitorAllowedValues = {
  sort: ["status", "name", "latest-check", "created-at"],
  status: ["ALL", "UP", "DOWN", "PAUSED", "UNKNOWN"],
  type: ["ALL", "HTTP", "HTTPS", "SSL", "TCP", "DNS"],
} as const;

const MONITORS_PAGE_SIZE = 10;
const EMPTY_MONITORS: Monitor[] = [];

type FeedbackState = {
  text: string;
  type: "success" | "error";
} | null;

type MonitorListCardProps = {
  monitors: Monitor[];
  loading?: boolean;
  error?: string | null;
  emptyFilteredMessage?: string;
  emptyStateMessage?: string;
  loadingLabel?: string;
  onRefresh?: () => Promise<unknown> | unknown;
  onUseSectionSchedule?: (monitor: Monitor) => Promise<void>;
  sectionSchedule?: Pick<
    MonitorSection,
    "expectedStatusCode" | "frequencySeconds" | "timeoutSeconds" | "isActive"
  > | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function MonitorListCard({
  monitors = EMPTY_MONITORS,
  loading = false,
  error = null,
  emptyFilteredMessage = "No hay webs que coincidan con los filtros.",
  emptyStateMessage = "No hay webs monitorizadas todavía.",
  loadingLabel = "Cargando webs monitorizadas",
  onRefresh,
  onUseSectionSchedule,
  sectionSchedule,
}: MonitorListCardProps) {
  const navigate = useNavigate();
  const { canWrite: canWriteActions } = useCurrentUserPermissions();
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const lastSelectedMonitorIdRef = useRef<number | null>(null);

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [hoveredMonitorId, setHoveredMonitorId] = useState<number | null>(null);
  const [openMenuMonitorId, setOpenMenuMonitorId] = useState<number | null>(null);
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<number[]>([]);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { filters, hasActiveFilters, resetFilters, setFilter } = useUrlFilterState(
    monitorFilterDefaults,
    monitorAllowedValues,
  );
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const runCheckMutation = useRunMonitorCheckMutation();
  const toggleActiveMutation = useToggleMonitorActiveMutation();
  const updateMonitorMutation = useUpdateMonitorMutation();
  const deleteMonitorsMutation = useDeleteMonitorsMutation();

  const handleSetFilter = (
    key: keyof typeof monitorFilterDefaults,
    value: string,
  ) => {
    clearSelection();
    setFilter(key, value);
  };

  const handleResetFilters = () => {
    clearSelection();
    resetFilters();
  };

  useEffect(() => {
    const closeMenu = () => setOpenMenuMonitorId(null);

    window.addEventListener("click", closeMenu);

    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const filteredMonitors = useMemo(
    () =>
      filterMonitors(monitors, {
        search: debouncedSearch,
        status: filters.status as MonitorStatusFilter,
        type: filters.type as MonitorTypeFilter,
      }),
    [debouncedSearch, filters.status, filters.type, monitors],
  );

  const orderedMonitors = useMemo(
    () => sortMonitors(filteredMonitors, filters.sort as MonitorSortOption),
    [filteredMonitors, filters.sort],
  );

  const {
    page,
    setPage,
    pageItems,
    totalPages,
    rangeStart,
    rangeEnd,
    hasPreviousPage,
    hasNextPage,
  } = useLocalPagination(orderedMonitors, {
    pageSize: MONITORS_PAGE_SIZE,
    resetKey: `${debouncedSearch}|${filters.sort}|${filters.status}|${filters.type}|${orderedMonitors.length}`,
  });

  const currentPageIds = useMemo(
    () => pageItems.map((monitor) => monitor.id),
    [pageItems],
  );

  const visibleMonitorIds = useMemo(
    () => pageItems.map((monitor) => monitor.id),
    [pageItems],
  );

  const selectedMonitors = useMemo(
    () => monitors.filter((monitor) => selectedMonitorIds.includes(monitor.id)),
    [monitors, selectedMonitorIds],
  );

  const areAllCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedMonitorIds.includes(id));

  const hasSomeCurrentPageSelected =
    !areAllCurrentPageSelected &&
    currentPageIds.some((id) => selectedMonitorIds.includes(id));

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = hasSomeCurrentPageSelected;
  }, [hasSomeCurrentPageSelected]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!canWriteActions) return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isTypingTarget =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        if (visibleMonitorIds.length === 0) return;

        event.preventDefault();
        setSelectedMonitorIds((current) =>
          Array.from(new Set([...current, ...visibleMonitorIds])),
        );
        lastSelectedMonitorIdRef.current = visibleMonitorIds.at(-1) ?? null;
        return;
      }

      if (event.key === "Escape" && selectedMonitorIds.length > 0) {
        event.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canWriteActions, selectedMonitorIds.length, visibleMonitorIds]);

  const setSuccess = (text: string) => {
    setFeedback({ type: "success", text });
  };

  const setFailure = (text: string) => {
    setFeedback({ type: "error", text });
  };

  const refreshData = async () => {
    await onRefresh?.();
  };

  const toggleMonitorSelection = (
    id: number,
    options?: {
      additive?: boolean;
      range?: boolean;
    },
  ) => {
    if (!canWriteActions) return;

    setSelectedMonitorIds((current) => {
      if (
        options?.range &&
        lastSelectedMonitorIdRef.current !== null &&
        visibleMonitorIds.includes(lastSelectedMonitorIdRef.current)
      ) {
        const startIndex = visibleMonitorIds.indexOf(lastSelectedMonitorIdRef.current);
        const endIndex = visibleMonitorIds.indexOf(id);

        if (startIndex >= 0 && endIndex >= 0) {
          const [from, to] =
            startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

          const rangeIds = visibleMonitorIds.slice(from, to + 1);
          const nextSelection = options.additive ? [...current] : [...current];

          return Array.from(new Set([...nextSelection, ...rangeIds]));
        }
      }

      return current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
    });

    lastSelectedMonitorIdRef.current = id;
  };

  const toggleCurrentPageSelection = () => {
    if (!canWriteActions) return;

    setSelectedMonitorIds((current) => {
      if (areAllCurrentPageSelected) {
        return current.filter((id) => !currentPageIds.includes(id));
      }

      return Array.from(new Set([...current, ...currentPageIds]));
    });
  };

  function clearSelection() {
    setSelectedMonitorIds([]);
    lastSelectedMonitorIdRef.current = null;
  }

  const handleSetPage = (nextPage: number) => {
    clearSelection();
    setPage(nextPage);
  };

  const handleRunCheck = async (id: number) => {
    try {
      setCheckingId(id);
      setFeedback(null);
      await runCheckMutation.mutateAsync(id);
      await refreshData();
      setSuccess("Comprobación ejecutada correctamente.");
    } catch (currentError) {
      console.error(`Error running monitor check for ${id}`, currentError);
      setFailure("No se pudo ejecutar la comprobación.");
    } finally {
      setCheckingId(null);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      setTogglingId(id);
      setFeedback(null);
      await toggleActiveMutation.mutateAsync(id);
      await refreshData();
      setSuccess("Estado del monitor actualizado.");
    } catch (currentError) {
      console.error(`Error toggling monitor ${id}`, currentError);
      setFailure("No se pudo actualizar el estado del monitor.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenEdit = (monitor: Monitor) => {
    setOpenMenuMonitorId(null);
    setEditingMonitor(monitor);
    setEditError(null);
  };

  const handleCloseEdit = () => {
    if (isSavingEdit) return;

    setEditingMonitor(null);
    setEditError(null);
  };

  const handleSaveEdit = async (data: UpdateMonitorInput) => {
    if (!editingMonitor) return;

    try {
      setIsSavingEdit(true);
      setEditError(null);
      setFeedback(null);
      await updateMonitorMutation.mutateAsync({ id: editingMonitor.id, data });
      await refreshData();
      setEditingMonitor(null);
      setSuccess("Monitor actualizado correctamente.");
    } catch (currentError: unknown) {
      setEditError(getErrorMessage(currentError, "No se pudo guardar el monitor."));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleUseSectionSchedule = async () => {
    if (!editingMonitor || !onUseSectionSchedule) return;

    try {
      setIsSavingEdit(true);
      setEditError(null);
      setFeedback(null);
      await onUseSectionSchedule(editingMonitor);
      await refreshData();
      setEditingMonitor(null);
      setSuccess("Monitor sincronizado con la configuración de la sección.");
    } catch (currentError: unknown) {
      setEditError(
        getErrorMessage(
          currentError,
          "No se pudo aplicar la configuración de la sección.",
        ),
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenDelete = () => {
    if (selectedMonitorIds.length === 0) return;

    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDelete = () => {
    if (isDeleting) return;

    setDeleteError(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteSelected = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      setFeedback(null);
      await deleteMonitorsMutation.mutateAsync(selectedMonitorIds);
      const deletedCount = selectedMonitorIds.length;
      setSelectedMonitorIds([]);
      setIsDeleteModalOpen(false);
      await refreshData();
      setSuccess(
        deletedCount === 1
          ? "Monitor eliminado correctamente."
          : `${deletedCount} monitores eliminados correctamente.`,
      );
    } catch (currentError: unknown) {
      setDeleteError(
        getErrorMessage(currentError, "No se pudieron eliminar los monitores."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const hasMonitors = monitors.length > 0;
  const hasFilteredResults = orderedMonitors.length > 0;

  return (
    <>
      <section style={styles.card}>
        <div style={styles.filters}>
          <input
            style={styles.search}
            placeholder="Buscar por nombre o URL..."
            value={filters.search}
            onChange={(event) => handleSetFilter("search", event.target.value)}
          />

          <label style={styles.filterGroup}>
            <span>Estado</span>
            <select
              style={styles.select}
              value={filters.status}
              onChange={(event) => handleSetFilter("status", event.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="UP">Operativas</option>
              <option value="DOWN">Con problemas</option>
              <option value="PAUSED">Pausadas</option>
              <option value="UNKNOWN">Pendientes</option>
            </select>
          </label>

          <label style={styles.filterGroup}>
            <span>Tipo</span>
            <select
              style={styles.select}
              value={filters.type}
              onChange={(event) => handleSetFilter("type", event.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="HTTP">HTTP</option>
              <option value="HTTPS">HTTPS</option>
              <option value="SSL">SSL</option>
              <option value="TCP">TCP</option>
              <option value="DNS">DNS</option>
            </select>
          </label>

          <label style={styles.filterGroup}>
            <span>Orden</span>
            <select
              style={styles.select}
              value={filters.sort}
              onChange={(event) => handleSetFilter("sort", event.target.value)}
            >
              <option value="status">Estado</option>
              <option value="name">Nombre</option>
              <option value="latest-check">Última comprobación</option>
              <option value="created-at">Creación</option>
            </select>
          </label>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleResetFilters}
            disabled={!hasActiveFilters}
          >
            <FilterIcon size={14} />
            Limpiar filtros
          </button>
        </div>

        {canWriteActions && selectedMonitorIds.length > 0 && (
          <div style={styles.bulkToolbar}>
            <div>
              <strong style={styles.bulkTitle}>
                {selectedMonitorIds.length}{" "}
                {selectedMonitorIds.length === 1
                  ? "web seleccionada"
                  : "webs seleccionadas"}
              </strong>
              <p style={styles.bulkCopy}>
                Atajos: `Ctrl/Cmd + A` selecciona esta página. `Esc` limpia. `Shift
                + click` amplía rango.
              </p>
            </div>

            <div style={styles.bulkActions}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={clearSelection}
              >
                Limpiar selección
              </button>

              <button
                type="button"
                style={styles.dangerButton}
                onClick={handleOpenDelete}
                disabled={isDeleting}
              >
                <TrashIcon size={15} />
                {selectedMonitorIds.length === 1
                  ? "Eliminar seleccionada"
                  : "Eliminar seleccionadas"}
              </button>
            </div>
          </div>
        )}

        {feedback && (
          <div
            style={
              feedback.type === "success" ? styles.feedbackSuccess : styles.feedbackError
            }
          >
            {feedback.text}
          </div>
        )}

        {loading ? (
          <LoadingState variant="table" label={loadingLabel} rows={7} />
        ) : error ? (
          <p style={styles.empty}>{error}</p>
        ) : !hasMonitors ? (
          <p style={styles.empty}>{emptyStateMessage}</p>
        ) : !hasFilteredResults ? (
          <p style={styles.empty}>{emptyFilteredMessage}</p>
        ) : (
          <div style={styles.tableScroll}>
            <table style={styles.table}>
            <colgroup>
              {canWriteActions ? <col style={{ width: 52 }} /> : null}
              <col style={{ width: "30%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "13%" }} />
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
                      onChange={toggleCurrentPageSelection}
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
                const isSelected = selectedMonitorIds.includes(monitor.id);

                return (
                  <tr
                    key={monitor.id}
                    style={{
                      ...styles.tr,
                      ...(isSelected ? styles.trSelected : {}),
                      ...(hoveredMonitorId === monitor.id ? styles.trHover : {}),
                    }}
                    onClick={() => navigate(`/monitors/${monitor.id}`)}
                    onMouseEnter={() => setHoveredMonitorId(monitor.id)}
                    onMouseLeave={() => setHoveredMonitorId(null)}
                  >
                    {canWriteActions ? (
                      <td
                        style={styles.checkboxCell}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            toggleMonitorSelection(monitor.id, {
                              additive: event.metaKey || event.ctrlKey,
                              range: event.shiftKey,
                            });
                          }}
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
                          ...(viewStatus === "DOWN" ? styles.alertBadgeDanger : {}),
                        }}
                      >
                        {viewStatus === "DOWN" ? 1 : 0}
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
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenMenuMonitorId((current) =>
                                current === monitor.id ? null : monitor.id,
                              );
                            }}
                            title="Acciones"
                          >
                            <MoreHorizontalIcon size={16} />
                          </button>

                          {openMenuMonitorId === monitor.id && (
                            <div style={styles.actionMenu}>
                              <button
                                type="button"
                                style={styles.actionMenuItem}
                                onClick={() => {
                                  setOpenMenuMonitorId(null);
                                  void handleRunCheck(monitor.id);
                                }}
                                disabled={checkingId === monitor.id}
                              >
                                {checkingId !== monitor.id && <ActivityIcon size={15} />}
                                {checkingId === monitor.id ? (
                                  <LoadingState
                                    variant="button"
                                    label="Comprobando monitor"
                                  />
                                ) : (
                                  "Comprobar ahora"
                                )}
                              </button>

                              <button
                                type="button"
                                style={styles.actionMenuItem}
                                onClick={() => handleOpenEdit(monitor)}
                              >
                                <EditIcon size={15} />
                                Editar monitor
                              </button>

                              <button
                                type="button"
                                style={styles.actionMenuItem}
                                onClick={() => {
                                  setOpenMenuMonitorId(null);
                                  navigate(`/monitors/${monitor.id}`);
                                }}
                              >
                                <MonitorIcon size={15} />
                                Ver detalle
                              </button>

                              <button
                                type="button"
                                style={styles.actionMenuItem}
                                onClick={() => {
                                  setOpenMenuMonitorId(null);
                                  void handleToggleActive(monitor.id);
                                }}
                                disabled={togglingId === monitor.id}
                              >
                                {togglingId !== monitor.id &&
                                  (monitor.isActive ? (
                                    <PauseIcon size={15} />
                                  ) : (
                                    <PlayIcon size={15} />
                                  ))}
                                {togglingId === monitor.id ? (
                                  <LoadingState
                                    variant="button"
                                    label="Actualizando monitor"
                                  />
                                ) : monitor.isActive ? (
                                  "Pausar monitor"
                                ) : (
                                  "Reanudar monitor"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}

        <div style={styles.pagination}>
          <span style={styles.paginationText}>
            Mostrando {rangeStart} a {rangeEnd} de {orderedMonitors.length} webs
          </span>

          <div style={styles.pages}>
            <button
              type="button"
              style={styles.pageArrow}
              aria-label="Página anterior"
              onClick={() => handleSetPage(page - 1)}
              disabled={!hasPreviousPage}
            >
              <span style={styles.pageArrowLeft}>
                <ChevronRightIcon size={14} />
              </span>
            </button>

            {getVisiblePageNumbers(page, totalPages).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                style={
                  pageNumber === page ? styles.pageActiveButton : styles.pageNumberButton
                }
                onClick={() => handleSetPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              style={styles.pageArrow}
              aria-label="Página siguiente"
              onClick={() => handleSetPage(page + 1)}
              disabled={!hasNextPage}
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>

          <div style={styles.pageSizeWrap}>
            <span style={styles.pageSizeText}>10 por página</span>
          </div>
        </div>
      </section>

      <MonitorEditModal
        isOpen={canWriteActions && Boolean(editingMonitor)}
        monitor={editingMonitor}
        isSubmitting={isSavingEdit}
        error={editError}
        onClose={handleCloseEdit}
        onSubmit={handleSaveEdit}
        onUseSectionSchedule={
          onUseSectionSchedule ? handleUseSectionSchedule : undefined
        }
        sectionSchedule={sectionSchedule}
      />

      <DeleteSelectedModal
        error={deleteError}
        isDeleting={isDeleting}
        isOpen={canWriteActions && isDeleteModalOpen}
        monitors={selectedMonitors}
        onCancel={handleCloseDelete}
        onConfirm={() => void handleDeleteSelected()}
      />
    </>
  );
}

function DeleteSelectedModal({
  error,
  isDeleting,
  isOpen,
  monitors,
  onCancel,
  onConfirm,
}: {
  error: string | null;
  isDeleting: boolean;
  isOpen: boolean;
  monitors: Monitor[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={!isDeleting ? onCancel : undefined}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-monitors-title"
        style={styles.confirmModal}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.confirmIconWrap}>
          <TrashIcon size={20} />
        </div>

        <h2 id="delete-monitors-title" style={styles.confirmTitle}>
          Confirmar eliminación
        </h2>

        <p style={styles.confirmCopy}>
          {monitors.length === 1
            ? "Esta web se eliminará de forma permanente junto con su historial."
            : "Las webs seleccionadas se eliminarán de forma permanente junto con su historial."}
        </p>

        <div style={styles.confirmList}>
          {monitors.slice(0, 4).map((monitor) => (
            <div key={monitor.id} style={styles.confirmListItem}>
              <strong>{monitor.name}</strong>
              <span style={styles.confirmListUrl}>{monitor.target}</span>
            </div>
          ))}

          {monitors.length > 4 && (
            <div style={styles.confirmListMore}>
              +{monitors.length - 4} webs adicionales
            </div>
          )}
        </div>

        {error && <div style={styles.feedbackError}>{error}</div>}

        <div style={styles.confirmActions}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancelar
          </button>

          <button
            type="button"
            style={styles.dangerButton}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <LoadingState variant="button" label="Eliminando monitores" />
            ) : (
              "Eliminar seleccionadas"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MonitorViewStatus }) {
  const isUp = status === "UP";
  const isDown = status === "DOWN";
  const isPaused = status === "PAUSED";

  return (
    <span
      style={{
        ...styles.badge,
        background: isUp
          ? toneStyles.green.background
          : isDown
            ? toneStyles.red.background
            : isPaused
              ? uiTheme.colors.primarySoft
              : toneStyles.slate.background,
        color: isUp
          ? toneStyles.green.color
          : isDown
            ? toneStyles.red.color
            : isPaused
              ? uiTheme.colors.primary
              : toneStyles.slate.color,
      }}
    >
      <span style={styles.badgeDot} />
      {isUp
        ? "Operativo"
        : isDown
          ? "Problema"
          : isPaused
            ? "Pausada"
            : "Pendiente"}
    </span>
  );
}

function MiniSparkline({ status }: { status: MonitorViewStatus }) {
  const color =
    status === "DOWN"
      ? uiTheme.colors.danger
      : status === "PAUSED"
        ? uiTheme.colors.slate
        : uiTheme.colors.success;

  return (
    <svg width="74" height="24" viewBox="0 0 74 24">
      <path
        d="M0 15 L8 12 L14 14 L20 6 L27 19 L34 10 L42 12 L50 8 L58 14 L66 11 L74 15"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
      />
    </svg>
  );
}

function getUptimeLabel(status: MonitorViewStatus) {
  if (status === "PAUSED") return "Pausada";
  if (status === "UNKNOWN") return "—";
  return "Último estado";
}

function formatResponseTime(value?: number | null) {
  return typeof value === "number" ? `${value} ms` : "—";
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "—";

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) return "—";

  const diffMinutes = Math.round((Date.now() - timestamp) / 60000);

  if (diffMinutes <= 1) return "Hace 1 min";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) return `Hace ${diffHours} h`;

  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
}

const styles: Record<string, CSSProperties> = {
  card: {
    ...tableCardBase,
    display: "grid",
    gap: 22,
    width: "100%",
    padding: 28,
    overflow: "hidden",
    borderRadius: uiTheme.radii.md,
  },
  filters: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "flex-end",
  },
  search: {
    ...inputBase,
    minWidth: 240,
    flex: "1 1 260px",
  },
  filterGroup: {
    ...filterGroupBase,
    minWidth: 148,
  },
  select: {
    ...inputBase,
    minWidth: 148,
  },
  secondaryButton: {
    ...secondaryButtonBase,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 42,
    padding: "0 16px",
    cursor: "pointer",
  },
  bulkToolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    borderRadius: uiTheme.radii.md,
    border: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surfaceSoft,
    padding: "14px 16px",
  },
  bulkTitle: {
    display: "block",
    marginBottom: 4,
    color: uiTheme.colors.text,
  },
  bulkCopy: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  bulkActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  dangerButton: {
    ...secondaryButtonBase,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 42,
    padding: "0 16px",
    cursor: "pointer",
    borderColor: uiTheme.colors.danger,
    color: uiTheme.colors.danger,
    background: uiTheme.colors.dangerSoft,
  },
  feedbackSuccess: {
    borderRadius: uiTheme.radii.md,
    border: `1px solid ${uiTheme.colors.success}`,
    background: toneStyles.green.background,
    color: toneStyles.green.color,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 500,
  },
  feedbackError: {
    borderRadius: uiTheme.radii.md,
    border: `1px solid ${uiTheme.colors.danger}`,
    background: toneStyles.red.background,
    color: toneStyles.red.color,
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 500,
  },
  empty: {
    margin: 0,
    padding: "20px 0",
    color: uiTheme.colors.muted,
    textAlign: "center",
  },
  tableScroll: {
    width: "100%",
    overflowX: "auto",
    overflowY: "visible",
    paddingBottom: 2,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 980,
  },
  th: {
    padding: "0 20px 16px",
    textAlign: "left",
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 600,
  },
  thActions: {
    padding: "0 12px 16px 20px",
    textAlign: "right",
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 600,
  },
  checkboxHeader: {
    width: 52,
    padding: "0 16px 16px 0",
    textAlign: "center",
  },
  tr: {
    borderTop: `1px solid ${uiTheme.colors.border}`,
    transition: "background 160ms ease, box-shadow 160ms ease",
    cursor: "pointer",
  },
  trHover: {
    background: uiTheme.colors.surfaceSoft,
  },
  trSelected: {
    background: `${uiTheme.colors.primarySoft}`,
  },
  td: {
    padding: "18px 20px",
    color: uiTheme.colors.text,
    verticalAlign: "middle",
  },
  tdActions: {
    padding: "18px 12px 18px 20px",
    verticalAlign: "middle",
    textAlign: "right",
  },
  checkboxCell: {
    padding: "18px 16px 18px 0",
    textAlign: "center",
    verticalAlign: "middle",
  },
  webCell: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  webIcon: {
    ...controlBase,
    width: 36,
    height: 36,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    flexShrink: 0,
  },
  monitorName: {
    display: "block",
    marginBottom: 4,
  },
  url: {
    color: uiTheme.colors.muted,
    fontSize: 13,
    wordBreak: "break-word",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "currentColor",
  },
  uptimeCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  alertBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    background: toneStyles.slate.background,
    color: toneStyles.slate.color,
    fontSize: 12,
    fontWeight: 700,
  },
  alertBadgeDanger: {
    background: toneStyles.red.background,
    color: toneStyles.red.color,
  },
  actions: {
    position: "relative",
    display: "inline-flex",
    justifyContent: "flex-end",
  },
  actionButton: {
    ...controlBase,
    width: 34,
    height: 34,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  actionMenu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    zIndex: 5,
    minWidth: 220,
    display: "grid",
    gap: 4,
    padding: 8,
    borderRadius: uiTheme.radii.md,
    border: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surface,
    boxShadow: "0 18px 38px rgba(15, 23, 42, 0.12)",
  },
  actionMenuItem: {
    ...secondaryButtonBase,
    width: "100%",
    justifyContent: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    minHeight: 40,
    padding: "0 12px",
    cursor: "pointer",
    background: "transparent",
    borderColor: "transparent",
  },
  pagination: {
    ...paginationBase,
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "center",
  },
  paginationText: {
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  pages: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  pageArrow: {
    ...pageArrowBase,
  },
  pageArrowLeft: {
    display: "inline-flex",
    transform: "rotate(180deg)",
  },
  pageNumberButton: {
    ...controlBase,
    minWidth: 36,
    height: 36,
    cursor: "pointer",
  },
  pageActiveButton: {
    ...pageActiveButtonBase,
    minWidth: 36,
    height: 36,
    cursor: "pointer",
  },
  pageSizeWrap: {
    display: "flex",
    justifyContent: "flex-end",
    minWidth: 120,
  },
  pageSizeText: {
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 30,
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "rgba(15, 23, 42, 0.45)",
  },
  confirmModal: {
    ...surfaceCard,
    width: "min(520px, 100%)",
    display: "grid",
    gap: 18,
    padding: 24,
  },
  confirmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
  },
  confirmTitle: {
    margin: 0,
    fontSize: 22,
  },
  confirmCopy: {
    margin: 0,
    color: uiTheme.colors.muted,
    lineHeight: 1.5,
  },
  confirmList: {
    display: "grid",
    gap: 10,
  },
  confirmListItem: {
    display: "grid",
    gap: 2,
    borderRadius: uiTheme.radii.sm,
    background: uiTheme.colors.surfaceSoft,
    padding: "12px 14px",
  },
  confirmListUrl: {
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  confirmListMore: {
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },
};

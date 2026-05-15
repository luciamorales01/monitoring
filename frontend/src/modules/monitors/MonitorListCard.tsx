import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { DeleteSelectedModal, MiniSparkline, StatusBadge } from "./components/MonitorListCardParts";
import {
  EMPTY_MONITORS,
  MONITORS_PAGE_SIZE,
  monitorAllowedValues,
  monitorFilterDefaults,
} from "./MonitorListCard.constants";
import { styles } from "./MonitorListCard.styles";
import type { FeedbackState, MonitorListCardProps } from "./MonitorListCard.types";
import {
  formatRelativeDate,
  formatResponseTime,
  getErrorMessage,
  getUptimeLabel,
  getVisiblePageNumbers,
} from "./MonitorListCard.utils";

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

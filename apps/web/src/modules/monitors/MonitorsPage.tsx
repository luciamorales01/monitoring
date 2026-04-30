import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  controlBase,
  filterGroupBase,
  inputBase,
  kpiCardBase,
  pageActiveButtonBase,
  pageArrowBase,
  pageMain,
  paginationBase,
  primaryButtonBase,
  secondaryButtonBase,
  selectFakeBase,
  surfaceCard,
  tableCardBase,
  toneStyles,
  uiTheme,
} from "../../theme/commonStyles";
import AppTopbar from "../../shared/AppTopbar";
import LoadingState from "../../shared/LoadingState";
import {
  deleteMonitor,
  getMonitors,
  runMonitorCheck,
  toggleMonitorActive,
  updateMonitor,
  type Monitor,
  type UpdateMonitorInput,
} from "../../shared/monitorApi";
import {
  filterMonitors,
  getMonitorLocationOptions,
  getMonitorViewStatus,
  sortMonitors,
  type MonitorStatusFilter,
  type MonitorTypeFilter,
  type MonitorViewStatus,
} from "../../shared/monitorFilters";
import { useUrlFilterState } from "../../shared/useUrlFilterState";
import { useLocalPagination } from "../../shared/useLocalPagination";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  EditIcon,
  FilterIcon,
  GlobeIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
} from "../../shared/uiIcons";
import MonitorEditModal from "./MonitorEditModal";

const monitorFilterDefaults = {
  location: "ALL",
  search: "",
  status: "ALL",
  type: "ALL",
};

const monitorAllowedValues = {
  status: ["ALL", "UP", "DOWN", "PAUSED", "UNKNOWN"],
  type: ["ALL", "HTTP", "HTTPS"],
} as const;

type FeedbackState = {
  text: string;
  type: "success" | "error";
} | null;

export default function MonitorsPage() {
  const navigate = useNavigate();
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const lastSelectedMonitorIdRef = useRef<number | null>(null);

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const { filters, hasActiveFilters, resetFilters, setFilter } =
    useUrlFilterState(monitorFilterDefaults, monitorAllowedValues);

  const loadMonitors = async ({
    initial = false,
  }: { initial?: boolean } = {}) => {
    if (initial) {
      setLoading(true);
    }

    try {
      setError(null);
      const data = await getMonitors();
      setMonitors(data);
      setSelectedMonitorIds((current) =>
        current.filter((id) => data.some((monitor) => monitor.id === id)),
      );
    } catch (currentError) {
      console.error("Error loading monitors", currentError);
      setError("No se pudieron cargar las webs monitorizadas.");
      setMonitors([]);
      setSelectedMonitorIds([]);
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadMonitors({ initial: true });
  }, []);

  useEffect(() => {
    const closeMenu = () => setOpenMenuMonitorId(null);

    window.addEventListener("click", closeMenu);

    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const stats = useMemo(() => {
    const total = monitors.length;
    const online = monitors.filter(
      (monitor) => getMonitorViewStatus(monitor) === "UP",
    ).length;
    const down = monitors.filter(
      (monitor) => getMonitorViewStatus(monitor) === "DOWN",
    ).length;
    const paused = monitors.filter(
      (monitor) => getMonitorViewStatus(monitor) === "PAUSED",
    ).length;
    const responseTimes = monitors
      .map((monitor) => monitor.lastResponseTime)
      .filter((value): value is number => typeof value === "number");
    const averageResponseTime =
      responseTimes.length > 0
        ? `${Math.round(
            responseTimes.reduce((sum, value) => sum + value, 0) /
              responseTimes.length,
          )} ms`
        : "—";

    return {
      total,
      online,
      down,
      paused,
      response: averageResponseTime,
    };
  }, [monitors]);

  const locationOptions = useMemo(
    () => getMonitorLocationOptions(monitors),
    [monitors],
  );

  const filteredMonitors = useMemo(() => {
    return sortMonitors(
      filterMonitors(monitors, {
        location: filters.location,
        search: filters.search,
        status: filters.status as MonitorStatusFilter,
        type: filters.type as MonitorTypeFilter,
      }),
    );
  }, [
    filters.location,
    filters.search,
    filters.status,
    filters.type,
    monitors,
  ]);

  const {
    page,
    setPage,
    pageItems,
    totalPages,
    rangeStart,
    rangeEnd,
    hasPreviousPage,
    hasNextPage,
  } = useLocalPagination(filteredMonitors, {
    pageSize: 10,
    resetKey: `${filters.search}|${filters.status}|${filters.type}|${filters.location}|${filteredMonitors.length}`,
  });

  const currentPageIds = useMemo(
    () => pageItems.map((monitor) => monitor.id),
    [pageItems],
  );

  const filteredMonitorIds = useMemo(
    () => filteredMonitors.map((monitor) => monitor.id),
    [filteredMonitors],
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
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName ?? "";
      const isTypingTarget =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        if (filteredMonitorIds.length === 0) return;

        event.preventDefault();
        setSelectedMonitorIds((current) =>
          Array.from(new Set([...current, ...filteredMonitorIds])),
        );
        lastSelectedMonitorIdRef.current = filteredMonitorIds.at(-1) ?? null;
        return;
      }

      if (event.key === "Escape" && selectedMonitorIds.length > 0) {
        event.preventDefault();
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredMonitorIds, selectedMonitorIds.length]);

  const setSuccess = (text: string) => {
    setFeedback({ type: "success", text });
  };

  const setFailure = (text: string) => {
    setFeedback({ type: "error", text });
  };

  const toggleMonitorSelection = (
    id: number,
    options?: {
      additive?: boolean;
      range?: boolean;
    },
  ) => {
    setSelectedMonitorIds((current) => {
      if (
        options?.range &&
        lastSelectedMonitorIdRef.current !== null &&
        filteredMonitorIds.includes(lastSelectedMonitorIdRef.current)
      ) {
        const startIndex = filteredMonitorIds.indexOf(
          lastSelectedMonitorIdRef.current,
        );
        const endIndex = filteredMonitorIds.indexOf(id);

        if (startIndex >= 0 && endIndex >= 0) {
          const [from, to] =
            startIndex < endIndex
              ? [startIndex, endIndex]
              : [endIndex, startIndex];

          const rangeIds = filteredMonitorIds.slice(from, to + 1);
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
    setSelectedMonitorIds((current) => {
      if (areAllCurrentPageSelected) {
        return current.filter((id) => !currentPageIds.includes(id));
      }

      return Array.from(new Set([...current, ...currentPageIds]));
    });
  };

  const clearSelection = () => {
    setSelectedMonitorIds([]);
    lastSelectedMonitorIdRef.current = null;
  };

  const handleRunCheck = async (id: number) => {
    try {
      setCheckingId(id);
      setFeedback(null);
      await runMonitorCheck(id);
      await loadMonitors();
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
      await toggleMonitorActive(id);
      await loadMonitors();
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
      await updateMonitor(editingMonitor.id, data);
      await loadMonitors();
      setEditingMonitor(null);
      setSuccess("Monitor actualizado correctamente.");
    } catch (currentError: any) {
      setEditError(currentError.message ?? "No se pudo guardar el monitor.");
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
      await Promise.all(selectedMonitorIds.map((id) => deleteMonitor(id)));
      const deletedCount = selectedMonitorIds.length;
      setSelectedMonitorIds([]);
      setIsDeleteModalOpen(false);
      await loadMonitors();
      setSuccess(
        deletedCount === 1
          ? "Monitor eliminado correctamente."
          : `${deletedCount} monitores eliminados correctamente.`,
      );
    } catch (currentError: any) {
      setDeleteError(
        currentError.message ?? "No se pudieron eliminar los monitores.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <main style={styles.main}>
        <AppTopbar
          title="Webs monitorizadas"
          subtitle="Gestiona y consulta el estado de todas las webs que tienes monitorizadas."
          onRefresh={loadMonitors}
          cta={{
            icon: <PlusIcon size={16} />,
            label: "Nuevo monitor",
            to: "/monitors/create",
          }}
        />

        <section style={styles.kpiGrid}>
          <KpiCard
            icon={<MonitorIcon size={18} />}
            title="Total webs"
            value={stats.total}
            note="Total actual"
            tone="blue"
          />
          <KpiCard
            icon={<CheckCircleIcon size={18} />}
            title="Webs online"
            value={stats.online}
            note={formatRatio(stats.online, stats.total)}
            tone="green"
          />
          <KpiCard
            icon={<AlertTriangleIcon size={18} />}
            title="Con problemas"
            value={stats.down}
            note={formatRatio(stats.down, stats.total)}
            tone="orange"
          />
          <KpiCard
            icon={<SettingsIcon size={18} />}
            title="Webs pausadas"
            value={stats.paused}
            note={formatRatio(stats.paused, stats.total)}
            tone="blue"
          />
          <KpiCard
            icon={<ClockIcon size={18} />}
            title="Tiempo de respuesta prom."
            value={stats.response}
            note="Promedio global"
            tone="blue"
          />
        </section>

        <section style={styles.card}>
          <div style={styles.filters}>
            <input
              style={styles.search}
              placeholder="Buscar por nombre o URL..."
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
            />

            <label style={styles.filterGroup}>
              <span>Estado</span>
              <select
                style={styles.select}
                value={filters.status}
                onChange={(event) => setFilter("status", event.target.value)}
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
                onChange={(event) => setFilter("type", event.target.value)}
              >
                <option value="ALL">Todos</option>
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
              </select>
            </label>

            <label style={styles.filterGroup}>
              <span>Ubicación</span>
              <select
                style={styles.select}
                value={filters.location}
                onChange={(event) => setFilter("location", event.target.value)}
              >
                <option value="ALL">Todas</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              <FilterIcon size={14} />
              Limpiar filtros
            </button>

            <button type="button" style={styles.filterIconButton}>
              <SettingsIcon size={16} />
            </button>
          </div>

          {selectedMonitorIds.length > 0 && (
            <div style={styles.bulkToolbar}>
              <div>
                <strong style={styles.bulkTitle}>
                  {selectedMonitorIds.length}{" "}
                  {selectedMonitorIds.length === 1
                    ? "web seleccionada"
                    : "webs seleccionadas"}
                </strong>
                <p style={styles.bulkCopy}>
                  Atajos: `Ctrl/Cmd + A` selecciona visibles. `Esc` limpia.
                  `Shift + click` amplía rango.
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
                feedback.type === "success"
                  ? styles.feedbackSuccess
                  : styles.feedbackError
              }
            >
              {feedback.text}
            </div>
          )}

          {loading ? (
            <LoadingState variant="table" label="Cargando webs monitorizadas" rows={7} />
          ) : error ? (
            <p style={styles.empty}>{error}</p>
          ) : filteredMonitors.length === 0 ? (
            <p style={styles.empty}>
              No hay webs que coincidan con los filtros.
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.checkboxHeader}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={areAllCurrentPageSelected}
                      onChange={toggleCurrentPageSelection}
                      aria-label="Seleccionar webs visibles"
                    />
                  </th>
                  <th style={styles.th}>Web</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Uptime (24h)</th>
                  <th style={styles.th}>Tiempo de respuesta</th>
                  <th style={styles.th}>Alertas</th>
                  <th style={styles.th}>Última comprobación</th>
                  <th style={styles.thActions}>Acciones</th>
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
                        ...(hoveredMonitorId === monitor.id
                          ? styles.trHover
                          : {}),
                      }}
                      onClick={() => navigate(`/monitors/${monitor.id}`)}
                      onMouseEnter={() => setHoveredMonitorId(monitor.id)}
                      onMouseLeave={() => setHoveredMonitorId(null)}
                    >
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

                      <td style={styles.td}>
                        <div style={styles.webCell}>
                          <span style={styles.webIcon}>
                            <GlobeIcon size={18} />
                          </span>
                          <div>
                            <strong style={styles.monitorName}>
                              {monitor.name}
                            </strong>
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
                            ...(viewStatus === "DOWN"
                              ? styles.alertBadgeDanger
                              : {}),
                          }}
                        >
                          {viewStatus === "DOWN" ? 1 : 0}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {formatRelativeDate(monitor.lastCheckedAt)}
                      </td>

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
                                  <LoadingState variant="button" label="Comprobando monitor" />
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
                                {togglingId !== monitor.id && (
                                  monitor.isActive ? (
                                    <PauseIcon size={15} />
                                  ) : (
                                    <PlayIcon size={15} />
                                  )
                                )}
                                {togglingId === monitor.id ? (
                                  <LoadingState variant="button" label="Actualizando monitor" />
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div style={styles.pagination}>
            <span style={styles.paginationText}>
              Mostrando {rangeStart} a {rangeEnd} de {filteredMonitors.length}{" "}
              webs
            </span>

            <div style={styles.pages}>
              <button
                type="button"
                style={styles.pageArrow}
                aria-label="Página anterior"
                onClick={() => setPage(page - 1)}
                disabled={!hasPreviousPage}
              >
                <span style={styles.pageArrowLeft}>
                  <ChevronRightIcon size={14} />
                </span>
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    style={
                      pageNumber === page
                        ? styles.pageActiveButton
                        : styles.pageNumberButton
                    }
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ),
              )}

              <button
                type="button"
                style={styles.pageArrow}
                aria-label="Página siguiente"
                onClick={() => setPage(page + 1)}
                disabled={!hasNextPage}
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>

            <div style={styles.pageSizeWrap}>
              <span style={styles.selectFake}>
                10 por página
                <span style={styles.pageSizeChevron}>
                  <ChevronRightIcon size={14} />
                </span>
              </span>
            </div>
          </div>
        </section>
      </main>

      <MonitorEditModal
        isOpen={Boolean(editingMonitor)}
        monitor={editingMonitor}
        isSubmitting={isSavingEdit}
        error={editError}
        onClose={handleCloseEdit}
        onSubmit={handleSaveEdit}
      />

      <DeleteSelectedModal
        error={deleteError}
        isDeleting={isDeleting}
        isOpen={isDeleteModalOpen}
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
    <div
      style={styles.modalOverlay}
      onClick={!isDeleting ? onCancel : undefined}
    >
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

function KpiCard({
  icon,
  title,
  value,
  note,
  tone,
}: {
  icon: ReactNode;
  title: string;
  value: string | number;
  note: string;
  tone: "green" | "blue" | "orange" | "purple";
}) {
  const colors = {
    green: uiTheme.colors.success,
    blue: uiTheme.colors.primary,
    orange: uiTheme.colors.warning,
    purple: uiTheme.colors.primary,
  };

  return (
    <div style={styles.kpiCard}>
      <div
        style={{
          ...styles.kpiIcon,
          background: `${colors[tone]}16`,
          color: colors[tone],
        }}
      >
        {icon}
      </div>

      <div>
        <p style={styles.kpiTitle}>{title}</p>
        <strong style={{ ...styles.kpiValue, color: colors[tone] }}>
          {value}
        </strong>
        <p style={styles.kpiNote}>{note}</p>
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

function formatRatio(value: number, total: number) {
  return `${total ? ((value / total) * 100).toFixed(1) : 0}% del total`;
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

const styles: Record<string, CSSProperties> = {
  main: pageMain,
  primaryButton: {
    ...primaryButtonBase,
    textDecoration: "none",
    padding: "0 16px",
    borderRadius: uiTheme.radii.sm,
    fontWeight: 600,
    fontSize: 14,
    minHeight: 40,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 20,
  },
  kpiCard: {
    ...kpiCardBase,
    display: "flex",
    gap: 14,
    alignItems: "center",
    minHeight: 94,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    lineHeight: 1,
  },
  kpiTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 500,
    color: uiTheme.colors.text,
  },
  kpiValue: {
    display: "block",
    marginTop: 7,
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1,
  },
  kpiNote: {
    margin: "7px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 11,
  },

  card: { ...tableCardBase, borderRadius: uiTheme.radii.md },
  filters: {
    display: "grid",
    gridTemplateColumns:
      "minmax(280px, 1.8fr) minmax(150px, 0.9fr) minmax(150px, 0.9fr) minmax(150px, 0.9fr) auto 40px",
    gap: 14,
    padding: 20,
    alignItems: "end",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  search: inputBase,
  filterGroup: filterGroupBase,
  select: inputBase,
  secondaryButton: {
    ...secondaryButtonBase,
    height: 40,
    borderRadius: uiTheme.radii.sm,
    fontWeight: 600,
    padding: "0 14px",
    cursor: "pointer",
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dangerButton: {
    border: `1px solid ${uiTheme.colors.danger}`,
    background: uiTheme.colors.danger,
    color: "#fff",
    height: 40,
    borderRadius: uiTheme.radii.sm,
    fontWeight: 600,
    padding: "0 14px",
    cursor: "pointer",
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  filterIconButton: {
    ...controlBase,
    width: 40,
    height: 40,
    borderRadius: uiTheme.radii.sm,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    lineHeight: 1,
  },
  bulkToolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "0 20px 18px",
  },
  bulkTitle: {
    display: "block",
    color: uiTheme.colors.text,
    fontSize: 14,
  },
  bulkCopy: {
    margin: "6px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  bulkActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  feedbackSuccess: {
    margin: "0 20px 18px",
    borderRadius: uiTheme.radii.sm,
    border: `1px solid ${uiTheme.colors.success}`,
    background: uiTheme.colors.successSoft,
    color: uiTheme.colors.success,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 500,
  },
  feedbackError: {
    margin: "0 20px 18px",
    borderRadius: uiTheme.radii.sm,
    border: `1px solid ${uiTheme.colors.danger}`,
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 500,
  },

  table: { width: "100%", borderCollapse: "collapse" },
  checkboxHeader: {
    width: 52,
    textAlign: "center",
    padding: "14px 8px",
    color: uiTheme.colors.muted,
    fontSize: 12,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    fontWeight: 600,
    verticalAlign: "middle",
  },
  checkboxCell: {
    width: 52,
    padding: "15px 8px",
    textAlign: "center",
    verticalAlign: "middle",
  },
  th: {
    textAlign: "left",
    padding: "14px 18px",
    color: uiTheme.colors.muted,
    fontSize: 12,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    fontWeight: 600,
    letterSpacing: "-0.005em",
    verticalAlign: "middle",
  },
  thActions: {
    textAlign: "right",
    padding: "14px 18px",
    color: uiTheme.colors.muted,
    fontSize: 12,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    fontWeight: 600,
    letterSpacing: "-0.005em",
    verticalAlign: "middle",
  },
  tr: {
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
    cursor: "pointer",
    background: "#fff",
    transition: "background 0.15s ease",
  },
  trHover: {
    background: "#F1F5F9",
  },
  trSelected: {
    background: uiTheme.colors.primarySoft,
  },
  td: {
    padding: "15px 18px",
    fontSize: 13,
    fontWeight: 400,
    color: uiTheme.colors.text,
    verticalAlign: "middle",
  },
  tdActions: {
    padding: "15px 18px",
    fontSize: 13,
    fontWeight: 400,
    color: uiTheme.colors.text,
    verticalAlign: "middle",
    textAlign: "right",
    position: "relative",
  },
  webCell: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  webIcon: {
    width: 38,
    height: 38,
    borderRadius: uiTheme.radii.sm,
    background: uiTheme.colors.primarySoft,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.primary,
    flexShrink: 0,
    lineHeight: 1,
  },
  monitorName: {
    fontWeight: 600,
    fontSize: 13,
    lineHeight: 1.2,
  },
  url: {
    marginTop: 4,
    color: uiTheme.colors.muted,
    fontSize: 12,
    opacity: 0.75,
    maxWidth: 360,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  badge: {
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    background: "currentColor",
    display: "inline-block",
    flexShrink: 0,
  },
  uptimeCell: { display: "flex", alignItems: "center", gap: 12 },
  alertBadge: {
    display: "inline-grid",
    placeItems: "center",
    minWidth: 22,
    height: 22,
    borderRadius: 6,
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.muted,
    fontWeight: 600,
    fontSize: 12,
  },
  alertBadgeDanger: {
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
  },
  actions: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    ...controlBase,
    width: 34,
    height: 34,
    cursor: "pointer",
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    color: "#475569",
    background: "#fff",
    border: `1px solid ${uiTheme.colors.border}`,
    padding: 0,
    lineHeight: 1,
  },
  actionMenu: {
    position: "absolute",
    top: 40,
    right: 0,
    zIndex: 30,
    width: 190,
    padding: 6,
    borderRadius: 12,
    background: "#fff",
    border: `1px solid ${uiTheme.colors.border}`,
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
    display: "grid",
    gap: 4,
  },
  actionMenuItem: {
    border: 0,
    background: "transparent",
    color: uiTheme.colors.text,
    minHeight: 36,
    padding: "0 10px",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontSize: 12,
    fontWeight: 500,
    textAlign: "left",
  },

  pagination: {
    ...paginationBase,
    gap: 12,
    padding: "14px 20px",
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
  },
  paginationText: { justifySelf: "start" },
  pages: {
    justifySelf: "center",
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: uiTheme.colors.text,
  },
  pageActiveButton: pageActiveButtonBase,
  pageNumberButton: {
    border: "1px solid transparent",
    background: "transparent",
    color: "#475569",
    minWidth: 36,
    textAlign: "center",
    cursor: "pointer",
    padding: "7px 11px",
  },
  pageArrow: pageArrowBase,
  pageArrowLeft: {
    transform: "rotate(180deg)",
    display: "grid",
    placeItems: "center",
  },
  pageSizeWrap: { justifySelf: "end" },
  selectFake: {
    ...selectFakeBase,
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    minWidth: 122,
    justifyContent: "space-between",
  },
  pageSizeChevron: {
    transform: "rotate(90deg)",
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.slate,
  },
  empty: { padding: 20, color: uiTheme.colors.muted, fontSize: 13 },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "grid",
    placeItems: "center",
    padding: 24,
    zIndex: 35,
  },
  confirmModal: {
    ...surfaceCard,
    width: "min(520px, 100%)",
    padding: 24,
    display: "grid",
    gap: 16,
  },
  confirmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
    display: "grid",
    placeItems: "center",
  },
  confirmTitle: {
    margin: 0,
    fontSize: 24,
  },
  confirmCopy: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 14,
    lineHeight: 1.5,
  },
  confirmList: {
    display: "grid",
    gap: 10,
  },
  confirmListItem: {
    ...surfaceCard,
    padding: "12px 14px",
    display: "grid",
    gap: 4,
  },
  confirmListUrl: {
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  confirmListMore: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 500,
  },
  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
  },
};

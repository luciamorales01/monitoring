import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  controlBase,
  inputBase,
  pageActiveButtonBase,
  pageArrowBase,
  pageMain,
  secondaryButtonBase,
  surfaceCard,
  uiTheme,
} from "../../theme/commonStyles";
import {
  getMonitors,
  updateMonitor,
  useSectionSchedule,
  type Monitor,
  type UpdateMonitorInput,
} from "../../shared/monitorApi";
import {
  getMonitorViewStatus,
  sortMonitors,
  type MonitorSortOption,
  type MonitorViewStatus,
} from "../../shared/monitorFilters";
import { useLocalPagination } from "../../shared/useLocalPagination";
import AppTopbar from "../../shared/AppTopbar";
import LoadingState from "../../shared/LoadingState";
import { useCurrentUserPermissions } from "../../shared/permissions";
import {
  downloadReportExport,
  type ReportFormat,
  type ReportRange,
} from "../../shared/reportsApi";
import {
  getSections,
  getSection,
  runSectionChecks,
  updateSection,
  updateSectionMembers,
  type ApiSection,
} from "../../shared/sectionsApi";
import { getUsers, type User } from "../../shared/userApi";
import MonitorEditModal from "../monitors/MonitorEditModal";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  EditIcon,
  FilterIcon,
  GlobeIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  SearchIcon,
} from "../../shared/uiIcons";
import { SectionIconGlyph, getSectionIconWrapStyle } from "./sectionVisuals";
import SectionEditorModal, {
  type SectionEditorMode,
  type SectionEditorSubmitPayload,
} from "./SectionEditorModal";
import type { MonitorSection } from "../../shared/sectionsStore";

const statusOptions = [
  { label: "Todos", value: "ALL" },
  { label: "Operativos", value: "UP" },
  { label: "Incidencias", value: "DOWN" },
  { label: "Pausados", value: "PAUSED" },
  { label: "Pendientes", value: "UNKNOWN" },
] as const;

const typeOptions = [
  { label: "Todos", value: "ALL" },
  { label: "HTTP", value: "HTTP" },
  { label: "HTTPS", value: "HTTPS" },
] as const;

const sortOptions = [
  { label: "Estado", value: "status" },
  { label: "Nombre", value: "name" },
  { label: "Última comprobación", value: "latest-check" },
] as const;

type StatusFilter = (typeof statusOptions)[number]["value"];
type TypeFilter = (typeof typeOptions)[number]["value"];
type ActiveTab = "monitors" | "members";

export default function SectionDetailPage() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const { canWrite: canWriteActions } = useCurrentUserPermissions();
  const [section, setSection] = useState<ApiSection | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [sortFilter, setSortFilter] = useState<MonitorSortOption>("status");
  const [activeTab, setActiveTab] = useState<ActiveTab>("monitors");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [allMonitors, setAllMonitors] = useState<Monitor[]>([]);
  const [allSections, setAllSections] = useState<MonitorSection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [isSavingMonitor, setIsSavingMonitor] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [sectionEditorMode, setSectionEditorMode] =
    useState<SectionEditorMode | null>(null);
  const [exportRange, setExportRange] = useState<ReportRange>("7d");
  const [exportingFormat, setExportingFormat] = useState<ReportFormat | null>(
    null,
  );

  const loadData = async () => {
    if (!sectionId) {
      setError("Seccion no encontrada.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [nextSection, nextMonitors, nextSections, nextUsers] =
        await Promise.all([
          getSection(sectionId),
          canWriteActions ? getMonitors() : Promise.resolve([]),
          canWriteActions ? getSections() : Promise.resolve([]),
          canWriteActions ? getUsers() : Promise.resolve([]),
        ]);

      setSection(nextSection);
      setMonitors(nextSection.monitors ?? []);
      setAllMonitors(nextMonitors);
      setAllSections(nextSections);
      setUsers(nextUsers);
      setError(null);
    } catch (currentError) {
      console.error("Error loading section detail", currentError);
      setError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo cargar la seccion.",
      );
      setMonitors([]);
      setAllMonitors([]);
      setAllSections([]);
      setUsers([]);
      setSection(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [canWriteActions, sectionId]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target?.closest('[data-section-detail-menu-root="true"]')) {
        setIsActionsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleRunSectionChecks = async () => {
    if (!sectionId) {
      return;
    }

    const confirmed = window.confirm(
      "Se va a comprobar ahora todos los monitores activos de esta seccion. Esto puede generar checks e incidencias reales. ¿Quieres continuar?",
    );

    if (!confirmed) {
      return;
    }

    setIsChecking(true);
    setFeedback(null);

    try {
      const result = await runSectionChecks(sectionId);
      setFeedback(
        `Comprobacion lanzada: ${result.checked} monitores activos revisados.`,
      );
      await loadData();
    } catch (currentError) {
      console.error("Error running section checks", currentError);
      setFeedback(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo comprobar la seccion.",
      );
    } finally {
      setIsChecking(false);
    }
  };

  const handleOpenSectionEditor = (mode: SectionEditorMode) => {
    setSectionEditorMode(mode);
    setIsActionsMenuOpen(false);
  };

  const handleCloseSectionEditor = () => {
    setSectionEditorMode(null);
  };

  const handleSaveSection = async (payload: SectionEditorSubmitPayload) => {
    if (!sectionId || !section) {
      return;
    }

    setFeedback(null);

    try {
      const { memberIds, ...sectionPayload } = payload;
      await updateSection(sectionId, sectionPayload);
      await updateSectionMembers(sectionId, memberIds);

      setFeedback(
        sectionEditorMode === "members"
          ? "Miembros actualizados correctamente."
          : sectionEditorMode === "monitors"
            ? "Monitores actualizados correctamente."
            : "Seccion actualizada correctamente.",
      );
      handleCloseSectionEditor();
      await loadData();
    } catch (currentError) {
      console.error("Error saving section detail", currentError);
      setFeedback(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo guardar la seccion.",
      );
    }
  };

  const handleSaveMonitor = async (data: UpdateMonitorInput) => {
    if (!editingMonitor) return;
    setIsSavingMonitor(true);
    setEditError(null);

    try {
      await updateMonitor(editingMonitor.id, data);
      setEditingMonitor(null);
      await loadData();
    } catch (currentError) {
      setEditError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo guardar el monitor.",
      );
    } finally {
      setIsSavingMonitor(false);
    }
  };

  const handleUseSectionSchedule = async () => {
    if (!editingMonitor) return;
    setIsSavingMonitor(true);
    setEditError(null);

    try {
      await useSectionSchedule(editingMonitor.id);
      setEditingMonitor(null);
      setFeedback("Monitor sincronizado con la configuracion de la seccion.");
      await loadData();
    } catch (currentError) {
      setEditError(
        currentError instanceof Error
          ? currentError.message
          : "No se pudo aplicar la configuracion de la seccion.",
      );
    } finally {
      setIsSavingMonitor(false);
    }
  };

  const handleExportReport = async (format: ReportFormat) => {
    if (!sectionId) {
      return;
    }

    setExportingFormat(format);
    setFeedback(null);

    try {
      await downloadReportExport(exportRange, format, { sectionId });
      setFeedback("Informe de seccion exportado correctamente.");
    } catch (currentError) {
      console.error("Error exporting section report", currentError);
      setFeedback("No se pudo exportar el informe de la seccion.");
    } finally {
      setExportingFormat(null);
    }
  };

  const sectionMonitors = useMemo(() => {
    if (!section) {
      return [];
    }

    return monitors.filter((monitor) =>
      section.monitorIds.includes(monitor.id),
    );
  }, [monitors, section]);

  const stats = useMemo(() => {
    const statuses = sectionMonitors.map((monitor) =>
      getMonitorViewStatus(monitor),
    );
    const up = statuses.filter((status) => status === "UP").length;
    const down = statuses.filter((status) => status === "DOWN").length;
    const paused = statuses.filter((status) => status === "PAUSED").length;
    const unknown = statuses.filter((status) => status === "UNKNOWN").length;
    const activeAlerts = down;
    const uptime =
      sectionMonitors.length === 0
        ? "0%"
        : `${((up / sectionMonitors.length) * 100).toFixed(2)}%`;

    const statusTone: "green" | "orange" | "slate" =
      sectionMonitors.length === 0 ||
      unknown > 0 ||
      paused === sectionMonitors.length
        ? "slate"
        : down > 0
          ? "orange"
          : "green";

    return {
      up,
      down,
      paused,
      unknown,
      activeAlerts,
      uptime,
      statusLabel:
        sectionMonitors.length === 0
          ? "Sin monitores"
          : down > 0
            ? `${down} ${down === 1 ? "incidencia" : "incidencias"}`
            : "Todo operativo",
      statusTone,
    };
  }, [sectionMonitors]);

  const filteredMonitors = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const nextMonitors = sectionMonitors.filter((monitor) => {
      const viewStatus = getMonitorViewStatus(monitor);

      const matchesSearch =
        searchTerm.length === 0 ||
        monitor.name.toLowerCase().includes(searchTerm) ||
        monitor.target.toLowerCase().includes(searchTerm);

      const matchesStatus =
        statusFilter === "ALL" || viewStatus === statusFilter;

      const matchesType = typeFilter === "ALL" || monitor.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });

    return sortMonitors(nextMonitors, sortFilter);
  }, [search, sectionMonitors, statusFilter, typeFilter, sortFilter]);

  const sectionUsers = useMemo(
    () => section?.members ?? [],
    [section?.members],
  );

  const canShowActionsMenu = canWriteActions;

  const {
    page,
    setPage,
    pageItems,
    totalPages,
    rangeStart,
    rangeEnd,
    hasNextPage,
    hasPreviousPage,
  } = useLocalPagination(filteredMonitors, {
    pageSize: 10,
    resetKey: `${search}|${statusFilter}|${typeFilter}|${filteredMonitors.length}`,
  });

  if (loading) {
    return (
      <main style={styles.page}>
        <LoadingState variant="page" label="Cargando seccion" />
      </main>
    );
  }

  if (error || !section) {
    return (
      <main style={styles.page}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <MonitorIcon size={26} />
          </div>
          <strong>{error ?? "Seccion no encontrada."}</strong>
          <Link to="/sections" style={styles.secondaryLink}>
            Volver a secciones
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <AppTopbar
        title="Detalle de seccion"
        subtitle={section.name}
        onRefresh={loadData}
      />

      <div style={styles.breadcrumb}>
        <Link to="/sections" style={styles.breadcrumbLink}>
          Secciones
        </Link>
        <ChevronRightIcon size={14} />
        <strong>{section.name}</strong>
      </div>

      <header style={styles.hero}>
        <div style={styles.heroMain}>
          <div style={getSectionIconWrapStyle(section.icon, styles.heroIcon)}>
            <SectionIconGlyph icon={section.icon} size={34} />
          </div>

          <div style={styles.heroCopy}>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>{section.name}</h1>
              <span style={styles.countBadge}>
                <MonitorIcon size={14} />
                {sectionMonitors.length}{" "}
                {sectionMonitors.length === 1 ? "monitor" : "monitores"}
              </span>
            </div>
            <p style={styles.description}>
              {section.description || "Monitores agrupados en esta seccion."}
            </p>
            <div style={styles.metaRow}>
              <span style={styles.metaItem}>
                <ClockIcon size={14} />
                Ultima actualizacion: {formatRelativeDate(section.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {canShowActionsMenu ? (
          <div style={styles.heroActions} data-section-detail-menu-root="true">
            <button
              type="button"
              style={styles.moreButton}
              aria-label="Abrir acciones de la seccion"
              onClick={() =>
                setIsActionsMenuOpen((currentValue) => !currentValue)
              }
            >
              <MoreHorizontalIcon size={18} />
            </button>

            {isActionsMenuOpen ? (
              <div style={styles.menu}>
                <button
                  type="button"
                  style={styles.menuItem}
                  onClick={() => handleOpenSectionEditor("full")}
                >
                  <EditIcon size={14} />
                  Editar seccion
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.menuItem,
                    ...(isChecking || sectionMonitors.length === 0
                      ? styles.menuItemDisabled
                      : {}),
                  }}
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    void handleRunSectionChecks();
                  }}
                  disabled={isChecking || sectionMonitors.length === 0}
                >
                  <CheckCircleIcon size={14} />
                  {isChecking ? "Comprobando..." : "Comprobar todos"}
                </button>
                <button
                  type="button"
                  style={styles.menuItem}
                  onClick={() => handleOpenSectionEditor("monitors")}
                >
                  <MonitorIcon size={14} />
                  Anadir monitor a seccion
                </button>
                <button
                  type="button"
                  style={styles.menuItem}
                  onClick={() => handleOpenSectionEditor("members")}
                >
                  <GlobeIcon size={14} />
                  Anadir miembros a seccion
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {feedback && <div style={styles.feedbackInfo}>{feedback}</div>}

      <section style={styles.kpiGrid}>
        <KpiCard
          icon={<CheckCircleIcon size={22} />}
          iconTone="green"
          title="Estado general"
          value={stats.statusLabel}
          note={
            stats.activeAlerts > 0
              ? "Requiere revision"
              : "Sin incidencias activas"
          }
          valueTone={stats.statusTone}
        />
        <KpiCard
          icon={<MonitorIcon size={22} />}
          iconTone="blue"
          title="Monitores"
          value={`${stats.up} / ${sectionMonitors.length}`}
          note="Todos los monitores"
        />
        <KpiCard
          icon={<span style={styles.alertDot} />}
          iconTone="orange"
          title="Alertas activas"
          value={stats.activeAlerts}
          note={
            stats.activeAlerts > 0
              ? "Incidencias abiertas"
              : "Sin alertas activas"
          }
        />
        <KpiCard
          icon={<TrendingGlyph />}
          iconTone="purple"
          title="Uptime estimado"
          value={stats.uptime}
          note="Segun estado actual"
        />
      </section>

      <section style={styles.exportCard}>
        <div>
          <h2 style={styles.exportTitle}>Exportar informe de la seccion</h2>
          <p style={styles.exportSubtitle}>
            Descarga un resumen consolidado de los monitores de {section.name}{" "}
            para el periodo seleccionado.
          </p>
        </div>

        <div style={styles.exportControls}>
          <select
            value={exportRange}
            onChange={(event) =>
              setExportRange(event.target.value as ReportRange)
            }
            style={styles.exportSelect}
          >
            <option value="24h">Ultimas 24 horas</option>
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
          </select>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void handleExportReport("csv")}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === "csv" ? "Exportando..." : "CSV"}
          </button>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => void handleExportReport("pdf")}
            disabled={exportingFormat !== null}
          >
            {exportingFormat === "pdf" ? "Exportando..." : "PDF"}
          </button>
        </div>
      </section>

      <nav style={styles.tabs}>
        {[
          { key: "monitors", label: "Monitores" },
          { key: "members", label: "Miembros" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            style={
              activeTab === tab.key ? styles.tabActiveButton : styles.tabButton
            }
            onClick={() => setActiveTab(tab.key as ActiveTab)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "monitors" ? (
        <section style={styles.monitorArea}>
          <div style={styles.toolbar}>
            <label style={styles.searchWrap}>
              <SearchIcon size={18} />
              <input
                style={styles.searchInput}
                placeholder="Buscar monitores..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div style={styles.filters}>
              <label style={styles.selectWrap}>
                Estado:
                <select
                  style={styles.select}
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.selectWrap}>
                Tipo:
                <select
                  style={styles.select}
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as TypeFilter)
                  }
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.selectWrap}>
                Orden:
                <select
                  style={styles.select}
                  value={sortFilter}
                  onChange={(event) =>
                    setSortFilter(event.target.value as MonitorSortOption)
                  }
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button type="button" style={styles.filterButton}>
                <FilterIcon size={16} />
              </button>
            </div>
          </div>

          <div style={styles.tableCard}>
            {filteredMonitors.length === 0 ? (
              <div style={styles.emptyTable}>
                <strong>No hay monitores en esta vista.</strong>
              </div>
            ) : (
              <table style={styles.table}>
                <colgroup>
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "12%" }} />
                  {canWriteActions ? <col style={{ width: "90px" }} /> : null}
                </colgroup>
                <thead>
                  <tr>
                    <th style={styles.th}>Monitor</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Estado</th>
                    <th style={styles.th}>Uptime estimado</th>
                    <th style={styles.th}>Ultima comprobacion</th>
                    <th style={styles.th}>Programacion</th>
                    {canWriteActions ? (
                      <th style={styles.th}>Acciones</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((monitor) => {
                    const viewStatus = getMonitorViewStatus(monitor);

                    return (
                      <tr
                        key={monitor.id}
                        style={styles.tr}
                        onClick={() => navigate(`/monitors/${monitor.id}`)}
                      >
                        <td style={styles.td}>
                          <div style={styles.monitorCell}>
                            <span style={styles.monitorIcon}>
                              {monitor.type === "HTTPS" ? (
                                <GlobeIcon size={18} />
                              ) : (
                                <MonitorIcon size={18} />
                              )}
                            </span>
                            <span style={styles.monitorCopy}>
                              <strong>{monitor.name}</strong>
                              <span>{monitor.target}</span>
                            </span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.typeBadge}>{monitor.type}</span>
                        </td>
                        <td style={styles.td}>
                          <StatusText status={viewStatus} />
                        </td>
                        <td style={styles.td}>
                          <span style={styles.uptimeCell}>
                            {getMonitorUptime(viewStatus)}
                            {viewStatus === "UP" && (
                              <small style={styles.uptimeTrend}>+ 0.02%</small>
                            )}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {formatRelativeDate(monitor.lastCheckedAt)}
                        </td>
                        <td style={styles.td}>
                          {monitor.usesSectionSchedule === false ? (
                            <span style={styles.customBadge}>
                              Personalizada
                            </span>
                          ) : (
                            <span style={styles.scheduleText}>Seccion</span>
                          )}
                        </td>
                        {canWriteActions ? (
                          <td
                            style={styles.tdActions}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              style={styles.rowActionButton}
                              aria-label={`Acciones de ${monitor.name}`}
                              onClick={() => setEditingMonitor(monitor)}
                            >
                              <MoreHorizontalIcon size={18} />
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={styles.pagination}>
            <span style={styles.paginationText}>
              Mostrando {rangeStart} a {rangeEnd} de {filteredMonitors.length}{" "}
              monitores
            </span>

            <div style={styles.pages}>
              <button
                type="button"
                style={styles.pageArrow}
                onClick={() => setPage(page - 1)}
                disabled={!hasPreviousPage}
                aria-label="Pagina anterior"
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
                onClick={() => setPage(page + 1)}
                disabled={!hasNextPage}
                aria-label="Pagina siguiente"
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>

            <span style={styles.pageSize}>10 por pagina</span>
          </div>
        </section>
      ) : (
        <section style={styles.tableCard}>
          {sectionUsers.length === 0 ? (
            <div style={styles.emptyTable}>
              <strong>No hay usuarios disponibles.</strong>
            </div>
          ) : (
            <div style={styles.memberList}>
              {sectionUsers.map((user) => (
                <div key={user.id} style={styles.memberRow}>
                  <span style={styles.memberCopy}>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </span>
                  <span style={styles.typeBadge}>{user.role}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      <SectionEditorModal
        isOpen={canWriteActions && sectionEditorMode !== null}
        monitors={allMonitors}
        canManageMembers={canWriteActions}
        users={users.filter((user) => user.status === "ACTIVE")}
        section={section}
        sections={allSections}
        mode={sectionEditorMode ?? "full"}
        onClose={handleCloseSectionEditor}
        onSubmit={handleSaveSection}
      />
      <MonitorEditModal
        error={editError}
        isOpen={Boolean(editingMonitor)}
        isSubmitting={isSavingMonitor}
        monitor={editingMonitor}
        onClose={() => setEditingMonitor(null)}
        onSubmit={handleSaveMonitor}
        sectionSchedule={section}
        onUseSectionSchedule={handleUseSectionSchedule}
      />
    </main>
  );
}

function KpiCard({
  icon,
  iconTone,
  title,
  value,
  note,
  valueTone = "default",
}: {
  icon: React.ReactNode;
  iconTone: "green" | "blue" | "orange" | "purple";
  title: string;
  value: string | number;
  note: string;
  valueTone?: "default" | "green" | "orange" | "slate";
}) {
  return (
    <article style={styles.kpiCard}>
      <span style={{ ...styles.kpiIcon, ...styles[`kpiIcon${iconTone}`] }}>
        {icon}
      </span>
      <div>
        <span style={styles.kpiTitle}>{title}</span>
        <strong
          style={{
            ...styles.kpiValue,
            ...(valueTone === "green"
              ? styles.valueGreen
              : valueTone === "orange"
                ? styles.valueOrange
                : valueTone === "slate"
                  ? styles.valueSlate
                  : {}),
          }}
        >
          {value}
        </strong>
        <p style={styles.kpiNote}>{note}</p>
      </div>
    </article>
  );
}

function StatusText({ status }: { status: MonitorViewStatus }) {
  return (
    <span
      style={{
        ...styles.statusText,
        ...(status === "UP"
          ? styles.statusGreen
          : status === "DOWN"
            ? styles.statusOrange
            : styles.statusSlate),
      }}
    >
      <span style={styles.statusDot}>●</span>
      {status === "UP"
        ? "Operativo"
        : status === "DOWN"
          ? "Incidencia"
          : status === "PAUSED"
            ? "Pausado"
            : "Pendiente"}
    </span>
  );
}

function TrendingGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 16 9 11l4 4 7-8" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

function getMonitorUptime(status: MonitorViewStatus) {
  if (status === "UP") {
    return "99.98%";
  }

  if (status === "DOWN") {
    return "96.40%";
  }

  if (status === "PAUSED") {
    return "Pausado";
  }

  return "Pendiente";
}

function formatRelativeDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "-";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "Hace menos de 1 min";
  }

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} d`;
}

const styles: Record<string, CSSProperties> = {
  page: {
    ...pageMain,
    display: "flex",
    flexDirection: "column",
    gap: 22,
    backgroundImage:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.07), transparent 30%), linear-gradient(225deg, rgba(15, 23, 42, 0.045), transparent 28%)",
  },
  feedbackInfo: {
    ...surfaceCard,
    padding: "14px 18px",
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    borderColor: uiTheme.colors.primarySoft,
    fontWeight: 600,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: uiTheme.colors.muted,
    fontSize: 13,
    fontWeight: 500,
  },
  breadcrumbLink: {
    color: uiTheme.colors.muted,
    textDecoration: "none",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },
  heroMain: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    minWidth: 0,
  },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 20,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  heroCopy: {
    minWidth: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.1,
    fontWeight: 850,
    color: uiTheme.colors.text,
    letterSpacing: "0em",
  },
  countBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "6px 10px",
    borderRadius: 999,
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    fontSize: 12,
    fontWeight: 600,
  },
  description: {
    margin: "10px 0 0",
    color: uiTheme.colors.muted,
    maxWidth: 680,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 500,
  },
  metaItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  metaDivider: {
    width: 1,
    height: 15,
    background: uiTheme.colors.borderStrong,
  },
  heroActions: {
    position: "relative",
    display: "flex",
    justifyContent: "flex-end",
  },
  primaryButton: {
    ...controlBase,
    minHeight: 40,
    padding: "0 16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    borderRadius: 12,
    borderColor: uiTheme.colors.primary,
    background: uiTheme.colors.primary,
    color: "#fff",
    fontWeight: 700,
  },
  secondaryLink: {
    ...secondaryButtonBase,
    marginTop: 16,
    minHeight: 40,
    padding: "0 14px",
    display: "inline-flex",
    alignItems: "center",
    textDecoration: "none",
    fontWeight: 500,
    borderRadius: 14,
  },
  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 38,
    padding: "0 14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontWeight: 500,
    textDecoration: "none",
    borderRadius: 12,
  },
  moreButton: {
    ...controlBase,
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    background: uiTheme.colors.surface,
    borderRadius: 14,
  },
  menu: {
    ...surfaceCard,
    position: "absolute",
    top: 48,
    right: 0,
    minWidth: 220,
    zIndex: 10,
    padding: 8,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    borderRadius: 18,
  },
  menuItem: {
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    padding: "10px 12px",
    color: uiTheme.colors.text,
    cursor: "pointer",
    fontWeight: 600,
    textAlign: "left",
  },
  menuItemDisabled: {
    color: uiTheme.colors.muted,
    cursor: "not-allowed",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
  },
  exportCard: {
    ...surfaceCard,
    borderRadius: 20,
    padding: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  exportTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
  },
  exportSubtitle: {
    margin: "6px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
    maxWidth: 640,
  },
  exportControls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  exportSelect: {
    ...inputBase,
    minHeight: 40,
    borderRadius: 12,
    minWidth: 170,
  },
  kpiCard: {
    ...surfaceCard,
    minHeight: 92,
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 16,
    borderRadius: 20,
  },
  kpiIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  kpiIcongreen: {
    color: uiTheme.colors.success,
    background: uiTheme.colors.successSoft,
  },
  kpiIconblue: {
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
  },
  kpiIconorange: {
    color: uiTheme.colors.warning,
    background: uiTheme.colors.warningSoft,
  },
  kpiIconpurple: {
    color: uiTheme.colors.primaryDark,
    background: uiTheme.colors.surfaceSoft,
  },
  alertDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    background: uiTheme.colors.warning,
  },
  kpiTitle: {
    display: "block",
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 6,
  },
  kpiValue: {
    display: "block",
    color: uiTheme.colors.text,
    fontSize: 22,
    lineHeight: 1.1,
  },
  kpiNote: {
    margin: "8px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  valueGreen: {
    color: uiTheme.colors.success,
  },
  valueOrange: {
    color: uiTheme.colors.warning,
  },
  valueSlate: {
    color: uiTheme.colors.muted,
  },
  tabs: {
    display: "flex",
    gap: 12,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },
  tabButton: {
    border: "none",
    background: "transparent",
    color: uiTheme.colors.muted,
    fontWeight: 500,
    fontSize: 14,
    padding: "0 16px 14px",
    cursor: "pointer",
  },
  tabActiveButton: {
    border: "none",
    background: "transparent",
    color: uiTheme.colors.primary,
    fontWeight: 600,
    fontSize: 14,
    padding: "0 16px 14px",
    cursor: "pointer",
    boxShadow: `inset 0 -2px 0 ${uiTheme.colors.primary}`,
  },
  tdActions: {
    padding: "14px 16px",
    color: uiTheme.colors.text,
    fontSize: 13,
    overflow: "visible",
    whiteSpace: "nowrap",
    textAlign: "right",
  },

  rowActionButton: {
    ...controlBase,
    width: 38,
    height: 38,
    minWidth: 38,
    padding: 0,
    display: "inline-grid",
    placeItems: "center",
    cursor: "pointer",
    borderRadius: 12,
    background: uiTheme.colors.surface,
    color: uiTheme.colors.muted,
  },
  monitorArea: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  searchWrap: {
    ...inputBase,
    width: "min(360px, 100%)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: uiTheme.colors.muted,
    paddingLeft: 14,
    borderRadius: 14,
  },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    background: "transparent",
    color: uiTheme.colors.text,
    fontSize: 14,
  },
  filters: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  selectWrap: {
    ...controlBase,
    height: 42,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "0 14px",
    color: uiTheme.colors.muted,
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 14,
  },
  select: {
    border: "none",
    background: "transparent",
    outline: "none",
    color: uiTheme.colors.text,
    fontWeight: 500,
  },
  filterButton: {
    ...controlBase,
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    color: uiTheme.colors.muted,
    borderRadius: 14,
  },
  tableCard: {
    ...surfaceCard,
    overflow: "hidden",
    borderRadius: 20,
  },
  table: {
    width: "100%",
    minWidth: 980,
    tableLayout: "fixed",
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  th: {
    textAlign: "left",
    padding: "13px 16px",
    color: uiTheme.colors.muted,
    fontSize: 12,
    fontWeight: 600,
    background: uiTheme.colors.surfaceSoft,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tr: {
    cursor: "pointer",
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surface,
  },
  td: {
    padding: "14px 16px",
    color: uiTheme.colors.text,
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  monitorCell: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  monitorIcon: {
    width: 38,
    height: 38,
    minWidth: 38,
    flexShrink: 0,
    borderRadius: 9,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.success,
    background: uiTheme.colors.successSoft,
  },
  monitorCopy: {
    display: "grid",
    gap: 4,
    minWidth: 0,
    overflow: "hidden",
  },
  typeBadge: {
    display: "inline-flex",
    padding: "5px 8px",
    borderRadius: 7,
    color: uiTheme.colors.primary,
    background: uiTheme.colors.primarySoft,
    fontWeight: 600,
    fontSize: 12,
  },
  customBadge: {
    display: "inline-flex",
    padding: "5px 8px",
    borderRadius: 7,
    color: uiTheme.colors.warning,
    background: uiTheme.colors.warningSoft,
    fontWeight: 600,
    fontSize: 12,
  },
  scheduleText: {
    color: uiTheme.colors.muted,
    fontWeight: 600,
  },
  statusText: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 500,
  },
  statusDot: {
    fontSize: 12,
    lineHeight: 1,
  },
  statusGreen: {
    color: uiTheme.colors.success,
  },
  statusOrange: {
    color: uiTheme.colors.warning,
  },
  statusSlate: {
    color: uiTheme.colors.muted,
  },
  uptimeCell: {
    display: "inline-flex",
    alignItems: "center",
    gap: 14,
    fontWeight: 600,
  },
  uptimeTrend: {
    color: uiTheme.colors.success,
    fontWeight: 600,
  },
  pagination: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  paginationText: {
    fontSize: 13,
  },
  pages: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pageArrow: {
    ...pageArrowBase,
  },
  pageArrowLeft: {
    display: "inline-flex",
    transform: "rotate(180deg)",
  },
  pageActiveButton: {
    ...pageActiveButtonBase,
  },
  pageNumberButton: {
    ...pageArrowBase,
    width: 36,
    fontWeight: 500,
  },
  pageSize: {
    justifySelf: "end",
    ...controlBase,
    padding: "8px 12px",
  },
  emptyState: {
    minHeight: 420,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    color: uiTheme.colors.text,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    margin: "0 auto 16px",
    display: "grid",
    placeItems: "center",
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
  },
  emptyTable: {
    minHeight: 240,
    display: "grid",
    placeItems: "center",
    color: uiTheme.colors.muted,
  },
  memberList: {
    display: "grid",
    gap: 0,
  },
  memberRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    borderBottom: `1px solid ${uiTheme.colors.border}`,
  },
  memberCopy: {
    display: "grid",
    gap: 4,
  },
};

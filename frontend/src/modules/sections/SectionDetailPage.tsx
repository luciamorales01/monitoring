import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getMonitors,
  useSectionSchedule,
  type Monitor,
} from "../../shared/monitorApi";
import { getMonitorViewStatus } from "../../shared/monitorFilters";
import AppTopbar from "../../shared/AppTopbar";
import ReportExportPanel from "../../shared/components/ReportExportPanel";
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
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  EditIcon,
  GlobeIcon,
  MonitorIcon,
  MoreHorizontalIcon,
} from "../../shared/uiIcons";
import { SectionIconGlyph, getSectionIconWrapStyle } from "./sectionVisuals";
import SectionEditorModal, {
  type SectionEditorMode,
  type SectionEditorSubmitPayload,
} from "./SectionEditorModal";
import type { MonitorSection } from "../../shared/sectionsStore";
import MonitorListCard from "../monitors/MonitorListCard";
import { KpiCard, TrendingGlyph } from "./components/SectionDetailParts";
import { styles } from "./SectionDetailPage.styles";
import type { ActiveTab } from "./SectionDetailPage.types";
import { formatRelativeDate } from "./SectionDetailPage.utils";
import { attachSectionsToMonitors } from "./sectionMonitorLinks";

export default function SectionDetailPage() {
  const { sectionId } = useParams();
  const { canWrite: canWriteActions } = useCurrentUserPermissions();
  const [section, setSection] = useState<ApiSection | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("monitors");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [allMonitors, setAllMonitors] = useState<Monitor[]>([]);
  const [allSections, setAllSections] = useState<MonitorSection[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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
      setAllMonitors(attachSectionsToMonitors(nextMonitors, nextSections));
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
      "Se va a comprobar ahora todos los monitores activos de esta seccion. Esto puede generar checks e incidencias reales. Â¿Quieres continuar?",
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

  const sectionUsers = useMemo(
    () => section?.members ?? [],
    [section?.members],
  );

  const canShowActionsMenu = canWriteActions;

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

      <ReportExportPanel
        title="Exportar informe de la seccion"
        description={
          <>
            Descarga un resumen consolidado de los monitores de {section.name}{" "}
            para el periodo seleccionado.
          </>
        }
        exportRange={exportRange}
        exportingFormat={exportingFormat}
        onRangeChange={setExportRange}
        onExportReport={(format) => void handleExportReport(format)}
        styles={{
          card: styles.exportCard,
          title: styles.exportTitle,
          subtitle: styles.exportSubtitle,
          controls: styles.exportControls,
          select: styles.exportSelect,
          secondaryButton: styles.secondaryButton,
          primaryButton: styles.primaryButton,
        }}
      />

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
          <MonitorListCard
            monitors={sectionMonitors}
            loading={false}
            emptyStateMessage="No hay monitores en esta sección."
            emptyFilteredMessage="No hay monitores de esta sección que coincidan con los filtros."
            onRefresh={loadData}
            sectionSchedule={section}
            onUseSectionSchedule={async (monitor) => {
              await useSectionSchedule(monitor.id);
            }}
          />
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
        mode={sectionEditorMode ?? "full"}
        onClose={handleCloseSectionEditor}
        onSubmit={handleSaveSection}
      />
    </main>
  );
}

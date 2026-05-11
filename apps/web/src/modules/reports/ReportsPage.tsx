import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getUniqueOptions, normalizeSearchTerm } from "../../shared/filterUtils";
import { getIncidents, type Incident } from "../../shared/incidentApi";
import {
  getMonitorChecks,
  getMonitors,
  type Monitor,
  type MonitorCheck,
  type MonitorType,
} from "../../shared/monitorApi";
import { sortMonitorsByStatusAndLastCheck } from "../../shared/monitorFilters";
import { readSections, sanitizeSections, type MonitorSection } from "../../shared/sectionsStore";
import {
  badgeBase,
  filterGroupBase,
  inputBase,
  pageMain,
  primaryButtonBase,
  secondaryButtonBase,
  surfaceCard,
  toneStyles,
  uiTheme,
} from "../../theme/commonStyles";
import AppTopbar from "../../shared/AppTopbar";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  FilterIcon,
  GlobeIcon,
  MonitorIcon,
  MoreHorizontalIcon,
} from "../../shared/uiIcons";

type RangeFilter = "24h" | "7d" | "30d";
type StatusFilter = "all" | "UP" | "DOWN" | "PAUSED" | "UNKNOWN";
type SlaFilter = "all" | "met" | "breached";
type ComparisonDirection = "up" | "down" | "flat";
type InsightTone = "success" | "warning" | "danger" | "info";

type ReportRow = {
  monitor: Monitor;
  status: StatusFilter;
  sectionName: string;
  uptime: number;
  uptimeSource: "checks" | "fallback";
  previousUptime: number;
  previousUptimeSource: "checks" | "fallback";
  uptimeSampleChecks: number;
  uptimeSampleUpChecks: number;
  previousUptimeSampleChecks: number;
  previousUptimeSampleUpChecks: number;
  avgResponse: number;
  previousAvgResponse: number;
  incidents: number;
  previousIncidents: number;
  upChecks: number;
  checks: number;
  previousUpChecks: number;
  previousChecks: number;
  lastDowntimeAt: string | null;
  lastDowntimeLabel: string;
  healthScore: number;
  latestCheckAt: string | null;
  slaMet: boolean;
  incidentIds: number[];
};

type ComparisonMetric = {
  current: number;
  previous: number;
  delta: number;
  direction: ComparisonDirection;
};

type Insight = {
  title: string;
  description: string;
  tone: InsightTone;
  label: string;
  icon: ReactNode;
};

type ReportPayload = {
  monitors: Monitor[];
  incidents: Incident[];
  checksByMonitor: Record<number, MonitorCheck[]>;
  sections: MonitorSection[];
  loadedAt: string;
};

type PdfKpiItem = {
  label: string;
  value: string;
};

type PdfDiagnosticItem = {
  label: string;
  value: string;
};

type PdfMonitorRow = {
  avgResponse: number;
  incidents: number;
  lastDowntimeLabel: string;
  name: string;
  status: string;
  uptime: number;
};

type PdfRgb = [number, number, number];

type ReportPdfData = {
  companyName: string;
  diagnostics: PdfDiagnosticItem[];
  executiveSummary: string[];
  generatedAt: string;
  kpis: PdfKpiItem[];
  rangeLabel: string;
  rows: PdfMonitorRow[];
  title: string;
};

const SLA_TARGET = 99.5;
export default function ReportsPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [checksByMonitor, setChecksByMonitor] = useState<Record<number, MonitorCheck[]>>({});
  const [sections, setSections] = useState<MonitorSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [range, setRange] = useState<RangeFilter>("7d");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedMonitor, setSelectedMonitor] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedType, setSelectedType] = useState<"all" | MonitorType>("all");
  const [slaFilter, setSlaFilter] = useState<SlaFilter>("all");
  const [search, setSearch] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const payload = await loadReportPayload();
        if (!mounted) return;

        applyPayload(payload);
      } catch (currentError) {
        console.error("Error loading reports", currentError);

        if (!mounted) return;

        setError("No se pudieron cargar los informes.");
        setMonitors([]);
        setIncidents([]);
        setChecksByMonitor({});
        setSections([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  function applyPayload(payload: ReportPayload) {
    setMonitors(payload.monitors);
    setIncidents(payload.incidents);
    setChecksByMonitor(payload.checksByMonitor);
    setSections(payload.sections);
    setLastLoadedAt(payload.loadedAt);
  }

  async function handleRefresh() {
    try {
      setLoading(true);
      setError(null);

      const payload = await loadReportPayload();
      applyPayload(payload);
    } catch (currentError) {
      console.error("Error refreshing reports", currentError);
      setError("No se pudieron actualizar los datos.");
    } finally {
      setLoading(false);
    }
  }

  const sectionMap = useMemo(() => {
    const nextMap = new Map<number, string>();

    for (const section of sections) {
      for (const monitorId of section.monitorIds) {
        nextMap.set(monitorId, section.name);
      }
    }

    return nextMap;
  }, [sections]);

  const period = useMemo(() => getPeriodWindow(range), [range]);

  const reportRows = useMemo<ReportRow[]>(() => {
    return monitors.map((monitor) =>
      buildReportRow({
        incidentPool: incidents.filter((incident) => incident.monitor?.id === monitor.id),
        monitor,
        period,
        sectionName: sectionMap.get(monitor.id) ?? "Sin sección",
        checks: checksByMonitor[monitor.id] ?? [],
      }),
    );
  }, [checksByMonitor, incidents, monitors, period, sectionMap]);

  const filteredRows = useMemo(() => {
    const searchTerm = normalizeSearchTerm(search);

    const nextRows = reportRows.filter((row) => {
      const matchesStatus = status === "all" || row.status === status;
      const matchesMonitor =
        selectedMonitor === "all" || String(row.monitor.id) === selectedMonitor;
      const matchesSection =
        selectedSection === "all" || row.sectionName === selectedSection;
      const matchesType =
        selectedType === "all" || row.monitor.type === selectedType;
      const matchesSla =
        slaFilter === "all" ||
        (slaFilter === "met" ? row.slaMet : !row.slaMet);
      const haystack = [
        getMonitorName(row.monitor),
        getMonitorUrl(row.monitor),
        row.sectionName,
        row.monitor.type,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        matchesMonitor &&
        matchesSection &&
        matchesType &&
        matchesSla &&
        (!searchTerm || haystack.includes(searchTerm))
      );
    });

    return sortMonitorsByStatusAndLastCheck(nextRows, {
      getId: (row) => row.monitor.id,
      getLastCheckAt: (row) => row.latestCheckAt,
      getName: (row) => getMonitorName(row.monitor),
      getStatus: (row) => row.status,
      isPaused: (row) => row.status === "PAUSED",
    });
  }, [reportRows, search, selectedMonitor, selectedSection, selectedType, slaFilter, status]);

  const totals = useMemo(() => {
    const divisor = filteredRows.length || 1;
    const totalUpChecks = filteredRows.reduce(
      (sum, row) => sum + row.uptimeSampleUpChecks,
      0,
    );
    const totalChecks = filteredRows.reduce(
      (sum, row) => sum + row.uptimeSampleChecks,
      0,
    );
    const totalPreviousUpChecks = filteredRows.reduce(
      (sum, row) => sum + row.previousUptimeSampleUpChecks,
      0,
    );
    const totalPreviousChecks = filteredRows.reduce(
      (sum, row) => sum + row.previousUptimeSampleChecks,
      0,
    );
    const avgUptime = safePercentageFromCounts(totalUpChecks, totalChecks);
    const previousAvgUptime = safePercentageFromCounts(
      totalPreviousUpChecks,
      totalPreviousChecks,
    );
    const avgResponse =
      filteredRows.reduce((sum, row) => sum + row.avgResponse, 0) / divisor;
    const previousAvgResponse =
      filteredRows.reduce((sum, row) => sum + row.previousAvgResponse, 0) / divisor;
    const avgHealthScore =
      filteredRows.reduce((sum, row) => sum + row.healthScore, 0) / divisor;
    const incidentsCurrent = filteredRows.reduce((sum, row) => sum + row.incidents, 0);
    const incidentsPrevious = filteredRows.reduce(
      (sum, row) => sum + row.previousIncidents,
      0,
    );
    const checksCurrent = filteredRows.reduce((sum, row) => sum + row.checks, 0);
    const checksPrevious = filteredRows.reduce(
      (sum, row) => sum + row.previousChecks,
      0,
    );
    const slaBreached = filteredRows.filter((row) => !row.slaMet).length;
    const worstMonitor =
      [...filteredRows].sort((firstRow, secondRow) => {
        if (firstRow.uptime !== secondRow.uptime) {
          return firstRow.uptime - secondRow.uptime;
        }

        return secondRow.incidents - firstRow.incidents;
      })[0] ?? null;
    const noisiestMonitor =
      [...filteredRows].sort(
        (firstRow, secondRow) => secondRow.incidents - firstRow.incidents,
      )[0] ?? null;
    const monitorsInSla = filteredRows.filter((row) => row.slaMet).length;
    const monitorsWithCheckData = filteredRows.filter((row) => row.uptimeSource === "checks").length;
    const monitorsWithPreviousCheckData = filteredRows.filter(
      (row) => row.previousUptimeSource === "checks",
    ).length;
    const trendIsReliable =
      totalChecks >= Math.max(filteredRows.length, 3) &&
      totalPreviousChecks >= Math.max(filteredRows.length, 3) &&
      monitorsWithCheckData > 0 &&
      monitorsWithPreviousCheckData > 0;

    return {
      avgHealthScore: safeInteger(avgHealthScore),
      avgResponse: safeInteger(avgResponse),
      avgUptime,
      checksCurrent,
      checksPrevious,
      incidentsCurrent,
      incidentsPrevious,
      monitorsInSla,
      monitorsWithCheckData,
      monitorsWithPreviousCheckData,
      noisiestMonitor,
      previousAvgResponse: safeInteger(previousAvgResponse),
      previousAvgUptime,
      slaBreached,
      totalChecks,
      totalPreviousChecks,
      trendIsReliable,
      worstMonitor,
    };
  }, [filteredRows]);

  const comparisons = useMemo(() => {
    return {
      incidents: createComparisonMetric(
        totals.incidentsCurrent,
        totals.incidentsPrevious,
        true,
      ),
      response: createComparisonMetric(
        totals.avgResponse,
        totals.previousAvgResponse,
        true,
      ),
      uptime: createComparisonMetric(
        totals.avgUptime,
        totals.previousAvgUptime,
        false,
      ),
    };
  }, [totals]);

  const sectionIncidentSummary = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const row of filteredRows) {
      grouped.set(row.sectionName, (grouped.get(row.sectionName) ?? 0) + row.incidents);
    }

    return Array.from(grouped.entries()).sort((firstEntry, secondEntry) => {
      return secondEntry[1] - firstEntry[1];
    });
  }, [filteredRows]);

  const availabilitySeries = useMemo(() => {
    return buildAvailabilitySeries(filteredRows, checksByMonitor, period);
  }, [checksByMonitor, filteredRows, period]);

  const operationalDistribution = useMemo(() => {
    const healthy = filteredRows.filter(
      (row) => row.status === "UP" && row.slaMet && row.healthScore >= 85,
    ).length;
    const warning = filteredRows.filter(
      (row) =>
        row.status !== "DOWN" &&
        (!row.slaMet || row.healthScore < 85 || row.incidents > 0),
    ).length;
    const critical = filteredRows.filter((row) => row.status === "DOWN").length;

    return [
      {
        color: uiTheme.colors.danger,
        label: "Crítico",
        value: critical,
      },
      {
        color: uiTheme.colors.warning,
        label: "Vigilancia",
        value: Math.max(0, warning - critical),
      },
      {
        color: uiTheme.colors.success,
        label: "Saludable",
        value: Math.max(0, healthy),
      },
    ];
  }, [filteredRows]);

  const insights = useMemo<Insight[]>(() => {
    const nextInsights: Insight[] = [];
    const worstMonitor = totals.worstMonitor;
    const noisiestMonitor = totals.noisiestMonitor;
    const totalIncidents = totals.incidentsCurrent;

    if (worstMonitor && worstMonitor.uptime < 95) {
      nextInsights.push({
        title: "Riesgo crítico de disponibilidad",
        description: `${getMonitorName(worstMonitor.monitor)} cae a ${worstMonitor.uptime.toFixed(2)}% y rompe el SLA objetivo de ${SLA_TARGET}%.`,
        icon: <AlertTriangleIcon size={18} />,
        label: "Crítico",
        tone: "danger",
      });
    }

    if (totalIncidents > 10) {
      nextInsights.push({
        title: "Volumen alto de incidencias",
        description: `Se registran ${totalIncidents} incidencias en el periodo, por encima del umbral operativo recomendado.`,
        icon: <BellIcon size={18} />,
        label: "Advertencia",
        tone: "warning",
      });
    }

    if (totals.avgResponse > 700) {
      nextInsights.push({
        title: "Rendimiento degradado",
        description: `La latencia media sube a ${totals.avgResponse} ms. Revisar tiempos de backend, red y terceros.`,
        icon: <ClockIcon size={18} />,
        label: "Rendimiento",
        tone: "warning",
      });
    }

    if (
      noisiestMonitor &&
      totalIncidents > 0 &&
      noisiestMonitor.incidents / totalIncidents >= 0.4
    ) {
      nextInsights.push({
        title: "Monitor problemático identificado",
        description: `${getMonitorName(noisiestMonitor.monitor)} concentra ${noisiestMonitor.incidents} de ${totalIncidents} incidencias del periodo.`,
        icon: <MonitorIcon size={18} />,
        label: "Foco",
        tone: "info",
      });
    }

    if (nextInsights.length === 0) {
      nextInsights.push({
        title: "Estado saludable",
        description: `No se detectan riesgos críticos. Disponibilidad media ${totals.avgUptime.toFixed(2)}%, latencia ${totals.avgResponse} ms y sin brechas relevantes de SLA.`,
        icon: <CheckCircleIcon size={18} />,
        label: "OK",
        tone: "success",
      });
    }

    return nextInsights;
  }, [totals]);

  const executiveSummary = useMemo(() => {
    const worstMonitorName = totals.worstMonitor
      ? getMonitorName(totals.worstMonitor.monitor)
      : "sin desviaciones críticas";
    const trendText = totals.trendIsReliable
      ? describeTrend(comparisons.uptime, "disponibilidad")
      : "datos insuficientes para tendencia fiable";
    const incidentsText = comparisons.incidents.delta === 0
      ? "mismo volumen de incidencias"
      : comparisons.incidents.direction === "up"
        ? `${Math.abs(comparisons.incidents.delta)} incidencias menos`
        : `${Math.abs(comparisons.incidents.delta)} incidencias más`;
    const probableCause = describeLowUptimeCause({
      avgResponse: totals.avgResponse,
      incidents: totals.incidentsCurrent,
      worstMonitor: totals.worstMonitor,
    });

    const nextSummary = [
      `La disponibilidad media del periodo se sitúa en ${totals.avgUptime.toFixed(2)}%, con ${totals.incidentsCurrent} incidencias y una respuesta media de ${totals.avgResponse} ms.`,
      `El monitor más exigido es ${worstMonitorName}, que marca el mínimo operativo actual y condiciona la salud global del portfolio.`,
      totals.trendIsReliable
        ? `Frente al periodo anterior, ${trendText} y el sistema registra ${incidentsText}.`
        : `Frente al periodo anterior, ${trendText}. Necesitamos más checks históricos para comparar con confianza.`,
    ];

    if (totals.avgUptime < SLA_TARGET) {
      nextSummary.push(`La caída de uptime apunta a ${probableCause}.`);
    }

    return nextSummary;
  }, [comparisons.incidents, comparisons.uptime, totals]);

  const typeOptions = useMemo(() => {
    return getUniqueOptions(monitors.map((monitor) => monitor.type)) as MonitorType[];
  }, [monitors]);

  const sectionOptions = useMemo(() => {
    return getUniqueOptions(reportRows.map((row) => row.sectionName));
  }, [reportRows]);

  const diagnosticItems = useMemo(() => {
    const leadingSection = sectionIncidentSummary[0];

    return [
      {
        label: "Cobertura de checks",
        tone: totals.monitorsWithCheckData === filteredRows.length ? "success" : "warning",
        value: `${totals.monitorsWithCheckData}/${filteredRows.length || 0}`,
      },
      {
        label: "Checks periodo",
        tone: totals.totalChecks > 0 ? "info" : "warning",
        value: String(totals.totalChecks),
      },
      {
        label: "Causa probable",
        tone: totals.avgUptime < SLA_TARGET ? "warning" : "success",
        value: describeLowUptimeCause({
          avgResponse: totals.avgResponse,
          incidents: totals.incidentsCurrent,
          worstMonitor: totals.worstMonitor,
        }),
      },
      {
        label: "Sección más ruidosa",
        tone: leadingSection && leadingSection[1] > 0 ? "warning" : "success",
        value: leadingSection ? leadingSection[0] : "Sin incidencias",
      },
    ] as const;
  }, [filteredRows.length, sectionIncidentSummary, totals]);

  const summaryMetrics = useMemo(() => {
    return [
      {
        icon: <ActivityIcon size={18} />,
        title: "Disponibilidad media",
        value: `${totals.avgUptime.toFixed(2)}%`,
        note: formatComparisonNote(comparisons.uptime, "%"),
        tone: getComparisonTone(comparisons.uptime, false),
      },
      {
        icon: <BellIcon size={18} />,
        title: "Incidencias",
        value: totals.incidentsCurrent,
        note: formatComparisonNote(comparisons.incidents, ""),
        tone: getComparisonTone(comparisons.incidents, true),
      },
      {
        icon: <ClockIcon size={18} />,
        title: "Tiempo medio",
        value: `${totals.avgResponse} ms`,
        note: formatComparisonNote(comparisons.response, " ms"),
        tone: getComparisonTone(comparisons.response, true),
      },
      {
        icon: <GlobeIcon size={18} />,
        title: "Monitores en SLA",
        value: `${totals.monitorsInSla}/${filteredRows.length || 0}`,
        note: `${Math.max(filteredRows.length - totals.monitorsInSla, 0)} fuera de objetivo`,
        tone: totals.slaBreached > 0 ? "warning" : "success",
      },
      {
        icon: <CheckCircleIcon size={18} />,
        title: "Checks ejecutados",
        value: totals.checksCurrent,
        note: `${totals.checksPrevious} checks periodo anterior`,
        tone: "success",
      },
    ] as const;
  }, [comparisons.incidents, comparisons.response, comparisons.uptime, filteredRows.length, totals]);

  function exportGeneralCsv() {
    downloadCsv("informe-general-monitoring-tfg.csv", [
      [
        "Monitor ID",
        "Monitor",
        "Sección",
        "Tipo",
        "URL",
        "Estado",
        "SLA",
        "Disponibilidad actual (%)",
        "Disponibilidad anterior (%)",
        "Delta disponibilidad",
        "Tiempo medio actual (ms)",
        "Tiempo medio anterior (ms)",
        "Delta tiempo medio",
        "Incidencias actuales",
        "Incidencias anteriores",
        "Delta incidencias",
        "Health Score",
        "Checks actuales",
        "Checks anteriores",
        "Última caída",
      ],
      ...filteredRows.map((row) => [
        String(row.monitor.id),
        getMonitorName(row.monitor),
        row.sectionName,
        row.monitor.type,
        getMonitorUrl(row.monitor),
        getStatusLabel(row.status),
        row.slaMet ? "Cumplido" : "No cumplido",
        row.uptime.toFixed(2),
        row.previousUptime.toFixed(2),
        formatSignedValue(row.uptime - row.previousUptime, 2),
        String(row.avgResponse),
        String(row.previousAvgResponse),
        formatSignedValue(row.avgResponse - row.previousAvgResponse, 0),
        String(row.incidents),
        String(row.previousIncidents),
        formatSignedValue(row.incidents - row.previousIncidents, 0),
        String(row.healthScore),
        String(row.checks),
        String(row.previousChecks),
        row.lastDowntimeLabel,
      ]),
    ]);
  }

  function exportMonitorCsv(row: ReportRow) {
    downloadCsv(
      `informe-${getMonitorName(row.monitor).toLowerCase().replaceAll(" ", "-")}.csv`,
      [
        ["Campo", "Valor"],
        ["Monitor ID", String(row.monitor.id)],
        ["Monitor", getMonitorName(row.monitor)],
        ["Sección", row.sectionName],
        ["Tipo", row.monitor.type],
        ["URL", getMonitorUrl(row.monitor)],
        ["Estado", getStatusLabel(row.status)],
        ["SLA", row.slaMet ? "Cumplido" : "No cumplido"],
        ["Disponibilidad actual", `${row.uptime.toFixed(2)}%`],
        ["Disponibilidad anterior", `${row.previousUptime.toFixed(2)}%`],
        ["Tiempo medio actual", `${row.avgResponse} ms`],
        ["Tiempo medio anterior", `${row.previousAvgResponse} ms`],
        ["Incidencias actuales", String(row.incidents)],
        ["Incidencias anteriores", String(row.previousIncidents)],
        ["Health Score", String(row.healthScore)],
        ["Checks actuales", String(row.checks)],
        ["Checks anteriores", String(row.previousChecks)],
        ["Última caída", row.lastDowntimeLabel],
        ["IDs de incidencias", row.incidentIds.join(", ") || "-"],
      ],
    );
  }

  async function exportPdf() {
    try {
      const reportData: ReportPdfData = {
        companyName: "Monitoring TFG",
        diagnostics: [
          {
            label: "SLA cumplido",
            value:
              filteredRows.length > 0
                ? `${formatPercentValue((totals.monitorsInSla / filteredRows.length) * 100)} (${totals.monitorsInSla}/${filteredRows.length} monitores)`
                : "Sin datos",
          },
          {
            label: "Peor monitor",
            value: totals.worstMonitor
              ? `${getMonitorName(totals.worstMonitor.monitor)} (${formatPercentValue(totals.worstMonitor.uptime)})`
              : "Sin datos",
          },
          {
            label: "Sección más problemática",
            value:
              sectionIncidentSummary[0]?.[1] && sectionIncidentSummary[0][1] > 0
                ? `${sectionIncidentSummary[0][0]} (${formatIntegerValue(sectionIncidentSummary[0][1])} incidencias)`
                : "Sin incidencias relevantes",
          },
        ],
        executiveSummary,
        generatedAt: lastLoadedAt ?? new Date().toISOString(),
        kpis: [
          {
            label: "Disponibilidad media",
            value: formatPercentValue(totals.avgUptime),
          },
          {
            label: "Incidencias",
            value: formatIntegerValue(totals.incidentsCurrent),
          },
          {
            label: "Tiempo medio",
            value: formatLatencyValue(totals.avgResponse),
          },
          {
            label: "Health Score",
            value: `${formatIntegerValue(totals.avgHealthScore)}/100`,
          },
        ],
        rangeLabel: period.label,
        rows: filteredRows.map((row) => ({
          avgResponse: row.avgResponse,
          incidents: row.incidents,
          lastDowntimeLabel: row.lastDowntimeLabel,
          name: getMonitorName(row.monitor),
          status: getStatusLabel(row.status),
          uptime: row.uptime,
        })),
        title: "Informe operativo de monitorización",
      };

      await generateReportPDF(reportData);
    } catch (currentError) {
      console.error("Error exporting report PDF", currentError);
      window.alert("No se pudo generar el PDF del informe.");
    }
  }

  return (
    <main style={styles.main}>
      <style>
        {`
          .reports-hover-row {
            transition: background 160ms ease, transform 160ms ease;
          }

          .reports-hover-row:hover {
            background: #f8fbff;
          }

          .reports-action:hover {
            transform: translateY(-1px);
          }

          .reports-summary-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.95fr);
            gap: 16px;
          }

          .reports-analytics-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr) minmax(280px, 0.9fr);
            gap: 16px;
          }

          @media (max-width: 1180px) {
            .reports-summary-grid,
            .reports-analytics-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <AppTopbar
        title="Informes"
        subtitle="Visión ejecutiva de disponibilidad, incidencias, SLA y rendimiento para tus monitores."
        onRefresh={handleRefresh}
        cta={{ label: "Exportar CSV", onClick: exportGeneralCsv }}
      />

      <section style={styles.overviewCard}>
        <div style={styles.overviewCopy}>
          <div style={styles.overviewMetaRow}>
            <span style={styles.inlineMetaBadge}>{period.label}</span>
            <span style={styles.inlineMetaText}>
              Última sincronización {formatRelativeTime(lastLoadedAt)}
            </span>
            <span style={styles.inlineMetaText}>
              SLA objetivo {SLA_TARGET.toFixed(1)}%
            </span>
          </div>
          <p style={styles.overviewDescription}>
            Centro operativo con lectura ejecutiva del rendimiento y la
            disponibilidad de toda la plataforma.
          </p>
        </div>

        <div style={styles.overviewAside}>
          <HealthScoreRing score={totals.avgHealthScore} compact />
          <div style={styles.overviewAsideCopy}>
            <strong style={styles.overviewAsideTitle}>Health Score global</strong>
            <span style={styles.overviewAsideText}>
              {describeHealthScore(totals.avgHealthScore)}
            </span>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => void exportPdf()}>
            Exportar PDF
          </button>
        </div>
      </section>

      <section style={styles.filtersCard}>
        <div style={styles.filtersTitle}>
          <div style={styles.filtersTitleIcon}>
            <FilterIcon size={16} />
          </div>
          <div>
            <strong style={styles.filtersHeading}>Filtros operativos</strong>
            <p style={styles.filtersCopy}>
              Cruza servicio, tipo, SLA y rango sin salir de la vista ejecutiva.
            </p>
          </div>
        </div>

        <div style={styles.filtersGrid}>
          <label style={styles.filterGroup}>
            <span>Buscar</span>
            <input
              style={styles.input}
              placeholder="Buscar monitor, URL o sección..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label style={styles.filterGroup}>
            <span>Rango</span>
            <select
              style={styles.input}
              value={range}
              onChange={(event) => setRange(event.target.value as RangeFilter)}
            >
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
            </select>
          </label>

          <label style={styles.filterGroup}>
            <span>Estado</span>
            <select
              style={styles.input}
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
            >
              <option value="all">Todos</option>
              <option value="UP">Online</option>
              <option value="DOWN">Incidencia</option>
              <option value="PAUSED">Pausado</option>
              <option value="UNKNOWN">Desconocido</option>
            </select>
          </label>

          <label style={styles.filterGroup}>
            <span>Monitor</span>
            <select
              style={styles.input}
              value={selectedMonitor}
              onChange={(event) => setSelectedMonitor(event.target.value)}
            >
              <option value="all">Todos los monitores</option>
              {sortMonitorsByStatusAndLastCheck(monitors).map((monitor) => (
                <option key={monitor.id} value={monitor.id}>
                  {monitor.name}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.filterGroup}>
            <span>Sección</span>
            <select
              style={styles.input}
              value={selectedSection}
              onChange={(event) => setSelectedSection(event.target.value)}
            >
              <option value="all">Todas</option>
              {sectionOptions.map((sectionName) => (
                <option key={sectionName} value={sectionName}>
                  {sectionName}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.filterGroup}>
            <span>Tipo</span>
            <select
              style={styles.input}
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value as "all" | MonitorType)}
            >
              <option value="all">Todos</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.filterGroup}>
            <span>SLA</span>
            <select
              style={styles.input}
              value={slaFilter}
              onChange={(event) => setSlaFilter(event.target.value as SlaFilter)}
            >
              <option value="all">Todos</option>
              <option value="met">Cumplido</option>
              <option value="breached">No cumplido</option>
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <section style={styles.errorCard}>
          <strong>{error}</strong>
          <p>Intenta refrescar o revisar la conectividad con la API.</p>
        </section>
      ) : null}

      <section className="reports-summary-grid">
        <article style={styles.executiveCard}>
          <div style={styles.cardTop}>
            <div>
              <h2 style={styles.sectionTitle}>Resumen ejecutivo</h2>
              <p style={styles.sectionCopy}>
                Lectura automática del estado operativo y tendencia contra el periodo anterior.
              </p>
            </div>

            <span style={styles.executiveBadge}>{filteredRows.length} monitores</span>
          </div>

          {loading ? (
            <SkeletonBlock height={206} />
          ) : (
            <>
              <div style={styles.executiveSummary}>
                {executiveSummary.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div style={styles.executiveFacts}>
                <FactTile
                  label="Peor disponibilidad"
                  value={
                    totals.worstMonitor
                      ? `${getMonitorName(totals.worstMonitor.monitor)} · ${totals.worstMonitor.uptime.toFixed(2)}%`
                      : "Sin datos"
                  }
                  tone={totals.worstMonitor && totals.worstMonitor.uptime < 95 ? "danger" : "info"}
                />
                <FactTile
                  label="Tendencia"
                  value={
                    totals.trendIsReliable
                      ? describeTrend(comparisons.uptime, "disponibilidad")
                      : "datos insuficientes para tendencia fiable"
                  }
                  tone={getComparisonTone(comparisons.uptime, false)}
                />
                <FactTile
                  label="SLA"
                  value={`${totals.monitorsInSla}/${filteredRows.length || 0} en cumplimiento`}
                  tone={totals.slaBreached > 0 ? "warning" : "success"}
                />
              </div>
            </>
          )}
        </article>

        <aside style={styles.diagnosticCard}>
          <div style={styles.cardTop}>
            <div>
              <h2 style={styles.sectionTitle}>Diagnóstico</h2>
              <p style={styles.sectionCopy}>
                Señales rápidas para priorizar trabajo técnico y operativo.
              </p>
            </div>
          </div>

          {loading ? (
            <SkeletonBlock height={206} />
          ) : (
            <>
              <div style={styles.diagnosticLead}>
                <strong style={styles.diagnosticLeadTitle}>
                  {totals.trendIsReliable
                    ? "Lectura consistente del periodo"
                    : "Cobertura limitada para comparar tendencia"}
                </strong>
                <span style={styles.diagnosticLeadText}>
                  {totals.trendIsReliable
                    ? `Health Score ${totals.avgHealthScore}/100 con ${totals.totalChecks} checks reales consolidados.`
                    : `Solo ${totals.totalChecks} checks actuales y ${totals.totalPreviousChecks} previos con histórico comparable.`}
                </span>
              </div>

              <div style={styles.diagnosticList}>
                {diagnosticItems.map((item) => (
                  <div key={item.label} style={styles.diagnosticItem}>
                    <span style={styles.diagnosticLabel}>{item.label}</span>
                    <span style={getToneBadgeStyle(item.tone)}>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </section>

      <section style={styles.kpiGrid}>
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <SkeletonBlock key={index} height={116} />
            ))
          : summaryMetrics.map((metric) => (
              <KpiCard
                key={metric.title}
                icon={metric.icon}
                title={metric.title}
                value={metric.value}
                note={metric.note}
                tone={metric.tone}
              />
            ))}
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionTopRow}>
          <div>
            <h2 style={styles.sectionTitle}>Insights automáticos</h2>
            <p style={styles.sectionCopy}>
              Reglas operativas y lectura contextual sobre riesgo, ruido e impacto.
            </p>
          </div>
        </div>

        <div style={styles.insightsGrid}>
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={index} height={160} />
              ))
            : insights.map((insight) => (
                <InsightCard key={insight.title} insight={insight} />
              ))}
        </div>
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionTopRow}>
          <div>
            <h2 style={styles.sectionTitle}>Comparativa contra periodo anterior</h2>
            <p style={styles.sectionCopy}>
              KPI actual frente al tramo inmediatamente anterior del mismo tamaño.
            </p>
          </div>
        </div>

        <div style={styles.comparisonGrid}>
          {loading ? (
            <>
              <SkeletonBlock height={150} />
              <SkeletonBlock height={150} />
              <SkeletonBlock height={150} />
            </>
          ) : (
            <>
              <ComparisonCard
                label="Disponibilidad"
                metric={comparisons.uptime}
                suffix="%"
                lowerIsBetter={false}
              />
              <ComparisonCard
                label="Incidencias"
                metric={comparisons.incidents}
                lowerIsBetter
              />
              <ComparisonCard
                label="Tiempo medio"
                metric={comparisons.response}
                suffix=" ms"
                lowerIsBetter
              />
            </>
          )}
        </div>
      </section>

      <section className="reports-analytics-grid">
        <article style={styles.chartCardLarge}>
          <div style={styles.cardTop}>
            <div>
              <h2 style={styles.sectionTitle}>Evolución de disponibilidad</h2>
              <p style={styles.sectionCopy}>
                Promedio de uptime por tramo dentro del rango seleccionado.
              </p>
            </div>

            <span style={styles.softTag}>
              {availabilitySeries.length} puntos · rango {period.label}
            </span>
          </div>

          {loading ? (
            <SkeletonBlock height={252} />
          ) : (
            <MiniLineChart values={availabilitySeries} />
          )}
        </article>

        <article style={styles.chartCard}>
          <div style={styles.cardTop}>
            <div>
              <h2 style={styles.sectionTitle}>Distribución operativa</h2>
              <p style={styles.sectionCopy}>
                Reparto de monitores saludables, en vigilancia o críticos.
              </p>
            </div>
          </div>

          {loading ? (
            <SkeletonBlock height={252} />
          ) : (
            <DonutChart items={operationalDistribution} total={filteredRows.length} />
          )}
        </article>

      </section>

      <section style={styles.tableCard}>
        <div style={styles.tableTop}>
          <div>
            <h2 style={styles.sectionTitle}>Informe por monitor</h2>
            <p style={styles.sectionCopy}>
              Tabla accionable con estado, SLA, disponibilidad, latencia, incidencias y rutas rápidas.
            </p>
          </div>

          <span style={styles.resultBadge}>{filteredRows.length} resultados</span>
        </div>

        {loading ? (
          <div style={styles.skeletonList}>
            <SkeletonBlock height={72} />
            <SkeletonBlock height={72} />
            <SkeletonBlock height={72} />
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={styles.emptyState}>
            <strong>No hay datos para este filtro</strong>
            <p>Prueba otro rango, estado o una sección distinta.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Monitor</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>SLA</th>
                  <th style={styles.th}>Disponibilidad</th>
                  <th style={styles.th}>Tiempo medio</th>
                  <th style={styles.th}>Incidencias</th>
                  <th style={styles.th}>Health Score</th>
                  <th style={styles.thActions}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.monitor.id} className="reports-hover-row">
                    <td style={styles.td}>
                      <div style={styles.monitorCell}>
                        <div style={styles.monitorIcon}>
                          <GlobeIcon size={18} />
                        </div>

                        <div style={styles.monitorText}>
                          <div style={styles.monitorHeadline}>
                            <strong>{getMonitorName(row.monitor)}</strong>
                            <span style={styles.typeBadge}>{row.monitor.type}</span>
                          </div>
                          <span style={styles.monitorSubtext}>{getMonitorUrl(row.monitor)}</span>
                          <div style={styles.inlineMeta}>
                            <span style={styles.inlineMetaBadge}>{row.sectionName}</span>
                            <span style={styles.inlineMetaText}>
                              Última caída {row.lastDowntimeLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={getStatusStyle(row.status)}>
                        <span style={styles.badgeDot} />
                        {getStatusLabel(row.status)}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <span style={getSlaBadgeStyle(row.slaMet)}>
                        {row.slaMet ? "Cumplido" : "No cumplido"}
                      </span>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.metricCell}>
                        <strong>{row.uptime.toFixed(2)}%</strong>
                        <span style={getDeltaTextStyle(row.uptime, row.previousUptime, false)}>
                          {formatSignedValue(row.uptime - row.previousUptime, 2)} pts
                        </span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.metricCell}>
                        <strong>{row.avgResponse} ms</strong>
                        <span style={getDeltaTextStyle(row.avgResponse, row.previousAvgResponse, true)}>
                          {formatSignedValue(row.avgResponse - row.previousAvgResponse, 0)} ms
                        </span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.metricCell}>
                        <strong>{row.incidents}</strong>
                        <span style={getDeltaTextStyle(row.incidents, row.previousIncidents, true)}>
                          {formatSignedValue(row.incidents - row.previousIncidents, 0)}
                        </span>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={getHealthScoreBadgeStyle(row.healthScore)}>
                        {row.healthScore}
                      </span>
                    </td>

                    <td style={styles.tdActions}>
                      <div style={styles.tableActions}>
                        <button
                          type="button"
                          style={{
                            ...styles.iconActionButton,
                            ...(openActionMenuId === row.monitor.id
                              ? styles.iconActionButtonActive
                              : {}),
                          }}
                          aria-label={`Abrir acciones de ${getMonitorName(row.monitor)}`}
                          aria-expanded={openActionMenuId === row.monitor.id}
                          onClick={() =>
                            setOpenActionMenuId((currentId) =>
                              currentId === row.monitor.id ? null : row.monitor.id,
                            )
                          }
                        >
                          <MoreHorizontalIcon size={16} />
                        </button>

                        {openActionMenuId === row.monitor.id ? (
                          <div style={styles.actionMenu}>
                            <Link
                              to={`/monitors/${row.monitor.id}`}
                              className="reports-action"
                              style={styles.actionMenuLink}
                              onClick={() => setOpenActionMenuId(null)}
                            >
                              <GlobeIcon size={14} />
                              Ver detalle
                            </Link>

                            <button
                              type="button"
                              className="reports-action"
                              style={styles.actionMenuItem}
                              onClick={() => {
                                setOpenActionMenuId(null);
                                exportMonitorCsv(row);
                              }}
                            >
                              <ActivityIcon size={14} />
                              CSV monitor
                            </button>

                            <Link
                              to={`/incidents?monitor=${encodeURIComponent(getMonitorName(row.monitor))}`}
                              className="reports-action"
                              style={styles.actionMenuLinkPrimary}
                              onClick={() => setOpenActionMenuId(null)}
                            >
                              <AlertTriangleIcon size={14} />
                              Ver incidencias
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

async function loadReportPayload(): Promise<ReportPayload> {
  const monitorData = await getMonitors();
  const monitors = sortMonitorsByStatusAndLastCheck(
    Array.isArray(monitorData) ? monitorData : [],
  );
  const incidents = await getIncidents().catch(() => [] as Incident[]);
  const checksByMonitor: Record<number, MonitorCheck[]> = {};

  const checkResults = await Promise.allSettled(
    monitors.map(async (monitor) => ({
      checks: await getMonitorChecks(monitor.id),
      monitorId: monitor.id,
    })),
  );

  for (const result of checkResults) {
    if (result.status !== "fulfilled") continue;

    checksByMonitor[result.value.monitorId] = Array.isArray(result.value.checks)
      ? result.value.checks
      : [];
  }

  const sections = sanitizeSections(
    readSections(),
    monitors.map((monitor) => monitor.id),
  );

  return {
    checksByMonitor,
    incidents: Array.isArray(incidents) ? incidents : [],
    loadedAt: new Date().toISOString(),
    monitors,
    sections,
  };
}

function buildReportRow({
  checks,
  incidentPool,
  monitor,
  period,
  sectionName,
}: {
  checks: MonitorCheck[];
  incidentPool: Incident[];
  monitor: Monitor;
  period: ReturnType<typeof getPeriodWindow>;
  sectionName: string;
}): ReportRow {
  const currentChecks = checks.filter((check) => isDateWithinRange(check.checkedAt, period.currentStart, period.currentEnd));
  const previousChecks = checks.filter((check) =>
    isDateWithinRange(check.checkedAt, period.previousStart, period.currentStart),
  );
  const currentIncidents = incidentPool.filter((incident) =>
    isDateWithinRange(incident.startedAt, period.currentStart, period.currentEnd),
  );
  const previousIncidents = incidentPool.filter((incident) =>
    isDateWithinRange(incident.startedAt, period.previousStart, period.currentStart),
  );
  const currentSummary = summarizeChecks(currentChecks);
  const previousSummary = summarizeChecks(previousChecks);
  const currentFallbackStatus = getFallbackStatusUptime(monitor);
  const previousFallbackStatus = getPreviousFallbackStatusUptime(
    monitor,
    currentFallbackStatus,
    currentIncidents.length,
    previousIncidents.length,
  );
  const currentUptime = currentSummary.uptime ?? currentFallbackStatus;
  const previousUptime = previousSummary.uptime ?? previousFallbackStatus;
  const currentAvgResponse =
    currentSummary.avgResponse ??
    monitor.lastResponseTime ??
    getFallbackResponseTime(monitor, currentIncidents.length);
  const previousAvgResponse =
    previousSummary.avgResponse ??
    getPreviousFallbackResponseTime(
      currentAvgResponse,
      currentIncidents.length,
      previousIncidents.length,
      monitor,
    );
  const lastDowntimeAt =
    currentSummary.latestDownAt ??
    currentIncidents[0]?.startedAt ??
    previousSummary.latestDownAt ??
    null;
  const status = getMonitorReportStatus(monitor);
  const latestCheckAt = getLatestMonitorCheckAt(checks) ?? monitor.lastCheckedAt ?? null;
  const healthScore = calculateHealthScore(
    currentUptime,
    currentIncidents.length,
    currentAvgResponse,
  );
  const uptimeSampleChecks = currentSummary.total > 0 ? currentSummary.total : 1;
  const uptimeSampleUpChecks =
    currentSummary.total > 0
      ? currentSummary.upChecks
      : currentFallbackStatus >= 99.5
        ? 1
        : 0;
  const previousUptimeSampleChecks = previousSummary.total > 0 ? previousSummary.total : 1;
  const previousUptimeSampleUpChecks =
    previousSummary.total > 0
      ? previousSummary.upChecks
      : previousFallbackStatus >= 99.5
        ? 1
        : 0;

  return {
    avgResponse: safeInteger(currentAvgResponse),
    checks: currentSummary.total,
    healthScore,
    incidentIds: currentIncidents.map((incident) => incident.id),
    incidents: currentIncidents.length,
    lastDowntimeAt,
    lastDowntimeLabel: lastDowntimeAt ? formatRelativeTime(lastDowntimeAt) : "Sin caídas recientes",
    latestCheckAt,
    monitor,
    previousAvgResponse: safeInteger(previousAvgResponse),
    previousChecks: previousSummary.total,
    previousIncidents: previousIncidents.length,
    previousUptime,
    previousUptimeSampleChecks,
    previousUptimeSampleUpChecks,
    previousUptimeSource: previousSummary.uptime !== null ? "checks" : "fallback",
    previousUpChecks: previousSummary.upChecks,
    sectionName,
    slaMet: currentUptime >= SLA_TARGET,
    status,
    upChecks: currentSummary.upChecks,
    uptime: currentUptime,
    uptimeSampleChecks,
    uptimeSampleUpChecks,
    uptimeSource: currentSummary.uptime !== null ? "checks" : "fallback",
  };
}

function summarizeChecks(checks: MonitorCheck[]) {
  if (checks.length === 0) {
    return {
      avgResponse: null as number | null,
      latestDownAt: null as string | null,
      total: 0,
      upChecks: 0,
      uptime: null as number | null,
    };
  }

  const upChecks = checks.filter((check) => check.status === "UP").length;
  const responseTimes = checks
    .map((check) => check.responseTimeMs)
    .filter((value): value is number => typeof value === "number");
  const latestDownAt =
    checks.find((check) => check.status === "DOWN")?.checkedAt ?? null;

  return {
    avgResponse:
      responseTimes.length > 0
        ? safeDivide(
            responseTimes.reduce((sum, value) => sum + value, 0),
            responseTimes.length,
          )
        : null,
    latestDownAt,
    total: checks.length,
    upChecks,
    uptime: safePercentageFromCounts(upChecks, checks.length),
  };
}

function getLatestMonitorCheckAt(checks: MonitorCheck[]) {
  let latestTimestamp = Number.NEGATIVE_INFINITY;
  let latestCheckAt: string | null = null;

  for (const check of checks) {
    const timestamp = new Date(check.checkedAt).getTime();

    if (Number.isFinite(timestamp) && timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
      latestCheckAt = check.checkedAt;
    }
  }

  return latestCheckAt;
}

function buildAvailabilitySeries(
  rows: ReportRow[],
  checksByMonitor: Record<number, MonitorCheck[]>,
  period: ReturnType<typeof getPeriodWindow>,
) {
  const bucketCount = period.range === "24h" ? 8 : 12;
  const bucketSize = (period.currentEnd - period.currentStart) / bucketCount;

  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = period.currentStart + bucketSize * index;
    const bucketEnd =
      index === bucketCount - 1
        ? period.currentEnd
        : period.currentStart + bucketSize * (index + 1);

    const bucketChecks = rows.flatMap((row) =>
      (checksByMonitor[row.monitor.id] ?? []).filter((check) =>
        isDateWithinRange(check.checkedAt, bucketStart, bucketEnd),
      ),
    );

    if (bucketChecks.length === 0) {
      const anchor = rows.length > 0
        ? rows.reduce((sum, row) => sum + row.uptime, 0) / rows.length
        : 99;

      return clamp(anchor - (index % 3) * 0.35, 88, 100);
    }

    const upChecks = bucketChecks.filter((check) => check.status === "UP").length;
    return Number(((upChecks / bucketChecks.length) * 100).toFixed(2));
  });
}

function createComparisonMetric(
  current: number,
  previous: number,
  lowerIsBetter: boolean,
): ComparisonMetric {
  const safeCurrent = safeNumber(current);
  const safePrevious = safeNumber(previous);
  const delta = roundValue(safeCurrent - safePrevious, 2);

  if (Math.abs(delta) < 0.01) {
    return {
      current: safeCurrent,
      delta,
      direction: "flat",
      previous: safePrevious,
    };
  }

  const improved = lowerIsBetter ? delta < 0 : delta > 0;

  return {
    current: safeCurrent,
    delta,
    direction: improved ? "up" : "down",
    previous: safePrevious,
  };
}

function calculateHealthScore(uptime: number, incidents: number, avgResponse: number) {
  const safeUptime = safePercentage(uptime);
  const safeIncidents = Math.max(0, safeInteger(incidents));
  const safeLatency = Math.max(0, safeNumber(avgResponse));
  const incidentPenalty = Math.min(safeIncidents * 1.5, 14);
  const latencyPenalty =
    safeLatency <= 250
      ? 0
      : safeLatency <= 400
        ? 2
        : safeLatency <= 700
          ? 5
          : safeLatency <= 1000
            ? 9
            : 13;

  return clamp(safeInteger(safeUptime - incidentPenalty - latencyPenalty), 0, 100);
}

function getPeriodWindow(range: RangeFilter) {
  const now = Date.now();
  const durationMs =
    range === "24h"
      ? 24 * 60 * 60 * 1000
      : range === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

  return {
    currentEnd: now,
    currentStart: now - durationMs,
    label:
      range === "24h"
        ? "Últimas 24 horas"
        : range === "7d"
          ? "Últimos 7 días"
          : "Últimos 30 días",
    previousStart: now - durationMs * 2,
    range,
  };
}

function isDateWithinRange(
  value: string | undefined | null,
  start: number,
  end: number,
) {
  if (!value) return false;

  const time = new Date(value).getTime();
  return time >= start && time < end;
}

function getMonitorName(monitor: Monitor) {
  return monitor.name || "Monitor sin nombre";
}

function getMonitorUrl(monitor: Monitor) {
  return monitor.target || "-";
}

function getMonitorReportStatus(monitor: Monitor): StatusFilter {
  if (monitor.isActive === false) return "PAUSED";
  if (monitor.currentStatus === "UP") return "UP";
  if (monitor.currentStatus === "DOWN") return "DOWN";
  return "UNKNOWN";
}

function getStatusLabel(status?: string) {
  if (status === "UP") return "Online";
  if (status === "DOWN") return "Incidencia";
  if (status === "PAUSED") return "Pausado";
  if (status === "UNKNOWN") return "Desconocido";
  if (status === "all") return "Todos";
  return "Pendiente";
}

function getStatusStyle(status?: string): CSSProperties {
  const base: CSSProperties = {
    ...badgeBase,
    gap: 6,
  };

  if (status === "UP") return { ...base, ...toneStyles.green };
  if (status === "DOWN") return { ...base, ...toneStyles.red };
  if (status === "PAUSED") return { ...base, ...toneStyles.blue };
  return { ...base, ...toneStyles.slate };
}

function getSlaBadgeStyle(slaMet: boolean): CSSProperties {
  return {
    ...badgeBase,
    ...(slaMet ? toneStyles.green : toneStyles.orange),
  };
}

function getHealthScoreBadgeStyle(score: number): CSSProperties {
  return {
    ...badgeBase,
    ...(score >= 85
      ? toneStyles.green
      : score >= 70
        ? toneStyles.orange
        : toneStyles.red),
  };
}

function getToneBadgeStyle(tone: InsightTone): CSSProperties {
  return {
    ...badgeBase,
    ...(tone === "success"
      ? toneStyles.green
      : tone === "warning"
        ? toneStyles.orange
        : tone === "danger"
          ? toneStyles.red
          : toneStyles.blue),
  };
}

function getComparisonTone(
  metric: ComparisonMetric,
  lowerIsBetter: boolean,
): "success" | "warning" | "danger" | "info" {
  if (metric.direction === "flat") return "info";
  const improved = lowerIsBetter ? metric.delta < 0 : metric.delta > 0;
  return improved ? "success" : lowerIsBetter ? "danger" : "warning";
}

function describeHealthScore(score: number) {
  if (score >= 90) return "Estado excelente y estable";
  if (score >= 80) return "Salud sólida con margen";
  if (score >= 70) return "Necesita vigilancia";
  return "Riesgo operativo elevado";
}

function describeTrend(metric: ComparisonMetric, label: string) {
  if (metric.direction === "flat") {
    return `${label} estable respecto al periodo anterior`;
  }

  if (metric.direction === "up") {
    return `${label} mejora ${Math.abs(metric.delta).toFixed(2)} puntos`;
  }

  return `${label} empeora ${Math.abs(metric.delta).toFixed(2)} puntos`;
}

function formatComparisonNote(metric: ComparisonMetric, suffix: string) {
  if (metric.direction === "flat") {
    return "Sin cambios relevantes vs periodo anterior";
  }

  return `${metric.delta > 0 ? "+" : ""}${metric.delta.toFixed(
    Math.abs(metric.delta) >= 10 ? 1 : 2,
  )}${suffix} vs periodo anterior`;
}

function formatSignedValue(value: number, decimals: number) {
  const safeValue = roundValue(value, decimals);
  return `${safeValue > 0 ? "+" : ""}${safeValue.toFixed(decimals)}`;
}

function getDeltaTextStyle(
  current: number,
  previous: number,
  lowerIsBetter: boolean,
): CSSProperties {
  const delta = safeNumber(current) - safeNumber(previous);

  if (Math.abs(delta) < 0.01) {
    return styles.deltaNeutral;
  }

  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return improved ? styles.deltaPositive : styles.deltaNegative;
}

function getFallbackStatusUptime(monitor: Monitor) {
  if (monitor.isActive === false) return 0;
  if (monitor.currentStatus === "UP") return 100;
  if (monitor.currentStatus === "DOWN") return 0;
  return 0;
}

function getPreviousFallbackStatusUptime(
  monitor: Monitor,
  currentFallback: number,
  currentIncidents: number,
  previousIncidents: number,
) {
  const incidentDelta = previousIncidents - currentIncidents;
  const adjusted =
    currentFallback +
    (incidentDelta > 0 ? -2 : incidentDelta < 0 ? 2 : 0) +
    (monitor.currentStatus === "DOWN" ? -6 : 0);

  return safePercentage(adjusted);
}

function getFallbackResponseTime(monitor: Monitor, incidents: number) {
  if (monitor.currentStatus === "DOWN") {
    return 760 + incidents * 30;
  }

  if (monitor.currentStatus === "UNKNOWN") {
    return 420 + incidents * 15;
  }

  return 180 + incidents * 16;
}

function getPreviousFallbackResponseTime(
  currentAvgResponse: number,
  currentIncidents: number,
  previousIncidents: number,
  monitor: Monitor,
) {
  const base = safeNumber(currentAvgResponse);
  const incidentAdjustment = (previousIncidents - currentIncidents) * 18;
  const statusAdjustment = monitor.currentStatus === "DOWN" ? -36 : -12;

  return Math.max(80, roundValue(base + incidentAdjustment + statusAdjustment, 0));
}

function describeLowUptimeCause({
  avgResponse,
  incidents,
  worstMonitor,
}: {
  avgResponse: number;
  incidents: number;
  worstMonitor: ReportRow | null;
}) {
  if (worstMonitor?.status === "DOWN") {
    return `caídas concentradas en ${getMonitorName(worstMonitor.monitor)}`;
  }

  if (incidents >= 5) {
    return "acumulación de incidencias durante el periodo";
  }

  if (avgResponse > 700) {
    return "latencia degradada sostenida";
  }

  if (worstMonitor && worstMonitor.uptimeSource === "fallback") {
    return "poco histórico de checks y dependencia del estado actual";
  }

  return "inestabilidad puntual en monitores con menor disponibilidad";
}

function safeNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function safeInteger(value: number, fallback = 0) {
  return Math.round(safeNumber(value, fallback));
}

function roundValue(value: number, decimals: number) {
  const safeValue = safeNumber(value);
  const factor = 10 ** decimals;
  return Math.round(safeValue * factor) / factor;
}

function safeDivide(numerator: number, denominator: number, fallback = 0) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return fallback;
  }

  return numerator / denominator;
}

function safePercentage(value: number) {
  return clamp(roundValue(value, 2), 0, 100);
}

function safePercentageFromCounts(up: number, total: number) {
  return safePercentage(safeDivide(up, total, 0) * 100);
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Sin datos";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "ahora";
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  return `hace ${diffDays} días`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function generateReportPDF(reportData: ReportPdfData) {
  const [{ default: autoTable }, { jsPDF }] = await Promise.all([
    import("jspdf-autotable"),
    import("jspdf"),
  ]);
  const doc = new jsPDF({
    format: "a4",
    unit: "pt",
  });
  const colors = {
    blue: [37, 99, 235] as PdfRgb,
    blueSoft: [239, 246, 255] as PdfRgb,
    border: [226, 232, 240] as PdfRgb,
    slate: [71, 85, 105] as PdfRgb,
    text: [15, 23, 42] as PdfRgb,
    white: [255, 255, 255] as PdfRgb,
  };
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 42;
  const footerHeight = 34;
  const contentWidth = pageWidth - marginX * 2;
  const kpiCardWidth = (contentWidth - 12) / 2;
  const tableRows = reportData.rows.length > 0
    ? reportData.rows.map((row) => [
        row.name,
        row.status,
        formatPercentValue(row.uptime),
        formatLatencyValue(row.avgResponse),
        formatIntegerValue(row.incidents),
        row.lastDowntimeLabel || "Sin datos",
      ])
    : [["Sin datos", "-", "-", "-", "-", "-"]];

  let cursorY = 42;

  doc.setFillColor(...colors.blueSoft);
  doc.roundedRect(marginX, cursorY, contentWidth, 88, 18, 18, "F");

  doc.setFillColor(...colors.blue);
  doc.roundedRect(marginX + 18, cursorY + 18, 42, 42, 12, 12, "F");
  doc.setTextColor(...colors.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("MT", marginX + 39, cursorY + 45, { align: "center" });

  doc.setTextColor(...colors.text);
  doc.setFontSize(18);
  doc.text(reportData.companyName || "Monitoring TFG", marginX + 76, cursorY + 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...colors.slate);
  doc.text("Informe ejecutivo para clientes y dirección", marginX + 76, cursorY + 49);
  doc.text(
    `Fecha del informe: ${formatPdfDate(reportData.generatedAt)}`,
    pageWidth - marginX - 12,
    cursorY + 32,
    { align: "right" },
  );
  doc.text(
    `Rango seleccionado: ${reportData.rangeLabel || "Sin rango"}`,
    pageWidth - marginX - 12,
    cursorY + 49,
    { align: "right" },
  );

  cursorY += 114;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  doc.setTextColor(...colors.text);
  doc.text(reportData.title || "Informe operativo de monitorización", marginX, cursorY);
  cursorY += 28;

  cursorY = drawPdfSectionTitle(doc, "Resumen ejecutivo", marginX, cursorY, colors);
  const summaryLines = (reportData.executiveSummary.length > 0
    ? reportData.executiveSummary
    : ["Sin resumen ejecutivo disponible."]).flatMap((line) =>
    doc.splitTextToSize(line, contentWidth - 34),
  );
  const summaryHeight = Math.max(74, summaryLines.length * 15 + 28);
  cursorY = ensurePdfSpace(doc, cursorY, summaryHeight, marginX, footerHeight);
  doc.setFillColor(...colors.white);
  doc.setDrawColor(...colors.border);
  doc.roundedRect(marginX, cursorY, contentWidth, summaryHeight, 16, 16, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...colors.slate);
  let summaryY = cursorY + 24;
  for (const line of summaryLines) {
    doc.text(line, marginX + 18, summaryY);
    summaryY += 15;
  }
  cursorY += summaryHeight + 22;

  cursorY = drawPdfSectionTitle(doc, "KPIs", marginX, cursorY, colors);
  cursorY = ensurePdfSpace(doc, cursorY, 176, marginX, footerHeight);
  reportData.kpis.slice(0, 4).forEach((item, index) => {
    const rowIndex = Math.floor(index / 2);
    const columnIndex = index % 2;
    const cardX = marginX + columnIndex * (kpiCardWidth + 12);
    const cardY = cursorY + rowIndex * 82;
    const isHealthScore = item.label === "Health Score";

    doc.setFillColor(...(isHealthScore ? colors.blue : colors.white));
    doc.setDrawColor(...colors.border);
    doc.roundedRect(cardX, cardY, kpiCardWidth, 70, 14, 14, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...(isHealthScore ? colors.white : colors.slate));
    doc.text(item.label, cardX + 16, cardY + 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...(isHealthScore ? colors.white : colors.text));
    doc.text(item.value, cardX + 16, cardY + 47);
  });
  cursorY += 176;

  cursorY = drawPdfSectionTitle(doc, "Diagnóstico", marginX, cursorY, colors);
  const diagnostics = reportData.diagnostics.length > 0
    ? reportData.diagnostics
    : [{ label: "Diagnóstico", value: "Sin datos disponibles" }];
  const diagnosticHeight = diagnostics.length * 34 + 26;
  cursorY = ensurePdfSpace(doc, cursorY, diagnosticHeight, marginX, footerHeight);
  doc.setFillColor(...colors.white);
  doc.setDrawColor(...colors.border);
  doc.roundedRect(marginX, cursorY, contentWidth, diagnosticHeight, 16, 16, "FD");

  let diagnosticY = cursorY + 22;
  diagnostics.forEach((item, index) => {
    if (index > 0) {
      doc.setDrawColor(...colors.border);
      doc.line(marginX + 18, diagnosticY - 12, pageWidth - marginX - 18, diagnosticY - 12);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.text);
    doc.text(item.label, marginX + 18, diagnosticY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...colors.slate);
    const wrappedValue = doc.splitTextToSize(item.value || "-", contentWidth - 170);
    doc.text(wrappedValue, marginX + 160, diagnosticY);
    diagnosticY += Math.max(22, wrappedValue.length * 13 + 10);
  });
  cursorY += diagnosticHeight + 22;

  cursorY = drawPdfSectionTitle(doc, "Tabla de monitores", marginX, cursorY, colors);
  autoTable(doc, {
    body: tableRows,
    head: [[
      "Nombre",
      "Estado",
      "Disponibilidad",
      "Tiempo medio",
      "Incidencias",
      "Última caída",
    ]],
    margin: { left: marginX, right: marginX },
    startY: cursorY,
    styles: {
      cellPadding: 8,
      font: "helvetica",
      fontSize: 9,
      lineColor: colors.border,
      lineWidth: 0.6,
      textColor: colors.text,
      valign: "middle",
    },
    headStyles: {
      fillColor: colors.blueSoft,
      fontStyle: "bold",
      textColor: colors.blue,
    },
    bodyStyles: {
      fillColor: colors.white,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 138 },
      1: { cellWidth: 76 },
      2: { cellWidth: 88 },
      3: { cellWidth: 84 },
      4: { cellWidth: 66 },
      5: { cellWidth: 96 },
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(...colors.border);
    doc.line(marginX, pageHeight - footerHeight, pageWidth - marginX, pageHeight - footerHeight);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...colors.slate);
    doc.text(
      "Generado automáticamente por Monitoring TFG",
      marginX,
      pageHeight - 14,
    );
    doc.text(
      `Página ${pageNumber}/${totalPages}`,
      pageWidth - marginX,
      pageHeight - 14,
      { align: "right" },
    );
  }

  doc.save(`informe-monitoring-tfg-${formatPdfFileDate(reportData.generatedAt)}.pdf`);
}

function drawPdfSectionTitle(
  doc: any,
  title: string,
  marginX: number,
  cursorY: number,
  colors: {
    border: PdfRgb;
    text: PdfRgb;
  },
) {
  doc.setDrawColor(...colors.border);
  doc.line(marginX, cursorY + 8, marginX + 26, cursorY + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...colors.text);
  doc.text(title, marginX + 34, cursorY + 12);
  return cursorY + 28;
}

function ensurePdfSpace(
  doc: {
    addPage: () => void;
    internal: { pageSize: { getHeight: () => number } };
  },
  cursorY: number,
  blockHeight: number,
  marginX: number,
  footerHeight: number,
) {
  const maxY = doc.internal.pageSize.getHeight() - footerHeight - 26;

  if (cursorY + blockHeight <= maxY) {
    return cursorY;
  }

  doc.addPage();
  return marginX;
}

function formatPdfDate(value?: string | null) {
  if (!value) return formatPdfDate(new Date().toISOString());

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
  }).format(new Date(value));
}

function formatPdfFileDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatIntegerValue(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 0,
  }).format(safeNumber(value));
}

function formatPercentValue(value: number) {
  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(safePercentage(value))}%`;
}

function formatLatencyValue(value: number) {
  return `${formatIntegerValue(value)} ms`;
}

function KpiCard({
  icon,
  note,
  title,
  tone,
  value,
}: {
  icon: ReactNode;
  note: string;
  title: string;
  tone: "success" | "warning" | "danger" | "info";
  value: string | number;
}) {
  const colors = {
    danger: uiTheme.colors.danger,
    info: uiTheme.colors.primary,
    success: uiTheme.colors.success,
    warning: uiTheme.colors.warning,
  };
  const softColors = {
    danger: uiTheme.colors.dangerSoft,
    info: uiTheme.colors.primarySoft,
    success: uiTheme.colors.successSoft,
    warning: uiTheme.colors.warningSoft,
  };

  return (
    <article style={styles.kpiCard}>
      <div style={{ ...styles.kpiIcon, background: softColors[tone], color: colors[tone] }}>
        {icon}
      </div>

      <div style={styles.kpiCopy}>
        <p style={styles.kpiTitle}>{title}</p>
        <strong style={{ ...styles.kpiValue, color: colors[tone] }}>{value}</strong>
        <span style={styles.kpiNote}>{note}</span>
      </div>
    </article>
  );
}

function FactTile({
  label,
  tone,
  value,
}: {
  label: string;
  tone: InsightTone;
  value: string;
}) {
  return (
    <div style={styles.factTile}>
      <span style={styles.factLabel}>{label}</span>
      <strong style={styles.factValue}>{value}</strong>
      <span style={getToneBadgeStyle(tone)}>{label}</span>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const tones = {
    danger: {
      badge: toneStyles.red,
      border: uiTheme.colors.dangerSoft,
      icon: uiTheme.colors.danger,
      shadow: "0 18px 36px rgba(239, 68, 68, 0.10)",
    },
    info: {
      badge: toneStyles.blue,
      border: uiTheme.colors.primarySoft,
      icon: uiTheme.colors.primary,
      shadow: "0 18px 36px rgba(37, 99, 235, 0.10)",
    },
    success: {
      badge: toneStyles.green,
      border: uiTheme.colors.successSoft,
      icon: uiTheme.colors.success,
      shadow: "0 18px 36px rgba(16, 185, 129, 0.10)",
    },
    warning: {
      badge: toneStyles.orange,
      border: uiTheme.colors.warningSoft,
      icon: uiTheme.colors.warning,
      shadow: "0 18px 36px rgba(245, 158, 11, 0.10)",
    },
  } as const;
  const tone = tones[insight.tone];

  return (
    <article
      style={{
        ...styles.insightCard,
        borderColor: tone.border,
        boxShadow: tone.shadow,
      }}
    >
      <div style={styles.insightTop}>
        <div style={{ ...styles.insightIcon, color: tone.icon, background: tone.border }}>
          {insight.icon}
        </div>
        <span style={{ ...badgeBase, ...tone.badge }}>{insight.label}</span>
      </div>

      <h3 style={styles.insightTitle}>{insight.title}</h3>
      <p style={styles.insightDescription}>{insight.description}</p>
    </article>
  );
}

function ComparisonCard({
  label,
  lowerIsBetter = false,
  metric,
  suffix = "",
}: {
  label: string;
  lowerIsBetter?: boolean;
  metric: ComparisonMetric;
  suffix?: string;
}) {
  const tone = getComparisonTone(metric, lowerIsBetter);
  const badgeStyle = getToneBadgeStyle(tone);

  return (
    <article style={styles.comparisonCard}>
      <div style={styles.comparisonTop}>
        <div>
          <p style={styles.comparisonLabel}>{label}</p>
          <strong style={styles.comparisonValue}>
            {metric.current.toFixed(suffix ? 2 : 0)}
            {suffix}
          </strong>
        </div>

        <span style={badgeStyle}>
          {metric.direction === "flat" ? "estable" : metric.direction === "up" ? "mejora" : "retroceso"}
        </span>
      </div>

      <div style={styles.comparisonMeta}>
        <span>Anterior: {metric.previous.toFixed(suffix ? 2 : 0)}{suffix}</span>
        <span>Delta: {formatSignedValue(metric.delta, 2)}{suffix}</span>
      </div>
    </article>
  );
}

function HealthScoreRing({
  compact = false,
  score,
}: {
  compact?: boolean;
  score: number;
}) {
  const color =
    score >= 85
      ? uiTheme.colors.success
      : score >= 70
        ? uiTheme.colors.warning
        : uiTheme.colors.danger;
  const size = compact ? 96 : 118;
  const innerSize = compact ? 68 : 84;

  return (
    <div
      style={{
        ...styles.healthRing,
        width: size,
        height: size,
        background: `conic-gradient(${color} 0 ${score}%, ${uiTheme.colors.surfaceSoft} ${score}% 100%)`,
      }}
    >
      <div style={{ ...styles.healthRingInner, width: innerSize, height: innerSize }}>
        <strong style={compact ? styles.healthRingValueCompact : styles.healthRingValue}>
          {score}
        </strong>
        <span style={styles.healthRingLabel}>/100</span>
      </div>
    </div>
  );
}

function MiniLineChart({ values }: { values: number[] }) {
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const normalized = clamp((value - 88) / 12, 0, 1);
      const y = 88 - normalized * 72;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={styles.lineChartWrap}>
      <svg viewBox="0 0 100 88" preserveAspectRatio="none" style={styles.lineChart}>
        <defs>
          <linearGradient id="availabilityFillReportsPremium" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {[18, 36, 54, 72].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="100"
            y2={y}
            stroke={uiTheme.colors.border}
            strokeDasharray="1.8 3"
          />
        ))}

        <polyline points={`0,88 ${points} 100,88`} fill="url(#availabilityFillReportsPremium)" />
        <polyline
          points={points}
          fill="none"
          stroke={uiTheme.colors.primary}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div style={styles.xAxis}>
        {values.map((_, index) => (
          <span key={index}>T{index + 1}</span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({
  items,
  total,
}: {
  items: Array<{ color: string; label: string; value: number }>;
  total: number;
}) {
  const gradient = buildConicGradient(items, total);

  return (
    <div style={styles.donutWrap}>
      <div style={{ ...styles.donutRing, background: gradient }}>
        <div style={styles.donutCenter}>
          <strong>{total}</strong>
          <span>monitores</span>
        </div>
      </div>

      <div style={styles.legend}>
        {items.map((item) => (
          <div key={item.label} style={styles.legendRow}>
            <span style={{ ...styles.legendDot, background: item.color }} />
            <div style={styles.legendCopy}>
              <p>{item.label}</p>
              <span>{item.value} activos</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildConicGradient(
  items: Array<{ color: string; value: number }>,
  total: number,
) {
  if (total <= 0) {
    return `conic-gradient(${uiTheme.colors.surfaceSoft} 0 100%)`;
  }

  let cursor = 0;
  const parts: string[] = [];

  for (const item of items) {
    const size = (item.value / total) * 100;
    const nextCursor = cursor + size;
    parts.push(`${item.color} ${cursor}% ${nextCursor}%`);
    cursor = nextCursor;
  }

  return `conic-gradient(${parts.join(", ")})`;
}

function SkeletonBlock({ height }: { height: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: 18,
        background: "linear-gradient(90deg, #eff6ff, #f8fafc, #eff6ff)",
      }}
    />
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const styles: Record<string, CSSProperties> = {
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    background: "currentColor",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  chartCard: {
    ...surfaceCard,
    padding: 22,
    minHeight: 320,
    borderRadius: 20,
  },
  chartCardLarge: {
    ...surfaceCard,
    padding: 22,
    minHeight: 320,
    borderRadius: 20,
  },
  comparisonCard: {
    ...surfaceCard,
    padding: 20,
    display: "grid",
    gap: 16,
    borderRadius: 20,
  },
  comparisonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 16,
  },
  comparisonLabel: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: uiTheme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  comparisonMeta: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  comparisonTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  comparisonValue: {
    display: "block",
    marginTop: 8,
    fontSize: 28,
    fontWeight: 700,
    color: uiTheme.colors.text,
  },
  deltaNegative: {
    color: uiTheme.colors.danger,
    fontSize: 12,
  },
  deltaNeutral: {
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  deltaPositive: {
    color: uiTheme.colors.success,
    fontSize: 12,
  },
  diagnosticCard: {
    ...surfaceCard,
    padding: 22,
    display: "grid",
    gap: 20,
    borderRadius: 20,
  },
  diagnosticItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  diagnosticLead: {
    display: "grid",
    gap: 8,
    padding: 16,
    borderRadius: 18,
    background: uiTheme.colors.surfaceSoft,
  },
  diagnosticLeadText: {
    color: uiTheme.colors.muted,
    fontSize: 13,
    lineHeight: 1.55,
  },
  diagnosticLeadTitle: {
    color: uiTheme.colors.text,
    fontSize: 15,
  },
  diagnosticLabel: {
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  diagnosticList: {
    display: "grid",
    gap: 14,
  },
  diagnosticScore: {
    display: "flex",
    gap: 16,
    alignItems: "center",
  },
  diagnosticScoreCopy: {
    display: "grid",
    gap: 6,
  },
  diagnosticScoreLabel: {
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  diagnosticScoreValue: {
    fontSize: 24,
    fontWeight: 700,
    color: uiTheme.colors.text,
  },
  donutCenter: {
    width: 86,
    height: 86,
    borderRadius: "50%",
    background: uiTheme.colors.surface,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
  },
  donutRing: {
    width: 148,
    height: 148,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 22px 48px rgba(15, 23, 42, 0.10)",
    flexShrink: 0,
  },
  donutWrap: {
    display: "flex",
    gap: 20,
    alignItems: "center",
    marginTop: 22,
    flexWrap: "wrap",
  },
  emptyPanel: {
    marginTop: 26,
    borderRadius: 16,
    padding: 20,
    background: uiTheme.colors.surfaceSoft,
    color: uiTheme.colors.muted,
    textAlign: "center",
  },
  emptyState: {
    margin: 24,
    padding: 40,
    borderRadius: 20,
    background: uiTheme.colors.surfaceSoft,
    border: `1px dashed ${uiTheme.colors.border}`,
    textAlign: "center",
    color: uiTheme.colors.muted,
  },
  errorCard: {
    ...surfaceCard,
    padding: 18,
    borderColor: uiTheme.colors.dangerSoft,
    color: uiTheme.colors.danger,
    background: uiTheme.colors.dangerSoft,
  },
  executiveBadge: {
    ...badgeBase,
    ...toneStyles.blue,
  },
  executiveCard: {
    ...surfaceCard,
    padding: 22,
    display: "grid",
    gap: 20,
  },
  executiveFacts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  executiveSummary: {
    display: "grid",
    gap: 12,
    color: uiTheme.colors.text,
    lineHeight: 1.65,
  },
  factLabel: {
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  factTile: {
    borderRadius: 18,
    border: `1px solid ${uiTheme.colors.border}`,
    padding: 16,
    display: "grid",
    gap: 8,
  },
  factValue: {
    color: uiTheme.colors.text,
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.5,
  },
  filterGroup: {
    ...filterGroupBase,
    gap: 8,
    minWidth: 0,
  },
  filtersCard: {
    ...surfaceCard,
    padding: 20,
    display: "grid",
    gap: 18,
  },
  filtersCopy: {
    margin: "4px 0 0",
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  filtersHeading: {
    fontSize: 14,
    color: uiTheme.colors.text,
  },
  filtersTitle: {
    display: "flex",
    gap: 14,
    alignItems: "center",
  },
  filtersTitleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  ghostButton: {
    ...secondaryButtonBase,
    minHeight: 34,
    padding: "0 12px",
    whiteSpace: "nowrap",
    borderRadius: uiTheme.radii.sm,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  healthRing: {
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    flexShrink: 0,
  },
  healthRingInner: {
    borderRadius: "50%",
    background: uiTheme.colors.surface,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
  },
  healthRingLabel: {
    fontSize: 12,
    color: uiTheme.colors.muted,
  },
  healthRingValue: {
    fontSize: 30,
    lineHeight: 1,
    color: uiTheme.colors.text,
  },
  healthRingValueCompact: {
    fontSize: 24,
    lineHeight: 1,
    color: uiTheme.colors.text,
  },
  inlineMeta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  inlineMetaBadge: {
    ...badgeBase,
    ...toneStyles.slate,
  },
  inlineMetaText: {
    color: uiTheme.colors.muted,
    fontSize: 12,
  },
  insightCard: {
    ...surfaceCard,
    padding: 20,
    borderWidth: 1,
    borderStyle: "solid",
    display: "grid",
    gap: 14,
  },
  insightDescription: {
    margin: 0,
    color: uiTheme.colors.muted,
    lineHeight: 1.6,
    fontSize: 14,
  },
  insightIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
  },
  insightTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: uiTheme.colors.text,
  },
  insightTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  insightsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 16,
  },
  input: {
    ...inputBase,
    height: 44,
    borderRadius: uiTheme.radii.sm,
    width: "100%",
  },
  kpiCard: {
    ...surfaceCard,
    padding: 20,
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    minHeight: 116,
    borderRadius: 20,
  },
  kpiCopy: {
    display: "grid",
    gap: 8,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  kpiIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  kpiNote: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    lineHeight: 1.5,
  },
  kpiTitle: {
    margin: 0,
    fontSize: 12,
    fontWeight: 600,
    color: uiTheme.colors.text,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  kpiValue: {
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 700,
  },
  legend: {
    display: "grid",
    gap: 14,
  },
  legendCopy: {
    display: "grid",
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    flexShrink: 0,
    marginTop: 4,
  },
  legendRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  lineChart: {
    width: "100%",
    height: 236,
  },
  lineChartWrap: {
    marginTop: 24,
  },
  main: {
    ...pageMain,
    display: "grid",
    gap: 20,
    backgroundImage:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.07), transparent 30%), linear-gradient(225deg, rgba(15, 23, 42, 0.045), transparent 28%)",
  },
  metricCell: {
    display: "grid",
    gap: 6,
  },
  monitorCell: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
  },
  monitorHeadline: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  monitorIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background:
      "linear-gradient(180deg, rgba(239, 246, 255, 0.95), rgba(219, 234, 254, 0.82))",
    color: uiTheme.colors.primary,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  monitorSubtext: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    wordBreak: "break-word",
  },
  monitorText: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  overviewAside: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  overviewAsideCopy: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  overviewAsideText: {
    color: uiTheme.colors.muted,
    fontSize: 13,
  },
  overviewAsideTitle: {
    color: uiTheme.colors.text,
    fontSize: 15,
  },
  overviewCard: {
    ...surfaceCard,
    padding: 22,
    borderRadius: 20,
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    alignItems: "center",
  },
  overviewCopy: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    flex: "1 1 420px",
  },
  overviewDescription: {
    margin: 0,
    color: uiTheme.colors.muted,
    fontSize: 14,
    lineHeight: 1.6,
  },
  overviewMetaRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  primaryButton: {
    ...primaryButtonBase,
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  primaryLink: {
    ...primaryButtonBase,
    minHeight: 34,
    padding: "0 12px",
    whiteSpace: "nowrap",
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 600,
  },
  regionBar: {
    height: 8,
    borderRadius: 999,
    background: uiTheme.colors.primarySoft,
    overflow: "hidden",
  },
  regionFill: {
    height: "100%",
    borderRadius: 999,
    background: uiTheme.colors.primary,
  },
  regionList: {
    display: "grid",
    gap: 16,
    marginTop: 24,
  },
  regionNote: {
    color: uiTheme.colors.muted,
    fontSize: 12,
    display: "block",
    marginTop: 4,
  },
  regionRow: {
    display: "grid",
    gap: 9,
  },
  regionTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    fontSize: 13,
    color: uiTheme.colors.text,
  },
  resultBadge: {
    ...badgeBase,
    ...toneStyles.blue,
  },
  secondaryButton: {
    ...secondaryButtonBase,
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryLink: {
    ...secondaryButtonBase,
    minHeight: 34,
    padding: "0 12px",
    textDecoration: "none",
    whiteSpace: "nowrap",
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    fontSize: 12,
    fontWeight: 600,
  },
  sectionBlock: {
    display: "grid",
    gap: 16,
  },
  sectionCopy: {
    margin: "5px 0 0",
    fontSize: 13,
    color: uiTheme.colors.muted,
    lineHeight: 1.55,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: uiTheme.colors.text,
    letterSpacing: "0em",
  },
  sectionTopRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-end",
  },
  skeletonList: {
    padding: 24,
    display: "grid",
    gap: 12,
  },
  softTag: {
    ...badgeBase,
    ...toneStyles.slate,
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  tableActions: {
    display: "flex",
    justifyContent: "flex-end",
    position: "relative",
  },
  actionMenu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    minWidth: 190,
    padding: 8,
    borderRadius: 16,
    background: uiTheme.colors.surface,
    border: `1px solid ${uiTheme.colors.border}`,
    boxShadow: "0 18px 38px rgba(15, 23, 42, 0.14)",
    display: "grid",
    gap: 4,
    zIndex: 20,
    backdropFilter: "blur(12px)",
  },
  actionMenuItem: {
    ...secondaryButtonBase,
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-start",
    textDecoration: "none",
    whiteSpace: "nowrap",
    border: "none",
    background: "transparent",
    boxShadow: "none",
    fontSize: 12,
    fontWeight: 500,
    color: uiTheme.colors.text,
    cursor: "pointer",
  },
  actionMenuLink: {
    ...secondaryButtonBase,
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-start",
    textDecoration: "none",
    whiteSpace: "nowrap",
    border: "none",
    background: "transparent",
    boxShadow: "none",
    fontSize: 12,
    fontWeight: 500,
    color: uiTheme.colors.text,
  },
  actionMenuLinkPrimary: {
    ...primaryButtonBase,
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-start",
    textDecoration: "none",
    whiteSpace: "nowrap",
    fontSize: 12,
    fontWeight: 600,
  },
  iconActionButton: {
    ...secondaryButtonBase,
    width: 38,
    minWidth: 38,
    height: 38,
    minHeight: 38,
    padding: 0,
    borderRadius: 14,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--control-bg)",
    border: `1px solid ${uiTheme.colors.borderStrong}`,
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
    color: uiTheme.colors.text,
    cursor: "pointer",
  },
  iconActionButtonActive: {
    background: uiTheme.colors.primarySoft,
    color: uiTheme.colors.primary,
    border: `1px solid ${uiTheme.colors.primary}25`,
  },
  tableCard: {
    ...surfaceCard,
    padding: 0,
    overflow: "hidden",
    borderRadius: 20,
  },
  tableTop: {
    padding: "22px 24px 14px",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-end",
  },
  td: {
    padding: "16px 18px",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
    fontSize: 13,
    verticalAlign: "middle",
    color: uiTheme.colors.text,
  },
  tdActions: {
    padding: "16px 18px",
    borderBottom: `1px solid ${uiTheme.colors.surfaceSoft}`,
    fontSize: 13,
    verticalAlign: "middle",
    textAlign: "right",
  },
  th: {
    padding: "14px 18px",
    textAlign: "left",
    fontSize: 12,
    color: uiTheme.colors.muted,
    fontWeight: 600,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surfaceSoft,
  },
  thActions: {
    padding: "14px 18px",
    textAlign: "right",
    fontSize: 12,
    color: uiTheme.colors.muted,
    fontWeight: 600,
    borderTop: `1px solid ${uiTheme.colors.surfaceSoft}`,
    borderBottom: `1px solid ${uiTheme.colors.border}`,
    background: uiTheme.colors.surfaceSoft,
  },
  typeBadge: {
    ...badgeBase,
    ...toneStyles.blue,
  },
  xAxis: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: uiTheme.colors.muted,
    fontSize: 11,
    marginTop: 8,
    flexWrap: "wrap",
  },
};

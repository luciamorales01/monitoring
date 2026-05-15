import { Injectable } from '@nestjs/common';
import { IncidentStatus, MonitorStatus } from '@prisma/client';
import { getRangeSeconds } from '../helpers/report-period';
import type {
  ReportDataset,
  ReportIncidentRow,
  ReportMonitorInput,
  ReportRange,
  ReportRow,
  ReportSummary,
} from '../types/report.types';

function getDowntimeSeconds(
  range: ReportRange,
  checks: number,
  downChecks: number,
) {
  if (checks <= 0 || downChecks <= 0) return 0;
  return Math.round((downChecks / checks) * getRangeSeconds(range));
}

@Injectable()
export class ReportMetricsService {
  buildDataset(params: {
    range: ReportRange;
    from: Date;
    to: Date;
    monitorId?: number;
    sectionId?: number;
    monitors: ReportMonitorInput[];
    scopeName: string | null;
  }): ReportDataset {
    const rows = params.monitors.map((monitor) =>
      this.buildMonitorRow(params.range, monitor),
    );
    const incidents = params.monitors.flatMap((monitor) =>
      this.buildIncidentRows(monitor),
    );

    return {
      summary: this.buildSummary({
        range: params.range,
        from: params.from,
        to: params.to,
        monitorId: params.monitorId,
        sectionId: params.sectionId,
        rows,
      }),
      incidents,
      scopeName: params.scopeName,
    };
  }

  private buildSummary(params: {
    range: ReportRange;
    from: Date;
    to: Date;
    monitorId?: number;
    sectionId?: number;
    rows: ReportRow[];
  }): ReportSummary {
    const checks = params.rows.reduce((sum, row) => sum + row.checks, 0);
    const incidents = params.rows.reduce((sum, row) => sum + row.incidents, 0);
    const estimatedDowntimeSeconds = params.rows.reduce(
      (sum, row) => sum + (row.estimatedDowntimeSeconds ?? 0),
      0,
    );
    const averageUptimePercent = params.rows.length
      ? Number(
          (
            params.rows.reduce((sum, row) => sum + row.uptimePercent, 0) /
            params.rows.length
          ).toFixed(2),
        )
      : 0;
    const rowsWithResponse = params.rows.filter(
      (row) => row.averageResponseTimeMs > 0,
    );
    const averageResponseTimeMs = rowsWithResponse.length
      ? Math.round(
          rowsWithResponse.reduce(
            (sum, row) => sum + row.averageResponseTimeMs,
            0,
          ) / rowsWithResponse.length,
        )
      : 0;

    return {
      range: params.range,
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      selectedMonitorId: params.monitorId ?? null,
      selectedSectionId: params.sectionId ?? null,
      totals: {
        averageUptimePercent,
        averageResponseTimeMs,
        incidents,
        checks,
        monitors: params.rows.length,
        estimatedDowntimeSeconds,
      },
      rows: params.rows,
    };
  }

  private buildMonitorRow(
    range: ReportRange,
    monitor: ReportMonitorInput,
  ): ReportRow {
    const checks = monitor.checkResults;
    const upChecks = checks.filter(
      (check) => check.status === MonitorStatus.UP,
    ).length;
    const downChecks = checks.filter(
      (check) => check.status === MonitorStatus.DOWN,
    ).length;
    const checksWithResponse = checks.filter(
      (check) => typeof check.responseTimeMs === 'number',
    );
    const averageResponseTimeMs = checksWithResponse.length
      ? Math.round(
          checksWithResponse.reduce(
            (sum, check) => sum + (check.responseTimeMs ?? 0),
            0,
          ) / checksWithResponse.length,
        )
      : (monitor.lastResponseTime ?? 0);

    const uptimePercent = checks.length
      ? Number(((upChecks / checks.length) * 100).toFixed(2))
      : monitor.isActive && monitor.currentStatus === MonitorStatus.UP
        ? 100
        : 0;

    const estimatedDowntimeSeconds = getDowntimeSeconds(
      range,
      checks.length,
      downChecks,
    );

    const lastDowntime = checks
      .slice()
      .reverse()
      .find((check) => check.status === MonitorStatus.DOWN)?.checkedAt;

    return {
      monitor: {
        id: monitor.id,
        name: monitor.name,
        target: monitor.target,
        type: monitor.type,
        currentStatus: monitor.currentStatus,
        isActive: monitor.isActive,
      },
      uptimePercent,
      slaPercent: uptimePercent,
      averageResponseTimeMs,
      incidents: monitor.incidents.length,
      openIncidents: monitor.incidents.filter(
        (incident) => incident.status === IncidentStatus.OPEN,
      ).length,
      checks: checks.length,
      downChecks,
      estimatedDowntimeSeconds,
      lastDowntime: lastDowntime?.toISOString() ?? null,
    };
  }

  private buildIncidentRows(monitor: ReportMonitorInput[]): ReportIncidentRow[];
  private buildIncidentRows(monitor: ReportMonitorInput): ReportIncidentRow[];
  private buildIncidentRows(
    monitor: ReportMonitorInput | ReportMonitorInput[],
  ): ReportIncidentRow[] {
    const monitors = Array.isArray(monitor) ? monitor : [monitor];

    return monitors.flatMap((currentMonitor) =>
      currentMonitor.incidents.map((incident) => ({
        id: incident.id,
        monitorId: currentMonitor.id,
        monitorName: currentMonitor.name,
        status: incident.status,
        severity: incident.severity ?? null,
        title: incident.title ?? 'Incidencia',
        startedAt: incident.startedAt.toISOString(),
        resolvedAt: incident.resolvedAt?.toISOString() ?? null,
        durationSeconds: incident.durationSeconds ?? null,
      })),
    );
  }
}

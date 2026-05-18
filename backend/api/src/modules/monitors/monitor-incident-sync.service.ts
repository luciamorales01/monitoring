import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildIncidentTitle,
  getAlertThreshold,
  getConsecutiveDownBatches,
  getIncidentStartedAt,
} from './monitors.service.helpers';
import {
  IncidentStatus,
  MonitorStatus,
  type IncidentSyncResult,
  type MonitorCheckOutcome,
  type MonitorEntity,
} from './monitors.service.types';

@Injectable()
export class MonitorIncidentSyncService {
  async syncIncidentForCheck(
    tx: Prisma.TransactionClient,
    monitor: Pick<
      MonitorEntity,
      | 'id'
      | 'name'
      | 'target'
      | 'organizationId'
      | 'alertThreshold'
      | 'alertEmail'
    >,
    outcome: MonitorCheckOutcome,
  ): Promise<IncidentSyncResult> {
    const openIncident = await tx.incident.findFirst({
      where: {
        monitorId: monitor.id,
        status: { in: [IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED] },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (outcome.status === MonitorStatus.DOWN) {
      if (openIncident) {
        return null;
      }

      const batchSize = 1;
      const alertThreshold = getAlertThreshold(monitor.alertThreshold);

      const recentResults = await tx.checkResult.findMany({
        where: {
          monitorId: monitor.id,
        },
        orderBy: {
          checkedAt: 'desc',
        },
        take: batchSize * alertThreshold,
      });

      const consecutiveDownBatches = getConsecutiveDownBatches(
        recentResults,
        batchSize,
      );

      if (consecutiveDownBatches.length < alertThreshold) {
        return null;
      }

      const incident = await tx.incident.create({
        data: {
          monitorId: monitor.id,
          status: IncidentStatus.OPEN,
          title: buildIncidentTitle(),
          startedAt: getIncidentStartedAt(
            consecutiveDownBatches,
            outcome.checkedAt,
          ),
        },
      });

      return {
        errorMessage: outcome.errorMessage,
        happenedAt: incident.startedAt ?? outcome.checkedAt,
        incidentId: incident.id,
        severity: incident.severity,
        shouldNotify: monitor.alertEmail !== false,
        title: incident.title,
        type: 'created',
      };
    }

    if (!openIncident) {
      return null;
    }

    const resolvedIncident = await tx.incident.update({
      where: {
        id: openIncident.id,
      },
      data: {
        status: IncidentStatus.RESOLVED,
        resolvedAt: outcome.checkedAt,
        durationSeconds: Math.max(
          0,
          Math.floor(
            (outcome.checkedAt.getTime() - openIncident.startedAt.getTime()) /
              1000,
          ),
        ),
        lastStatusChangeAt: outcome.checkedAt,
      },
    });

    return {
      happenedAt: outcome.checkedAt,
      incidentId: resolvedIncident.id,
      severity: resolvedIncident.severity,
      shouldNotify: monitor.alertEmail !== false,
      title: resolvedIncident.title,
      type: 'resolved',
    };
  }
}

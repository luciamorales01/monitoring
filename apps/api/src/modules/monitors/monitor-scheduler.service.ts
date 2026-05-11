import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitorsService } from './monitors.service';

@Injectable()
export class MonitorSchedulerService {
  private readonly logger = new Logger(MonitorSchedulerService.name);
  private isRunning = false;

  constructor(private readonly monitorsService: MonitorsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runDueMonitorChecks() {
    if (this.isRunning) {
      this.logger.warn(
        'Saltando ciclo de scheduler porque el anterior sigue en curso',
      );
      return;
    }

    this.isRunning = true;

    try {
      this.logger.log('Iniciando ciclo de scheduler de monitores');
      const dueMonitorIds =
        await this.monitorsService.findDueActiveMonitorIds();
      this.logger.log(
        `Scheduler de monitores encontró ${dueMonitorIds.length} monitor(es) pendientes`,
      );

      if (dueMonitorIds.length === 0) {
        return;
      }

      const settledRuns = await Promise.allSettled(
        dueMonitorIds.map(async (monitorId) => {
          await this.monitorsService.runAutomatedCheck(monitorId);
          return monitorId;
        }),
      );

      const failedChecks = settledRuns.filter(
        (result) => result.status === 'rejected',
      );

      for (const [index, result] of settledRuns.entries()) {
        if (result.status === 'fulfilled') {
          continue;
        }

        this.logger.error(
          JSON.stringify({
            event: 'monitor_check_scheduler_failed',
            monitorId: dueMonitorIds[index],
            message:
              result.reason instanceof Error
                ? result.reason.message
                : 'Unknown error',
            stack:
              result.reason instanceof Error ? result.reason.stack : undefined,
          }),
        );
      }

      this.logger.log(
        JSON.stringify({
          event: 'monitor_checks_processed',
          failed: failedChecks.length,
          processed: settledRuns.length - failedChecks.length,
          total: settledRuns.length,
        }),
      );
    } finally {
      this.logger.log('Finalizó ciclo de scheduler de monitores');
      this.isRunning = false;
    }
  }
}

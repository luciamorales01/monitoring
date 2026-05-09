import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitorsService } from './monitors.service';

@Injectable()
export class MonitorSchedulerService {
  private readonly logger = new Logger(MonitorSchedulerService.name);
  private isRunning = false;

  constructor(private readonly monitorsService: MonitorsService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async runDueMonitorChecks() {
    if (this.isRunning) {
      this.logger.warn('Saltando ciclo de scheduler porque el anterior sigue en curso');
      return;
    }

    this.isRunning = true;

    try {
      this.logger.log('Iniciando ciclo de scheduler de monitores');
      const dueMonitorIds = await this.monitorsService.findDueActiveMonitorIds();
      this.logger.log(
        `Scheduler de monitores encontró ${dueMonitorIds.length} monitor(es) pendientes`,
      );

      if (dueMonitorIds.length === 0) {
        return;
      }

      const results = await Promise.allSettled(
        dueMonitorIds.map((monitorId) =>
          this.monitorsService.runAutomatedCheck(monitorId),
        ),
      );

      const rejectedChecks = results.filter(
        (result) => result.status === 'rejected',
      ).length;
      const processedChecks = results.length - rejectedChecks;

      if (rejectedChecks > 0) {
        this.logger.error(
          `Fallaron ${rejectedChecks} checks automáticos de ${dueMonitorIds.length}`,
        );
      }

      this.logger.log(
        `Scheduler de monitores procesó ${processedChecks}/${dueMonitorIds.length} monitor(es)`,
      );
    } finally {
      this.logger.log('Finalizó ciclo de scheduler de monitores');
      this.isRunning = false;
    }
  }
}

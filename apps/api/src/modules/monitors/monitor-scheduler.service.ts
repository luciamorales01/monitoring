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
      const dueMonitorIds = await this.monitorsService.findDueActiveMonitorIds();

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

      if (rejectedChecks > 0) {
        this.logger.error(
          `Fallaron ${rejectedChecks} checks automáticos de ${dueMonitorIds.length}`,
        );
      }
    } finally {
      this.isRunning = false;
    }
  }
}

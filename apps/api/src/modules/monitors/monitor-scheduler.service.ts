import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MonitorsService } from './monitors.service';
import { MonitorChecksQueueService } from './monitor-checks-queue.service';

@Injectable()
export class MonitorSchedulerService {
  private readonly logger = new Logger(MonitorSchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly monitorsService: MonitorsService,
    private readonly monitorChecksQueue: MonitorChecksQueueService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
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

      const summary =
        await this.monitorChecksQueue.enqueueDueChecks(dueMonitorIds);

      this.logger.log(
        JSON.stringify({
          enqueued: summary.enqueued,
          event: 'monitor_checks_enqueued',
          failed: summary.failed,
          total: summary.total,
        }),
      );
    } finally {
      this.logger.log('Finalizó ciclo de scheduler de monitores');
      this.isRunning = false;
    }
  }
}

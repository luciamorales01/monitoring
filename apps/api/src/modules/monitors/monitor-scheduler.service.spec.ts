import { MonitorSchedulerService } from './monitor-scheduler.service';
import { MonitorChecksQueueService } from './monitor-checks-queue.service';
import { MonitorsService } from './monitors.service';

describe('MonitorSchedulerService', () => {
  let service: MonitorSchedulerService;
  let monitorsService: {
    findDueActiveMonitorIds: jest.Mock;
  };
  let monitorChecksQueue: {
    enqueueDueChecks: jest.Mock;
  };

  beforeEach(() => {
    monitorsService = {
      findDueActiveMonitorIds: jest.fn(),
    };
    monitorChecksQueue = {
      enqueueDueChecks: jest.fn(),
    };

    service = new MonitorSchedulerService(
      monitorsService as unknown as MonitorsService,
      monitorChecksQueue as unknown as MonitorChecksQueueService,
    );
  });

  it('enqueues checks only for due monitors', async () => {
    monitorsService.findDueActiveMonitorIds.mockResolvedValue([1, 2, 3]);
    monitorChecksQueue.enqueueDueChecks.mockResolvedValue({
      enqueued: 3,
      failed: 0,
      total: 3,
    });

    await service.runDueMonitorChecks();

    expect(monitorsService.findDueActiveMonitorIds).toHaveBeenCalledTimes(1);
    expect(monitorChecksQueue.enqueueDueChecks).toHaveBeenCalledTimes(1);
    expect(monitorChecksQueue.enqueueDueChecks).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('does nothing when no monitor is due', async () => {
    monitorsService.findDueActiveMonitorIds.mockResolvedValue([]);

    await service.runDueMonitorChecks();

    expect(monitorChecksQueue.enqueueDueChecks).not.toHaveBeenCalled();
  });
});

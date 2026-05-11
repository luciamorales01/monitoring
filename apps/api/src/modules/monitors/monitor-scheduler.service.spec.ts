import { MonitorSchedulerService } from './monitor-scheduler.service';
import { MonitorsService } from './monitors.service';

describe('MonitorSchedulerService', () => {
  let service: MonitorSchedulerService;
  let monitorsService: {
    findDueActiveMonitorIds: jest.Mock;
    runAutomatedCheck: jest.Mock;
  };

  beforeEach(() => {
    monitorsService = {
      findDueActiveMonitorIds: jest.fn(),
      runAutomatedCheck: jest.fn(),
    };

    service = new MonitorSchedulerService(
      monitorsService as unknown as MonitorsService,
    );
  });

  it('runs checks only for due monitors', async () => {
    monitorsService.findDueActiveMonitorIds.mockResolvedValue([1, 2, 3]);
    monitorsService.runAutomatedCheck.mockResolvedValue(null);

    await service.runDueMonitorChecks();

    expect(monitorsService.findDueActiveMonitorIds).toHaveBeenCalledTimes(1);
    expect(monitorsService.runAutomatedCheck).toHaveBeenCalledTimes(3);
    expect(monitorsService.runAutomatedCheck).toHaveBeenNthCalledWith(1, 1);
    expect(monitorsService.runAutomatedCheck).toHaveBeenNthCalledWith(2, 2);
    expect(monitorsService.runAutomatedCheck).toHaveBeenNthCalledWith(3, 3);
  });

  it('does nothing when no monitor is due', async () => {
    monitorsService.findDueActiveMonitorIds.mockResolvedValue([]);

    await service.runDueMonitorChecks();

    expect(monitorsService.runAutomatedCheck).not.toHaveBeenCalled();
  });

  it('continues processing remaining monitors when one automated check fails', async () => {
    monitorsService.findDueActiveMonitorIds.mockResolvedValue([1, 2, 3]);
    monitorsService.runAutomatedCheck
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce(null);

    await expect(service.runDueMonitorChecks()).resolves.toBeUndefined();

    expect(monitorsService.runAutomatedCheck).toHaveBeenCalledTimes(3);
  });
});

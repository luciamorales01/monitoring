import { Test, TestingModule } from '@nestjs/testing';
import { MonitorsController } from './monitors.controller';
import { MonitorsService } from './monitors.service';

describe('MonitorsController', () => {
  let controller: MonitorsController;
  let monitorsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    findRecentChecks: jest.Mock;
    runCheck: jest.Mock;
    toggleActive: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    monitorsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      findRecentChecks: jest.fn(),
      runCheck: jest.fn(),
      toggleActive: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitorsController],
      providers: [
        {
          provide: MonitorsService,
          useValue: monitorsService,
        },
      ],
    }).compile();

    controller = module.get<MonitorsController>(MonitorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns recent checks through the monitors service', async () => {
    const checks = [{ id: 1, status: 'UP' }];
    monitorsService.findRecentChecks.mockResolvedValue(checks);

    const result = await controller.findRecentChecks(5, undefined, {
      user: { organizationId: 10, userId: 20 },
    });

    expect(monitorsService.findRecentChecks).toHaveBeenCalledWith(5, {
      organizationId: 10,
      userId: 20,
    }, undefined);
    expect(result).toEqual(checks);
  });

  it('passes sort order for recent checks through the monitors service', async () => {
    const checks = [{ id: 2, status: 'DOWN' }];
    monitorsService.findRecentChecks.mockResolvedValue(checks);

    const result = await controller.findRecentChecks(5, 'asc', {
      user: { organizationId: 10, userId: 20 },
    });

    expect(monitorsService.findRecentChecks).toHaveBeenCalledWith(5, {
      organizationId: 10,
      userId: 20,
    }, 'asc');
    expect(result).toEqual(checks);
  });

  it('updates a monitor through the monitors service', async () => {
    const monitor = { id: 5, name: 'API editada' };
    monitorsService.update.mockResolvedValue(monitor);

    const result = await controller.update(
      5,
      { name: 'API editada' },
      {
        user: { organizationId: 10, userId: 20 },
      },
    );

    expect(monitorsService.update).toHaveBeenCalledWith(
      5,
      { name: 'API editada' },
      {
        organizationId: 10,
        userId: 20,
      },
    );
    expect(result).toEqual(monitor);
  });

  it('toggles active state through the monitors service', async () => {
    const monitor = { id: 5, isActive: false };
    monitorsService.toggleActive.mockResolvedValue(monitor);

    const result = await controller.toggleActive(5, {
      user: { organizationId: 10, userId: 20 },
    });

    expect(monitorsService.toggleActive).toHaveBeenCalledWith(5, {
      organizationId: 10,
      userId: 20,
    });
    expect(result).toEqual(monitor);
  });

  it('deletes a monitor through the monitors service', async () => {
    const monitor = { id: 5, name: 'API antigua' };
    monitorsService.remove.mockResolvedValue(monitor);

    const result = await controller.remove(5, {
      user: { organizationId: 10, userId: 20 },
    });

    expect(monitorsService.remove).toHaveBeenCalledWith(5, {
      organizationId: 10,
      userId: 20,
    });
    expect(result).toEqual(monitor);
  });
});

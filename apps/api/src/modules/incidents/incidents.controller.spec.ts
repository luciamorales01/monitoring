import { Test, TestingModule } from '@nestjs/testing';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

describe('IncidentsController', () => {
  let controller: IncidentsController;
  let incidentsService: {
    findAll: jest.Mock;
    findActive: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    incidentsService = {
      findAll: jest.fn(),
      findActive: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidentsController],
      providers: [
        {
          provide: IncidentsService,
          useValue: incidentsService,
        },
      ],
    }).compile();

    controller = module.get<IncidentsController>(IncidentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates listing all incidents', async () => {
    const incidents = [{ id: 1 }];
    incidentsService.findAll.mockResolvedValue(incidents);

    const result = await controller.findAll({
      user: { organizationId: 10, userId: 20 },
    });

    expect(incidentsService.findAll).toHaveBeenCalledWith({
      organizationId: 10,
      userId: 20,
    });
    expect(result).toEqual(incidents);
  });

  it('delegates listing active incidents', async () => {
    const incidents = [{ id: 2 }];
    incidentsService.findActive.mockResolvedValue(incidents);

    const result = await controller.findActive({
      user: { organizationId: 10, userId: 20 },
    });

    expect(incidentsService.findActive).toHaveBeenCalledWith({
      organizationId: 10,
      userId: 20,
    });
    expect(result).toEqual(incidents);
  });

  it('delegates fetching one incident', async () => {
    const incident = { id: 3 };
    incidentsService.findOne.mockResolvedValue(incident);

    const result = await controller.findOne(3, {
      user: { organizationId: 10, userId: 20 },
    });

    expect(incidentsService.findOne).toHaveBeenCalledWith(3, {
      organizationId: 10,
      userId: 20,
    });
    expect(result).toEqual(incident);
  });
});

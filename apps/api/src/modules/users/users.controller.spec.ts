import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    findAll: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    usersService = {
      findAll: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates listing users', async () => {
    const users = [{ id: 1 }];
    usersService.findAll.mockResolvedValue(users);

    const result = await controller.findAll({
      user: { organizationId: 10, userId: 20 },
    });

    expect(usersService.findAll).toHaveBeenCalledWith({
      organizationId: 10,
      userId: 20,
    });
    expect(result).toEqual(users);
  });

  it('delegates updating a user', async () => {
    const updatedUser = { id: 1, name: 'Ana Actualizada' };
    const dto = { name: 'Ana Actualizada', email: 'ana@example.com', role: 'ADMIN' };
    usersService.update.mockResolvedValue(updatedUser);

    const result = await controller.update(1, dto as any, {
      user: { organizationId: 10, userId: 20 },
    });

    expect(usersService.update).toHaveBeenCalledWith(1, dto, {
      organizationId: 10,
      userId: 20,
    });
    expect(result).toEqual(updatedUser);
  });
});

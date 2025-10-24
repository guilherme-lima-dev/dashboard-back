import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        {
          id: '1',
          email: 'test@example.com',
          fullName: 'Test User',
          status: 'active',
          emailVerified: true,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: null,
          userRoles: [],
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        status: 'active',
        emailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        userRoles: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await controller.findById('1');

      expect(result.id).toBe('1');
      expect(result.email).toBe('test@example.com');
      expect(result.fullName).toBe('Test User');
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'new@example.com',
        fullName: 'New User',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        ...createUserDto,
        status: 'pending_approval',
        emailVerified: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        userRoles: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result.email).toBe('new@example.com');
      expect(result.fullName).toBe('New User');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createUserDto.email,
          fullName: createUserDto.fullName,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const userId = '1';
      const updateUserDto = {
        fullName: 'Updated User',
        status: 'active',
      };

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        ...updateUserDto,
        emailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        userRoles: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await controller.update(userId, updateUserDto);

      expect(result.fullName).toBe('Updated User');
      expect(result.status).toBe('active');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
        include: expect.any(Object),
      });
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const userId = '1';

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.user.delete.mockResolvedValue(undefined);

      await controller.delete(userId);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      const userId = '1';
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      };

      const mockUser = {
        id: userId,
        passwordHash: 'hashedpassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(undefined);

      await controller.changePassword(userId, changePasswordDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: expect.any(String) },
      });
    });
  });

  describe('approveUser', () => {
    it('should approve user', async () => {
      const approveUserDto = {
        userId: '1',
        approved: true,
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        status: 'active',
        emailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        userRoles: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await controller.approveUser(approveUserDto);

      expect(result.status).toBe('active');
      expect(result.emailVerified).toBe(true);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      const assignRoleDto = {
        userId: '1',
        roleId: 'role1',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrismaService.role.findUnique.mockResolvedValue({ id: 'role1' });
      mockPrismaService.userRole.findUnique.mockResolvedValue(null);
      mockPrismaService.userRole.create.mockResolvedValue(undefined);

      await controller.assignRole(assignRoleDto);

      expect(mockPrismaService.userRole.create).toHaveBeenCalledWith({
        data: assignRoleDto,
      });
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalUsers: 10,
        activeUsers: 8,
        pendingUsers: 1,
        suspendedUsers: 1,
        usersByRole: { 'super-admin': 1, 'admin': 2, 'analyst': 5 },
        recentRegistrations: 3,
      };

      mockPrismaService.user.count
        .mockResolvedValueOnce(10)  // totalUsers
        .mockResolvedValueOnce(8)   // activeUsers
        .mockResolvedValueOnce(1)   // pendingUsers
        .mockResolvedValueOnce(1)   // suspendedUsers
        .mockResolvedValueOnce(3);  // recentRegistrations

      mockPrismaService.userRole.groupBy.mockResolvedValue([
        { roleId: '1', _count: { roleId: 1 }, role: { slug: 'super-admin' } },
        { roleId: '2', _count: { roleId: 2 }, role: { slug: 'admin' } },
        { roleId: '3', _count: { roleId: 5 }, role: { slug: 'analyst' } },
      ]);

      const result = await controller.getUserStats();

      expect(result.totalUsers).toBe(10);
      expect(result.activeUsers).toBe(8);
      expect(result.pendingUsers).toBe(1);
      expect(result.suspendedUsers).toBe(1);
    });
  });
});

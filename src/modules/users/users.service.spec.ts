import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

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
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter users by search term', async () => {
      const mockUsers = [];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll({ search: 'test' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { fullName: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should filter users by status', async () => {
      const mockUsers = [];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.findAll({ status: 'active' });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
          }),
        })
      );
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

      const result = await service.findById('1');

      expect(result.id).toBe('1');
      expect(result.email).toBe('test@example.com');
      expect(result.fullName).toBe('Test User');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('1')).rejects.toThrow(NotFoundException);
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

      const result = await service.create(createUserDto);

      expect(result.email).toBe('new@example.com');
      expect(result.fullName).toBe('New User');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: createUserDto.email,
          fullName: createUserDto.fullName,
          passwordHash: expect.any(String),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        fullName: 'Existing User',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
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

      const result = await service.update(userId, updateUserDto);

      expect(result.fullName).toBe('Updated User');
      expect(result.status).toBe('active');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.update('1', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      const userId = '1';

      mockPrismaService.user.findUnique.mockResolvedValue({ id: userId });
      mockPrismaService.user.delete.mockResolvedValue(undefined);

      await service.delete(userId);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.delete('1')).rejects.toThrow(NotFoundException);
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

      await service.changePassword(userId, changePasswordDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: expect.any(String) },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.changePassword('1', {
        currentPassword: 'old',
        newPassword: 'new',
      })).rejects.toThrow(NotFoundException);
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

      const result = await service.approveUser(approveUserDto);

      expect(result.status).toBe('active');
      expect(result.emailVerified).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.approveUser({
        userId: '1',
        approved: true,
      })).rejects.toThrow(NotFoundException);
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

      await service.assignRole(assignRoleDto);

      expect(mockPrismaService.userRole.create).toHaveBeenCalledWith({
        data: assignRoleDto,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assignRole({
        userId: '1',
        roleId: 'role1',
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when role not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrismaService.role.findUnique.mockResolvedValue(null);

      await expect(service.assignRole({
        userId: '1',
        roleId: 'role1',
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user already has role', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrismaService.role.findUnique.mockResolvedValue({ id: 'role1' });
      mockPrismaService.userRole.findUnique.mockResolvedValue({ id: '1' });

      await expect(service.assignRole({
        userId: '1',
        roleId: 'role1',
      })).rejects.toThrow(ConflictException);
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

      const result = await service.getUserStats();

      expect(result.totalUsers).toBe(10);
      expect(result.activeUsers).toBe(8);
      expect(result.pendingUsers).toBe(1);
      expect(result.suspendedUsers).toBe(1);
      expect(result.usersByRole['super-admin']).toBe(1);
      expect(result.usersByRole['admin']).toBe(2);
      expect(result.usersByRole['analyst']).toBe(5);
      expect(result.recentRegistrations).toBe(3);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions', async () => {
      const userId = '1';
      const mockUserRoles = [
        {
          role: {
            rolePermissions: [
              {
                granted: true,
                permission: {
                  resource: { slug: 'dashboard' },
                  action: { slug: 'read' },
                },
              },
              {
                granted: true,
                permission: {
                  resource: { slug: 'users' },
                  action: { slug: 'create' },
                },
              },
            ],
          },
        },
      ];

      mockPrismaService.userRole.findMany.mockResolvedValue(mockUserRoles);

      const result = await service.getUserPermissions(userId);

      expect(result).toContain('dashboard:read');
      expect(result).toContain('users:create');
    });
  });
});

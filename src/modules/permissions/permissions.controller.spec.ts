import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let service: PermissionsService;

  const mockPrismaService = {
    permission: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    resource: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    action: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    rolePermission: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', async () => {
      const mockPermissions = [
        {
          id: '1',
          resource: { slug: 'dashboard' },
          action: { slug: 'read' },
          description: 'Read dashboard',
          conditions: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await controller.getAllPermissions();

      expect(result).toHaveLength(1);
      expect(result[0].resource).toBe('dashboard');
      expect(result[0].action).toBe('read');
    });
  });

  describe('getAllResources', () => {
    it('should return all resources', async () => {
      const mockResources = [
        {
          id: '1',
          name: 'Dashboard',
          slug: 'dashboard',
          description: 'Dashboard access',
          parentId: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.resource.findMany.mockResolvedValue(mockResources);

      const result = await controller.getAllResources();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Dashboard');
      expect(result[0].slug).toBe('dashboard');
    });
  });

  describe('getAllActions', () => {
    it('should return all actions', async () => {
      const mockActions = [
        {
          id: '1',
          name: 'Read',
          slug: 'read',
          description: 'Read action',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.action.findMany.mockResolvedValue(mockActions);

      const result = await controller.getAllActions();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Read');
      expect(result[0].slug).toBe('read');
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles', async () => {
      const mockRoles = [
        {
          id: '1',
          name: 'Super Admin',
          slug: 'super-admin',
          description: 'Super Admin role',
          isSystemRole: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.role.findMany.mockResolvedValue(mockRoles);

      const result = await controller.getAllRoles();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Super Admin');
      expect(result[0].slug).toBe('super-admin');
    });
  });

  describe('createRole', () => {
    it('should create a new role', async () => {
      const createRoleDto = {
        name: 'Test Role',
        slug: 'test-role',
        description: 'Test role description',
      };

      const mockRole = {
        id: '1',
        ...createRoleDto,
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.create.mockResolvedValue(mockRole);

      const result = await controller.createRole(createRoleDto);

      expect(result.name).toBe('Test Role');
      expect(result.slug).toBe('test-role');
      expect(mockPrismaService.role.create).toHaveBeenCalledWith({
        data: createRoleDto,
      });
    });
  });

  describe('updateRole', () => {
    it('should update a role', async () => {
      const roleId = '1';
      const updateRoleDto = {
        name: 'Updated Role',
        description: 'Updated description',
      };

      const mockRole = {
        id: roleId,
        ...updateRoleDto,
        slug: 'test-role',
        isSystemRole: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.role.update.mockResolvedValue(mockRole);

      const result = await controller.updateRole(roleId, updateRoleDto);

      expect(result.name).toBe('Updated Role');
      expect(mockPrismaService.role.update).toHaveBeenCalledWith({
        where: { id: roleId },
        data: updateRoleDto,
      });
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      const roleId = '1';
      const mockRole = {
        id: roleId,
        name: 'Test Role',
        isSystemRole: false,
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);
      mockPrismaService.role.delete.mockResolvedValue(undefined);

      await controller.deleteRole(roleId);

      expect(mockPrismaService.role.delete).toHaveBeenCalledWith({
        where: { id: roleId },
      });
    });

    it('should not delete system role', async () => {
      const roleId = '1';
      const mockRole = {
        id: roleId,
        name: 'System Role',
        isSystemRole: true,
      };

      mockPrismaService.role.findUnique.mockResolvedValue(mockRole);

      await expect(controller.deleteRole(roleId)).rejects.toThrow(
        'Cannot delete system role'
      );
    });
  });

  describe('getPermissionStats', () => {
    it('should return permission statistics', async () => {
      const mockStats = {
        totalPermissions: 84,
        totalResources: 14,
        totalActions: 6,
        totalRoles: 3,
        totalUsers: 2,
      };

      mockPrismaService.permission.count.mockResolvedValue(84);
      mockPrismaService.resource.count.mockResolvedValue(14);
      mockPrismaService.action.count.mockResolvedValue(6);
      mockPrismaService.role.count.mockResolvedValue(3);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await controller.getPermissionStats();

      expect(result).toEqual(mockStats);
    });
  });
});

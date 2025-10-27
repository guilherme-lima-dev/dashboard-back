import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  PermissionDto, 
  ResourceDto, 
  ActionDto, 
  RoleDto, 
  RolePermissionDto, 
  UserRoleDto,
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto,
  UpdateRolePermissionsDto,
  PermissionStatsDto
} from './dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // PERMISSIONS
  // ============================================

  async getAllPermissions(): Promise<PermissionDto[]> {
    const permissions = await this.prisma.permission.findMany({
      include: {
        resource: true,
        action: true,
      },
      orderBy: [
        { resource: { name: 'asc' } },
        { action: { name: 'asc' } },
      ],
    });

    return permissions.map(permission => ({
      id: permission.id,
      resource: permission.resource.slug,
      action: permission.action.slug,
      description: permission.description || undefined,
      conditions: permission.conditions,
      createdAt: permission.createdAt,
    }));
  }

  async getPermissionsByResource(resourceSlug: string): Promise<PermissionDto[]> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        resource: {
          slug: resourceSlug,
        },
      },
      include: {
        resource: true,
        action: true,
      },
      orderBy: {
        action: { name: 'asc' },
      },
    });

    return permissions.map(permission => ({
      id: permission.id,
      resource: permission.resource.slug,
      action: permission.action.slug,
      description: permission.description || undefined,
      conditions: permission.conditions,
      createdAt: permission.createdAt,
    }));
  }

  // ============================================
  // RESOURCES
  // ============================================

  async getAllResources(): Promise<ResourceDto[]> {
    const resources = await this.prisma.resource.findMany({
      orderBy: { name: 'asc' },
    });

    return resources.map(resource => ({
      id: resource.id,
      name: resource.name,
      slug: resource.slug,
      description: resource.description || undefined,
      parentId: resource.parentId || undefined,
      createdAt: resource.createdAt,
    }));
  }

  // ============================================
  // ACTIONS
  // ============================================

  async getAllActions(): Promise<ActionDto[]> {
    const actions = await this.prisma.action.findMany({
      orderBy: { name: 'asc' },
    });

    return actions.map(action => ({
      id: action.id,
      name: action.name,
      slug: action.slug,
      description: action.description || undefined,
      createdAt: action.createdAt,
    }));
  }

  // ============================================
  // ROLES
  // ============================================

  async getAllRoles(): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description || undefined,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async getRoleById(id: string): Promise<RoleDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description || undefined,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<RoleDto> {
    const role = await this.prisma.role.create({
      data: createRoleDto,
    });

    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description || undefined,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleDto> {
    const role = await this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });

    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description || undefined,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async deleteRole(id: string): Promise<void> {
    // Check if role is system role
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (role?.isSystemRole) {
      throw new Error('Cannot delete system role');
    }

    await this.prisma.role.delete({
      where: { id },
    });
  }

  // ============================================
  // ROLE PERMISSIONS
  // ============================================

  async getRolePermissions(roleId: string): Promise<RolePermissionDto[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          include: {
            resource: true,
            action: true,
          },
        },
      },
      orderBy: [
        { permission: { resource: { name: 'asc' } } },
        { permission: { action: { name: 'asc' } } },
      ],
    });

    return rolePermissions.map(rp => ({
      id: rp.id,
      roleId: rp.roleId,
      permissionId: rp.permissionId,
      granted: rp.granted,
      createdAt: rp.createdAt,
    }));
  }

  async updateRolePermissions(
    roleId: string, 
    permissions: UpdateRolePermissionsDto[]
  ): Promise<void> {
    // Update each permission
    for (const permission of permissions) {
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permission.permissionId,
          },
        },
        update: {
          granted: permission.granted,
        },
        create: {
          roleId,
          permissionId: permission.permissionId,
          granted: permission.granted,
        },
      });
    }
  }

  // ============================================
  // USER ROLES
  // ============================================

  async getUserRoles(userId: string): Promise<UserRoleDto[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    return userRoles.map(ur => ({
      id: ur.id,
      userId: ur.userId,
      roleId: ur.roleId,
      assignedAt: ur.assignedAt,
      assignedById: ur.assignedById || undefined,
    }));
  }

  async assignRoleToUser(assignRoleDto: AssignRoleDto): Promise<UserRoleDto> {
    const userRole = await this.prisma.userRole.create({
      data: assignRoleDto,
    });

    return {
      id: userRole.id,
      userId: userRole.userId,
      roleId: userRole.roleId,
      assignedAt: userRole.assignedAt,
      assignedById: userRole.assignedById || undefined,
    };
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getPermissionStats(): Promise<PermissionStatsDto> {
    const [
      totalPermissions,
      totalResources,
      totalActions,
      totalRoles,
      totalUsers,
    ] = await Promise.all([
      this.prisma.permission.count(),
      this.prisma.resource.count(),
      this.prisma.action.count(),
      this.prisma.role.count(),
      this.prisma.user.count(),
    ]);

    return {
      totalPermissions,
      totalResources,
      totalActions,
      totalRoles,
      totalUsers,
    };
  }

  // ============================================
  // USER PERMISSIONS
  // ============================================

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              where: { granted: true },
              include: {
                permission: {
                  include: {
                    resource: true,
                    action: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();

    userRoles.forEach(ur => {
      ur.role.rolePermissions.forEach(rp => {
        const permission = `${rp.permission.resource.slug}:${rp.permission.action.slug}`;
        permissions.add(permission);
      });
    });

    return Array.from(permissions);
  }
}

import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { 
  UserDto, 
  CreateUserDto, 
  UpdateUserDto, 
  ChangePasswordDto, 
  ResetPasswordDto,
  ApproveUserDto,
  AssignRoleDto,
  QueryUsersDto,
  UserStatsDto,
  UserActivityDto
} from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // USER CRUD
  // ============================================

  async findAll(query: QueryUsersDto): Promise<{ users: UserDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, search, status, role, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (role) {
      where.userRoles = {
        some: {
          role: {
            slug: role,
          },
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    const userDtos = users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdById: user.createdById || undefined,
      roles: user.userRoles.map(ur => ur.role.slug),
    }));

    return {
      users: userDtos,
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdById: user.createdById || undefined,
      roles: user.userRoles.map(ur => ur.role.slug),
    };
  }

  async findByEmail(email: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdById: user.createdById || undefined,
      roles: user.userRoles.map(ur => ur.role.slug),
    };
  }

  async create(createUserDto: CreateUserDto, createdById?: string): Promise<UserDto> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        fullName: createUserDto.fullName,
        passwordHash: hashedPassword,
        status: createUserDto.status || 'pending_approval',
        emailVerified: createUserDto.emailVerified || false,
        createdById,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdById: user.createdById || undefined,
      roles: user.userRoles.map(ur => ur.role.slug),
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      status: updatedUser.status,
      emailVerified: updatedUser.emailVerified,
      lastLoginAt: updatedUser.lastLoginAt || undefined,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      createdById: updatedUser.createdById || undefined,
      roles: updatedUser.userRoles.map(ur => ur.role.slug),
    };
  }

  async delete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  async changePassword(id: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: resetPasswordDto.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate new password (in real app, send email with reset link)
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    // In real app, send email with new password
    console.log(`New password for ${user.email}: ${newPassword}`);
  }

  // ============================================
  // USER APPROVAL
  // ============================================

  async approveUser(approveUserDto: ApproveUserDto): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: approveUserDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: approveUserDto.userId },
      data: {
        status: approveUserDto.approved ? 'active' : 'suspended',
        emailVerified: approveUserDto.approved,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      status: updatedUser.status,
      emailVerified: updatedUser.emailVerified,
      lastLoginAt: updatedUser.lastLoginAt || undefined,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      createdById: updatedUser.createdById || undefined,
      roles: updatedUser.userRoles.map(ur => ur.role.slug),
    };
  }

  // ============================================
  // ROLE MANAGEMENT
  // ============================================

  async assignRole(assignRoleDto: AssignRoleDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: assignRoleDto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: assignRoleDto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if user already has this role
    const existingUserRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: assignRoleDto.userId,
          roleId: assignRoleDto.roleId,
        },
      },
    });

    if (existingUserRole) {
      throw new ConflictException('User already has this role');
    }

    await this.prisma.userRole.create({
      data: assignRoleDto,
    });
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException('User role not found');
    }

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

  async getUserStats(): Promise<UserStatsDto> {
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      recentRegistrations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'active' } }),
      this.prisma.user.count({ where: { status: 'pending_approval' } }),
      this.prisma.user.count({ where: { status: 'suspended' } }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    // Get users by role
    const usersByRole = await this.prisma.userRole.groupBy({
      by: ['roleId'],
      _count: { roleId: true },
    });

    // Get role information separately
    const roleIds = usersByRole.map(item => item.roleId);
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, slug: true },
    });

    const usersByRoleMap: Record<string, number> = {};
    usersByRole.forEach(item => {
      const role = roles.find(r => r.id === item.roleId);
      if (role) {
        usersByRoleMap[role.slug] = item._count.roleId;
      }
    });

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      usersByRole: usersByRoleMap,
      recentRegistrations,
    };
  }

  // ============================================
  // USER ACTIVITY
  // ============================================

  async getUserActivity(userId: string): Promise<UserActivityDto[]> {
    const activities = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return activities.map(activity => ({
      userId: activity.userId,
      type: activity.action,
      description: activity.description || `${activity.action} ${activity.resource}`,
      ipAddress: activity.ipAddress || undefined,
      userAgent: activity.userAgent || undefined,
      createdAt: activity.createdAt,
    }));
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

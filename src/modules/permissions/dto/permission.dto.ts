import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class PermissionDto {
  @ApiProperty({ description: 'Permission ID' })
  id: string;

  @ApiProperty({ description: 'Resource slug' })
  resource: string;

  @ApiProperty({ description: 'Action slug' })
  action: string;

  @ApiProperty({ description: 'Permission description' })
  description?: string;

  @ApiProperty({ description: 'Permission conditions' })
  conditions?: any;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class ResourceDto {
  @ApiProperty({ description: 'Resource ID' })
  id: string;

  @ApiProperty({ description: 'Resource name' })
  name: string;

  @ApiProperty({ description: 'Resource slug' })
  slug: string;

  @ApiProperty({ description: 'Resource description' })
  description?: string;

  @ApiProperty({ description: 'Parent resource ID' })
  parentId?: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class ActionDto {
  @ApiProperty({ description: 'Action ID' })
  id: string;

  @ApiProperty({ description: 'Action name' })
  name: string;

  @ApiProperty({ description: 'Action slug' })
  slug: string;

  @ApiProperty({ description: 'Action description' })
  description?: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class RoleDto {
  @ApiProperty({ description: 'Role ID' })
  id: string;

  @ApiProperty({ description: 'Role name' })
  name: string;

  @ApiProperty({ description: 'Role slug' })
  slug: string;

  @ApiProperty({ description: 'Role description' })
  description?: string;

  @ApiProperty({ description: 'Is system role' })
  isSystemRole: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class RolePermissionDto {
  @ApiProperty({ description: 'Role permission ID' })
  id: string;

  @ApiProperty({ description: 'Role ID' })
  roleId: string;

  @ApiProperty({ description: 'Permission ID' })
  permissionId: string;

  @ApiProperty({ description: 'Is granted' })
  granted: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

export class UserRoleDto {
  @ApiProperty({ description: 'User role ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Role ID' })
  roleId: string;

  @ApiProperty({ description: 'Assigned at' })
  assignedAt: Date;

  @ApiProperty({ description: 'Assigned by ID' })
  assignedById?: string;
}

export class CreateRoleDto {
  @ApiProperty({ description: 'Role name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Role slug' })
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Role description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto {
  @ApiProperty({ description: 'Role name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Role description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Role ID' })
  @IsString()
  roleId: string;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ description: 'Permission ID' })
  permissionId: string;

  @ApiProperty({ description: 'Is granted' })
  granted: boolean;
}

export class PermissionStatsDto {
  @ApiProperty({ description: 'Total permissions' })
  totalPermissions: number;

  @ApiProperty({ description: 'Total resources' })
  totalResources: number;

  @ApiProperty({ description: 'Total actions' })
  totalActions: number;

  @ApiProperty({ description: 'Total roles' })
  totalRoles: number;

  @ApiProperty({ description: 'Total users' })
  totalUsers: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';

export class UserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User full name' })
  fullName: string;

  @ApiProperty({ description: 'User status' })
  status: string;

  @ApiProperty({ description: 'Email verified' })
  emailVerified: boolean;

  @ApiProperty({ description: 'Last login at' })
  lastLoginAt?: Date;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  @ApiProperty({ description: 'Created by ID' })
  createdById?: string;

  @ApiProperty({ description: 'User roles' })
  roles?: string[];

  @ApiProperty({ description: 'User permissions' })
  permissions?: string[];
}

export class CreateUserDto {
  @ApiProperty({ description: 'User email' })
  @IsEmail()
  @IsString()
  email: string;

  @ApiProperty({ description: 'User full name' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'User status', default: 'pending_approval' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Email verified', default: false })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

export class UpdateUserDto {
  @ApiProperty({ description: 'User full name', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'User status', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Email verified', required: false })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  newPassword: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'User email' })
  @IsEmail()
  @IsString()
  email: string;
}

export class ApproveUserDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Approval status' })
  @IsBoolean()
  approved: boolean;
}

export class AssignRoleDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Role ID' })
  @IsString()
  roleId: string;
}

export class QueryUsersDto {
  @ApiProperty({ description: 'Page number', required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ description: 'Search term', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Status filter', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Role filter', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Sort field', required: false, default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ description: 'Sort order', required: false, default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class UserStatsDto {
  @ApiProperty({ description: 'Total users' })
  totalUsers: number;

  @ApiProperty({ description: 'Active users' })
  activeUsers: number;

  @ApiProperty({ description: 'Pending users' })
  pendingUsers: number;

  @ApiProperty({ description: 'Suspended users' })
  suspendedUsers: number;

  @ApiProperty({ description: 'Users by role' })
  usersByRole: Record<string, number>;

  @ApiProperty({ description: 'Recent registrations' })
  recentRegistrations: number;
}

export class UserActivityDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Activity type' })
  type: string;

  @ApiProperty({ description: 'Activity description' })
  description: string;

  @ApiProperty({ description: 'IP address' })
  ipAddress?: string;

  @ApiProperty({ description: 'User agent' })
  userAgent?: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

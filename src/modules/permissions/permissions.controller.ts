import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
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

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ============================================
  // PERMISSIONS
  // ============================================

  @Get()
  @RequirePermission('permissions:read')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'List of all permissions' })
  async getAllPermissions(): Promise<PermissionDto[]> {
    return this.permissionsService.getAllPermissions();
  }

  @Get('by-resource/:resourceSlug')
  @RequirePermission('permissions:read')
  @ApiOperation({ summary: 'Get permissions by resource' })
  @ApiResponse({ status: 200, description: 'List of permissions for a specific resource' })
  async getPermissionsByResource(@Param('resourceSlug') resourceSlug: string): Promise<PermissionDto[]> {
    return this.permissionsService.getPermissionsByResource(resourceSlug);
  }

  // ============================================
  // RESOURCES
  // ============================================

  @Get('resources')
  @RequirePermission('permissions:read')
  @ApiOperation({ summary: 'Get all resources' })
  @ApiResponse({ status: 200, description: 'List of all resources' })
  async getAllResources(): Promise<ResourceDto[]> {
    return this.permissionsService.getAllResources();
  }

  // ============================================
  // ACTIONS
  // ============================================

  @Get('actions')
  @RequirePermission('permissions:read')
  @ApiOperation({ summary: 'Get all actions' })
  @ApiResponse({ status: 200, description: 'List of all actions' })
  async getAllActions(): Promise<ActionDto[]> {
    return this.permissionsService.getAllActions();
  }

  // ============================================
  // ROLES
  // ============================================

  @Get('roles')
  @RequirePermission('roles:read')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiResponse({ status: 200, description: 'List of all roles' })
  async getAllRoles(): Promise<RoleDto[]> {
    return this.permissionsService.getAllRoles();
  }

  @Get('roles/:id')
  @RequirePermission('roles:read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  async getRoleById(@Param('id') id: string): Promise<RoleDto> {
    return this.permissionsService.getRoleById(id);
  }

  @Post('roles')
  @RequirePermission('roles:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  async createRole(@Body() createRoleDto: CreateRoleDto): Promise<RoleDto> {
    return this.permissionsService.createRole(createRoleDto);
  }

  @Put('roles/:id')
  @RequirePermission('roles:update')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  async updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto): Promise<RoleDto> {
    return this.permissionsService.updateRole(id, updateRoleDto);
  }

  @Delete('roles/:id')
  @RequirePermission('roles:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  async deleteRole(@Param('id') id: string): Promise<void> {
    return this.permissionsService.deleteRole(id);
  }

  // ============================================
  // ROLE PERMISSIONS
  // ============================================

  @Get('roles/:roleId/permissions')
  @RequirePermission('roles:read')
  @ApiOperation({ summary: 'Get role permissions' })
  @ApiResponse({ status: 200, description: 'List of role permissions' })
  async getRolePermissions(@Param('roleId') roleId: string): Promise<RolePermissionDto[]> {
    return this.permissionsService.getRolePermissions(roleId);
  }

  @Put('roles/:roleId/permissions')
  @RequirePermission('roles:manage')
  @ApiOperation({ summary: 'Update role permissions' })
  @ApiResponse({ status: 200, description: 'Role permissions updated successfully' })
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() permissions: UpdateRolePermissionsDto[]
  ): Promise<void> {
    return this.permissionsService.updateRolePermissions(roleId, permissions);
  }

  // ============================================
  // USER ROLES
  // ============================================

  @Get('users/:userId/roles')
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'Get user roles' })
  @ApiResponse({ status: 200, description: 'List of user roles' })
  async getUserRoles(@Param('userId') userId: string): Promise<UserRoleDto[]> {
    return this.permissionsService.getUserRoles(userId);
  }

  @Post('users/assign-role')
  @RequirePermission('users:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  async assignRoleToUser(@Body() assignRoleDto: AssignRoleDto): Promise<UserRoleDto> {
    return this.permissionsService.assignRoleToUser(assignRoleDto);
  }

  @Delete('users/:userId/roles/:roleId')
  @RequirePermission('users:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 204, description: 'Role removed successfully' })
  async removeRoleFromUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string
  ): Promise<void> {
    return this.permissionsService.removeRoleFromUser(userId, roleId);
  }

  // ============================================
  // USER PERMISSIONS
  // ============================================

  @Get('users/:userId/permissions')
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiResponse({ status: 200, description: 'List of user permissions' })
  async getUserPermissions(@Param('userId') userId: string): Promise<string[]> {
    return this.permissionsService.getUserPermissions(userId);
  }

  // ============================================
  // STATISTICS
  // ============================================

  @Get('stats')
  @RequirePermission('permissions:read')
  @ApiOperation({ summary: 'Get permission statistics' })
  @ApiResponse({ status: 200, description: 'Permission statistics' })
  async getPermissionStats(): Promise<PermissionStatsDto> {
    return this.permissionsService.getPermissionStats();
  }
}

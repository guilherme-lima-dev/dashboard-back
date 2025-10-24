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
import { UsersService } from './users.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
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

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============================================
  // USER CRUD
  // ============================================

  @Get()
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'Get all users with filters and pagination' })
  @ApiResponse({ status: 200, description: 'List of users with pagination' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    return this.usersService.findAll({
      page,
      limit,
      search,
      status,
      role,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  async findById(@Param('id') id: string): Promise<UserDto> {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermission('users:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @RequirePermission('users:update')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<UserDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @RequirePermission('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.usersService.delete(id);
  }

  // ============================================
  // PASSWORD MANAGEMENT
  // ============================================

  @Put(':id/change-password')
  @RequirePermission('users:update')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto): Promise<void> {
    return this.usersService.changePassword(id, changePasswordDto);
  }

  @Post('reset-password')
  @RequirePermission('users:manage')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<void> {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  // ============================================
  // USER APPROVAL
  // ============================================

  @Post('approve')
  @RequirePermission('users:manage')
  @ApiOperation({ summary: 'Approve or reject user' })
  @ApiResponse({ status: 200, description: 'User approval status updated' })
  async approveUser(@Body() approveUserDto: ApproveUserDto): Promise<UserDto> {
    return this.usersService.approveUser(approveUserDto);
  }

  // ============================================
  // ROLE MANAGEMENT
  // ============================================

  @Post('assign-role')
  @RequirePermission('users:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Assign role to user' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  async assignRole(@Body() assignRoleDto: AssignRoleDto): Promise<void> {
    return this.usersService.assignRole(assignRoleDto);
  }

  @Delete(':userId/roles/:roleId')
  @RequirePermission('users:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 204, description: 'Role removed successfully' })
  async removeRole(@Param('userId') userId: string, @Param('roleId') roleId: string): Promise<void> {
    return this.usersService.removeRole(userId, roleId);
  }

  // ============================================
  // USER PERMISSIONS
  // ============================================

  @Get(':id/permissions')
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiResponse({ status: 200, description: 'List of user permissions' })
  async getUserPermissions(@Param('id') id: string): Promise<string[]> {
    return this.usersService.getUserPermissions(id);
  }

  // ============================================
  // USER ACTIVITY
  // ============================================

  @Get(':id/activity')
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'Get user activity log' })
  @ApiResponse({ status: 200, description: 'List of user activities' })
  async getUserActivity(@Param('id') id: string): Promise<UserActivityDto[]> {
    return this.usersService.getUserActivity(id);
  }

  // ============================================
  // STATISTICS
  // ============================================

  @Get('stats/overview')
  @RequirePermission('users:read')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics overview' })
  async getUserStats(): Promise<UserStatsDto> {
    return this.usersService.getUserStats();
  }
}
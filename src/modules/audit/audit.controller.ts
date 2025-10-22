import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { 
  CreateAuditLogDto, 
  AuditQueryDto, 
  AuditStatsDto, 
  AuditLogDto,
  CreateAuditAlertDto,
  AlertQueryDto,
  AuditAlertDto,
  AlertActionDto
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('logs')
  @RequirePermission('audit:create')
  @ApiOperation({ summary: 'Create audit log' })
  @ApiResponse({ status: 201, description: 'Audit log created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createLog(@Body() createAuditLogDto: CreateAuditLogDto): Promise<AuditLogDto> {
    return this.auditService.createLog(createAuditLogDto);
  }

  @Get('logs')
  @RequirePermission('audit:read')
  @ApiOperation({ summary: 'Get audit logs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getLogs(@Query() query: AuditQueryDto) {
    return this.auditService.getLogs(query);
  }

  @Get('logs/:id')
  @RequirePermission('audit:read')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getLogById(@Param('id') id: string): Promise<AuditLogDto> {
    return this.auditService.getLogById(id);
  }

  @Get('stats')
  @RequirePermission('audit:read')
  @ApiOperation({ summary: 'Get audit statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Audit statistics retrieved successfully',
    type: AuditStatsDto
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getStats(): Promise<AuditStatsDto> {
    return this.auditService.getStats();
  }

  @Post('alerts')
  @RequirePermission('audit:create')
  @ApiOperation({ summary: 'Create audit alert' })
  @ApiResponse({ status: 201, description: 'Audit alert created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createAlert(@Body() createAuditAlertDto: CreateAuditAlertDto): Promise<AuditAlertDto> {
    return this.auditService.createAlert(createAuditAlertDto);
  }

  @Get('alerts')
  @RequirePermission('audit:read')
  @ApiOperation({ summary: 'Get audit alerts with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Audit alerts retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getAlerts(@Query() query: AlertQueryDto) {
    return this.auditService.getAlerts(query);
  }

  @Get('alerts/:id')
  @RequirePermission('audit:read')
  @ApiOperation({ summary: 'Get audit alert by ID' })
  @ApiResponse({ status: 200, description: 'Audit alert retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Audit alert not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getAlertById(@Param('id') id: string): Promise<AuditAlertDto> {
    return this.auditService.getAlertById(id);
  }

  @Patch('alerts/:id/action')
  @RequirePermission('audit:update')
  @ApiOperation({ summary: 'Update alert status (acknowledge, resolve, dismiss)' })
  @ApiResponse({ status: 200, description: 'Alert status updated successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateAlertStatus(
    @Param('id') id: string,
    @Body() dto: AlertActionDto,
    // In a real implementation, you'd get the current user from the request context
    // For now, we'll use a placeholder
  ): Promise<AuditAlertDto> {
    const userId = 'current-user-id'; // This should come from the authenticated user
    return this.auditService.updateAlertStatus(id, dto, userId);
  }

  @Post('cleanup')
  @RequirePermission('audit:manage')
  @ApiOperation({ summary: 'Clean up old audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs cleaned up successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async cleanupOldLogs(@Query('days') days: string = '90') {
    const daysToKeep = parseInt(days, 10);
    const deletedCount = await this.auditService.cleanupOldLogs(daysToKeep);
    return {
      message: `Cleaned up ${deletedCount} old audit logs`,
      deletedCount,
      daysToKeep,
    };
  }
}

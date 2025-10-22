import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsDateString, IsUUID } from 'class-validator';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  RESET_PASSWORD = 'reset_password',
  CHANGE_PASSWORD = 'change_password',
  WEBHOOK_RECEIVED = 'webhook_received',
  WEBHOOK_PROCESSED = 'webhook_processed',
  WEBHOOK_FAILED = 'webhook_failed',
  METRICS_CALCULATED = 'metrics_calculated',
  REPORT_GENERATED = 'report_generated',
  AFFILIATE_TIER_UPDATED = 'affiliate_tier_updated',
  PAYMENT_PROCESSED = 'payment_processed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  CUSTOMER_CREATED = 'customer_created',
  CUSTOMER_UPDATED = 'customer_updated',
}

export enum AuditLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

export class CreateAuditLogDto {
  @ApiProperty({ description: 'User ID who performed the action' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Action performed', enum: AuditAction })
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({ description: 'Resource affected (e.g., user, product, order)' })
  @IsString()
  resource: string;

  @ApiPropertyOptional({ description: 'Resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Description of the action' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Audit level', enum: AuditLevel })
  @IsEnum(AuditLevel)
  level: AuditLevel;

  @ApiProperty({ description: 'Audit status', enum: AuditStatus })
  @IsEnum(AuditStatus)
  status: AuditStatus;

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Execution time in milliseconds' })
  @IsOptional()
  @IsString()
  executionTime?: number;
}

export class AuditLogDto {
  @ApiProperty({ description: 'Audit log ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Action performed', enum: AuditAction })
  action: AuditAction;

  @ApiProperty({ description: 'Resource affected' })
  resource: string;

  @ApiPropertyOptional({ description: 'Resource ID' })
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @ApiProperty({ description: 'Audit level', enum: AuditLevel })
  level: AuditLevel;

  @ApiProperty({ description: 'Audit status', enum: AuditStatus })
  status: AuditStatus;

  @ApiPropertyOptional({ description: 'IP address' })
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User agent' })
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Error message' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Execution time in milliseconds' })
  executionTime?: number;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;
}

export class AuditQueryDto {
  @ApiPropertyOptional({ description: 'User ID filter' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Action filter' })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ description: 'Resource filter' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ description: 'Level filter' })
  @IsOptional()
  @IsEnum(AuditLevel)
  level?: AuditLevel;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class AuditStatsDto {
  @ApiProperty({ description: 'Total audit logs count' })
  totalLogs: number;

  @ApiProperty({ description: 'Logs by level' })
  logsByLevel: {
    info: number;
    warning: number;
    error: number;
    critical: number;
  };

  @ApiProperty({ description: 'Logs by status' })
  logsByStatus: {
    success: number;
    failed: number;
    pending: number;
  };

  @ApiProperty({ description: 'Most common actions' })
  topActions: Array<{
    action: string;
    count: number;
  }>;

  @ApiProperty({ description: 'Most active users' })
  topUsers: Array<{
    userId: string;
    userName?: string;
    count: number;
  }>;

  @ApiProperty({ description: 'Recent critical events' })
  recentCriticalEvents: AuditLogDto[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsBoolean, IsArray } from 'class-validator';

export enum AlertType {
  ERROR_RATE_HIGH = 'error_rate_high',
  CRITICAL_EVENT = 'critical_event',
  FAILED_LOGIN_ATTEMPTS = 'failed_login_attempts',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SYSTEM_ERROR = 'system_error',
  WEBHOOK_FAILURE = 'webhook_failure',
  PAYMENT_FAILURE = 'payment_failure',
  DATA_BREACH = 'data_breach',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  SECURITY_VIOLATION = 'security_violation',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export class CreateAuditAlertDto {
  @ApiProperty({ description: 'Alert type', enum: AlertType })
  @IsEnum(AlertType)
  type: AlertType;

  @ApiProperty({ description: 'Alert severity', enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({ description: 'Alert title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Alert description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Resource affected' })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({ description: 'Resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is alert active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AuditAlertDto {
  @ApiProperty({ description: 'Alert ID' })
  id: string;

  @ApiProperty({ description: 'Alert type', enum: AlertType })
  type: AlertType;

  @ApiProperty({ description: 'Alert severity', enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiProperty({ description: 'Alert status', enum: AlertStatus })
  status: AlertStatus;

  @ApiProperty({ description: 'Alert title' })
  title: string;

  @ApiProperty({ description: 'Alert description' })
  description: string;

  @ApiPropertyOptional({ description: 'Resource affected' })
  resource?: string;

  @ApiPropertyOptional({ description: 'Resource ID' })
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Is alert active' })
  isActive: boolean;

  @ApiProperty({ description: 'Acknowledged by user ID' })
  acknowledgedBy?: string;

  @ApiProperty({ description: 'Acknowledged at' })
  acknowledgedAt?: Date;

  @ApiProperty({ description: 'Resolved by user ID' })
  resolvedBy?: string;

  @ApiProperty({ description: 'Resolved at' })
  resolvedAt?: Date;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}

export class AlertQueryDto {
  @ApiPropertyOptional({ description: 'Alert type filter' })
  @IsOptional()
  @IsEnum(AlertType)
  type?: AlertType;

  @ApiPropertyOptional({ description: 'Severity filter' })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional({ description: 'Active status filter' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', default: 'desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class AlertActionDto {
  @ApiProperty({ description: 'Action to perform', enum: ['acknowledge', 'resolve', 'dismiss'] })
  @IsEnum(['acknowledge', 'resolve', 'dismiss'])
  action: 'acknowledge' | 'resolve' | 'dismiss';

  @ApiPropertyOptional({ description: 'Comment about the action' })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class AlertNotificationDto {
  @ApiProperty({ description: 'Notification channels', isArray: true })
  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @ApiProperty({ description: 'Alert message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Alert metadata' })
  @IsObject()
  metadata: Record<string, any>;
}

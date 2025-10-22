import { IsString, IsEnum, IsOptional, IsDateString, IsNumber, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SyncType {
  SUBSCRIPTIONS = 'subscriptions',
  TRANSACTIONS = 'transactions',
  CUSTOMERS = 'customers',
  AFFILIATES = 'affiliates',
}

export enum SyncStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class CreateSyncLogDto {
  @ApiProperty({ description: 'Platform ID' })
  @IsString()
  platformId: string;

  @ApiProperty({ enum: SyncType, description: 'Type of sync' })
  @IsEnum(SyncType)
  syncType: SyncType;

  @ApiProperty({ enum: SyncStatus, description: 'Sync status' })
  @IsEnum(SyncStatus)
  status: SyncStatus;

  @ApiProperty({ description: 'Sync start time' })
  @IsDateString()
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Number of records synced' })
  @IsOptional()
  @IsNumber()
  recordsSynced?: number;

  @ApiPropertyOptional({ description: 'Number of records that failed' })
  @IsOptional()
  @IsNumber()
  recordsFailed?: number;

  @ApiPropertyOptional({ description: 'Number of missing records found' })
  @IsOptional()
  @IsNumber()
  missingRecordsFound?: number;

  @ApiPropertyOptional({ description: 'Error details' })
  @IsOptional()
  @IsObject()
  errorDetails?: any;
}

export class UpdateSyncLogDto {
  @ApiPropertyOptional({ enum: SyncStatus, description: 'Sync status' })
  @IsOptional()
  @IsEnum(SyncStatus)
  status?: SyncStatus;

  @ApiPropertyOptional({ description: 'Sync completion time' })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Number of records synced' })
  @IsOptional()
  @IsNumber()
  recordsSynced?: number;

  @ApiPropertyOptional({ description: 'Number of records that failed' })
  @IsOptional()
  @IsNumber()
  recordsFailed?: number;

  @ApiPropertyOptional({ description: 'Number of missing records found' })
  @IsOptional()
  @IsNumber()
  missingRecordsFound?: number;

  @ApiPropertyOptional({ description: 'Error details' })
  @IsOptional()
  @IsObject()
  errorDetails?: any;
}

export class SyncLogDto {
  @ApiProperty({ description: 'Sync log ID' })
  id: string;

  @ApiProperty({ description: 'Platform ID' })
  platformId: string;

  @ApiProperty({ enum: SyncType, description: 'Type of sync' })
  syncType: SyncType;

  @ApiProperty({ enum: SyncStatus, description: 'Sync status' })
  status: SyncStatus;

  @ApiProperty({ description: 'Sync start time' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Sync completion time' })
  completedAt?: Date;

  @ApiProperty({ description: 'Number of records synced' })
  recordsSynced: number;

  @ApiProperty({ description: 'Number of records that failed' })
  recordsFailed: number;

  @ApiProperty({ description: 'Number of missing records found' })
  missingRecordsFound: number;

  @ApiPropertyOptional({ description: 'Error details' })
  errorDetails?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class SyncStatsDto {
  @ApiProperty({ description: 'Total number of syncs' })
  totalSyncs: number;

  @ApiProperty({ description: 'Number of successful syncs' })
  successfulSyncs: number;

  @ApiProperty({ description: 'Number of failed syncs' })
  failedSyncs: number;

  @ApiProperty({ description: 'Total records synced' })
  totalRecordsSynced: number;

  @ApiProperty({ description: 'Total missing records found' })
  totalMissingFound: number;

  @ApiProperty({ description: 'Average sync duration in seconds' })
  avgSyncDuration: number;
}

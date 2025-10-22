import { IsOptional, IsString, IsDateString, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReportType {
  REVENUE = 'revenue',
  SUBSCRIPTIONS = 'subscriptions',
  CUSTOMERS = 'customers',
  CHURN = 'churn',
  AFFILIATES = 'affiliates',
  COHORT = 'cohort',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
}

export class GenerateReportDto {
  @ApiProperty({ enum: ReportType, description: 'Type of report to generate' })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ required: false, description: 'Start date for report data' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date for report data' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, description: 'Platform IDs to include in report' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platformIds?: string[];

  @ApiProperty({ required: false, description: 'Product IDs to include in report' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiProperty({ required: false, description: 'Affiliate IDs to include in report' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affiliateIds?: string[];

  @ApiProperty({ required: false, enum: ReportFormat, description: 'Output format for the report' })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;
}

export class ReportStatusDto {
  @ApiProperty({ description: 'Report ID' })
  id: string;

  @ApiProperty({ description: 'Report type' })
  type: ReportType;

  @ApiProperty({ description: 'Report status' })
  status: string;

  @ApiProperty({ description: 'Report progress percentage' })
  progress: number;

  @ApiProperty({ description: 'Download URL if ready' })
  downloadUrl?: string;

  @ApiProperty({ description: 'Error message if failed' })
  error?: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Completed at timestamp' })
  completedAt?: string;
}

export class ReportDataDto {
  @ApiProperty({ description: 'Report title' })
  title: string;

  @ApiProperty({ description: 'Report description' })
  description: string;

  @ApiProperty({ description: 'Generated at timestamp' })
  generatedAt: string;

  @ApiProperty({ description: 'Data period start' })
  periodStart: string;

  @ApiProperty({ description: 'Data period end' })
  periodEnd: string;

  @ApiProperty({ description: 'Report data' })
  data: any;
}

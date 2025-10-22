import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MetricPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class MetricsQueryDto {
  @ApiProperty({ required: false, description: 'Start date for metrics range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date for metrics range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false, description: 'Platform ID to filter metrics' })
  @IsOptional()
  @IsString()
  platformId?: string;

  @ApiProperty({ required: false, description: 'Product ID to filter metrics' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ required: false, enum: MetricPeriod, description: 'Period grouping for metrics' })
  @IsOptional()
  @IsEnum(MetricPeriod)
  period?: MetricPeriod;
}

export class RevenueMetricsDto {
  @ApiProperty({ description: 'Monthly Recurring Revenue in BRL' })
  mrrBrl: number;

  @ApiProperty({ description: 'Monthly Recurring Revenue in USD' })
  mrrUsd: number;

  @ApiProperty({ description: 'Annual Recurring Revenue in BRL' })
  arrBrl: number;

  @ApiProperty({ description: 'Annual Recurring Revenue in USD' })
  arrUsd: number;

  @ApiProperty({ description: 'Total revenue in BRL' })
  revenueBrl: number;

  @ApiProperty({ description: 'Total revenue in USD' })
  revenueUsd: number;

  @ApiProperty({ description: 'Total refunds in BRL' })
  refundsBrl: number;

  @ApiProperty({ description: 'Total refunds in USD' })
  refundsUsd: number;
}

export class SubscriptionMetricsDto {
  @ApiProperty({ description: 'Number of active subscriptions' })
  activeSubscriptionsCount: number;

  @ApiProperty({ description: 'Number of trial subscriptions' })
  trialSubscriptionsCount: number;

  @ApiProperty({ description: 'Number of canceled subscriptions' })
  canceledSubscriptionsCount: number;

  @ApiProperty({ description: 'Number of new subscriptions' })
  newSubscriptionsCount: number;

  @ApiProperty({ description: 'Churn count' })
  churnCount: number;

  @ApiProperty({ description: 'Churn rate percentage' })
  churnRate: number;

  @ApiProperty({ description: 'Trial conversion rate percentage' })
  trialConversionRate: number;
}

export class CustomerMetricsDto {
  @ApiProperty({ description: 'Number of new customers' })
  newCustomersCount: number;

  @ApiProperty({ description: 'Total customers count' })
  totalCustomersCount: number;

  @ApiProperty({ description: 'Average Revenue Per User in BRL' })
  averageRevenuePerUserBrl: number;

  @ApiProperty({ description: 'Average Revenue Per User in USD' })
  averageRevenuePerUserUsd: number;

  @ApiProperty({ description: 'Customer Lifetime Value in BRL' })
  customerLifetimeValueBrl: number;

  @ApiProperty({ description: 'Customer Lifetime Value in USD' })
  customerLifetimeValueUsd: number;
}

export class DashboardMetricsDto {
  @ApiProperty({ type: RevenueMetricsDto })
  revenue: RevenueMetricsDto;

  @ApiProperty({ type: SubscriptionMetricsDto })
  subscriptions: SubscriptionMetricsDto;

  @ApiProperty({ type: CustomerMetricsDto })
  customers: CustomerMetricsDto;

  @ApiProperty({ description: 'Date of the metrics' })
  date: string;
}

export class CohortAnalysisDto {
  @ApiProperty({ description: 'Cohort date' })
  cohortDate: string;

  @ApiProperty({ description: 'Period number' })
  period: number;

  @ApiProperty({ description: 'Number of customers in cohort' })
  customersCount: number;

  @ApiProperty({ description: 'Number of retained customers' })
  retainedCount: number;

  @ApiProperty({ description: 'Retention rate percentage' })
  retentionRate: number;

  @ApiProperty({ description: 'Revenue in BRL' })
  revenueBrl: number;

  @ApiProperty({ description: 'Revenue in USD' })
  revenueUsd: number;
}

export class AffiliateMetricsDto {
  @ApiProperty({ description: 'Affiliate ID' })
  affiliateId: string;

  @ApiProperty({ description: 'Number of sales' })
  salesCount: number;

  @ApiProperty({ description: 'Revenue in BRL' })
  revenueBrl: number;

  @ApiProperty({ description: 'Revenue in USD' })
  revenueUsd: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  conversionRate: number;

  @ApiProperty({ description: 'Number of new customers' })
  newCustomersCount: number;

  @ApiProperty({ description: 'Number of repeat customers' })
  repeatCustomersCount: number;
}

import { Controller, Get, Post, Query, Param, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { ReportsService } from './reports.service';
import { MetricsQueryDto, GenerateReportDto, ReportStatusDto } from './dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly reportsService: ReportsService,
  ) {}

  @Get('dashboard')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  async getDashboardMetrics(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getDashboardMetrics(query);
  }

  @Get('revenue')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get revenue metrics' })
  @ApiResponse({ status: 200, description: 'Revenue metrics retrieved successfully' })
  async getRevenueMetrics(@Query() query: MetricsQueryDto) {
    const where = this.buildWhereClause(query);
    return this.analyticsService.getRevenueMetrics(where);
  }

  @Get('subscriptions')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get subscription metrics' })
  @ApiResponse({ status: 200, description: 'Subscription metrics retrieved successfully' })
  async getSubscriptionMetrics(@Query() query: MetricsQueryDto) {
    const where = this.buildWhereClause(query);
    return this.analyticsService.getSubscriptionMetrics(where);
  }

  @Get('customers')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get customer metrics' })
  @ApiResponse({ status: 200, description: 'Customer metrics retrieved successfully' })
  async getCustomerMetrics(@Query() query: MetricsQueryDto) {
    const where = this.buildWhereClause(query);
    return this.analyticsService.getCustomerMetrics(where);
  }

  @Get('cohort')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get cohort analysis' })
  @ApiResponse({ status: 200, description: 'Cohort analysis retrieved successfully' })
  async getCohortAnalysis(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getCohortAnalysis(query);
  }

  @Get('affiliates')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get affiliate metrics' })
  @ApiResponse({ status: 200, description: 'Affiliate metrics retrieved successfully' })
  async getAffiliateMetrics(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getAffiliateMetrics(query);
  }

  @Get('history')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get metrics history' })
  @ApiResponse({ status: 200, description: 'Metrics history retrieved successfully' })
  async getMetricsHistory(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getMetricsHistory(query);
  }

  @Get('revenue/trend')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get revenue trend data' })
  @ApiResponse({ status: 200, description: 'Revenue trend data retrieved successfully' })
  async getRevenueTrend(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getRevenueTrend(query);
  }

  @Get('revenue/by-product')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get revenue by product' })
  @ApiResponse({ status: 200, description: 'Revenue by product retrieved successfully' })
  async getRevenueByProduct(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getRevenueByProduct(query);
  }

  @Get('subscriptions/trend')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get subscription trend data' })
  @ApiResponse({ status: 200, description: 'Subscription trend data retrieved successfully' })
  async getSubscriptionTrend(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getSubscriptionTrend(query);
  }

  @Get('subscriptions/by-product')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get subscriptions by product' })
  @ApiResponse({ status: 200, description: 'Subscriptions by product retrieved successfully' })
  async getSubscriptionByProduct(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getSubscriptionByProduct(query);
  }

  @Get('activities')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get recent activities' })
  @ApiResponse({ status: 200, description: 'Recent activities retrieved successfully' })
  async getRecentActivities(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getRecentActivities(query);
  }

  @Post('reports')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Generate report' })
  @ApiResponse({ status: 201, description: 'Report generation started' })
  async generateReport(@Query() dto: GenerateReportDto): Promise<ReportStatusDto> {
    return this.reportsService.generateReport(dto);
  }

  @Get('reports/:reportId/status')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get report status' })
  @ApiResponse({ status: 200, description: 'Report status retrieved successfully' })
  async getReportStatus(@Param('reportId') reportId: string): Promise<ReportStatusDto | null> {
    return this.reportsService.getReportStatus(reportId);
  }

  @Get('reports/:reportId/download')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Download report' })
  @ApiResponse({ status: 200, description: 'Report downloaded successfully' })
  async downloadReport(
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ) {
    const reportData = await this.reportsService.downloadReport(reportId);
    
    if (!reportData) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'Report not found or not ready',
      });
    }

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="report_${reportId}.pdf"`,
    });

    return res.send(reportData);
  }

  private buildWhereClause(query: MetricsQueryDto): any {
    const where: any = {};

    if (query.startDate && query.endDate) {
      where.metricDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    } else if (query.startDate) {
      where.metricDate = {
        gte: new Date(query.startDate),
      };
    } else if (query.endDate) {
      where.metricDate = {
        lte: new Date(query.endDate),
      };
    }

    if (query.platformId) {
      where.platformId = query.platformId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    return where;
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateReportDto, ReportStatusDto, ReportType, ReportFormat } from './dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly reportJobs = new Map<string, any>();

  constructor(private readonly prisma: PrismaService) {}

  async generateReport(dto: GenerateReportDto): Promise<ReportStatusDto> {
    const reportId = this.generateReportId();
    
    this.logger.log(`Generating report ${dto.type} with ID ${reportId}`);

    const reportStatus: ReportStatusDto = {
      id: reportId,
      type: dto.type,
      status: 'processing',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    this.reportJobs.set(reportId, reportStatus);

    this.processReportAsync(reportId, dto);

    return reportStatus;
  }

  async getReportStatus(reportId: string): Promise<ReportStatusDto | null> {
    return this.reportJobs.get(reportId) || null;
  }

  async downloadReport(reportId: string): Promise<Buffer | null> {
    const report = this.reportJobs.get(reportId);
    
    if (!report || report.status !== 'completed') {
      return null;
    }

    return report.data;
  }

  private async processReportAsync(reportId: string, dto: GenerateReportDto): Promise<void> {
    try {
      const report = this.reportJobs.get(reportId);
      if (!report) return;

      report.progress = 10;
      this.logger.log(`Report ${reportId} progress: 10%`);

      const data = await this.collectReportData(dto);
      report.progress = 50;

      report.progress = 80;
      this.logger.log(`Report ${reportId} progress: 80%`);

      const reportData = this.formatReportData(dto, data);
      report.progress = 90;

      const fileBuffer = await this.generateFile(dto.format || ReportFormat.PDF, reportData);
      
      report.data = fileBuffer;
      report.status = 'completed';
      report.progress = 100;
      report.completedAt = new Date().toISOString();
      report.downloadUrl = `/reports/${reportId}/download`;

      this.logger.log(`Report ${reportId} completed successfully`);
    } catch (error) {
      this.logger.error(`Error generating report ${reportId}:`, error);
      
      const report = this.reportJobs.get(reportId);
      if (report) {
        report.status = 'failed';
        report.error = error.message;
      }
    }
  }

  private async collectReportData(dto: GenerateReportDto): Promise<any> {
    const whereClause = this.buildWhereClause(dto);

    switch (dto.type) {
      case ReportType.REVENUE:
        return this.collectRevenueData(whereClause);
      case ReportType.SUBSCRIPTIONS:
        return this.collectSubscriptionData(whereClause);
      case ReportType.CUSTOMERS:
        return this.collectCustomerData(whereClause);
      case ReportType.CHURN:
        return this.collectChurnData(whereClause);
      case ReportType.AFFILIATES:
        return this.collectAffiliateData(whereClause);
      case ReportType.COHORT:
        return this.collectCohortData(whereClause);
      default:
        throw new Error(`Unknown report type: ${dto.type}`);
    }
  }

  private async collectRevenueData(whereClause: any): Promise<any> {
    const metrics = await this.prisma.dailyMetrics.findMany({
      where: whereClause,
      orderBy: { metricDate: 'asc' },
    });

    return {
      title: 'Revenue Report',
      description: 'Monthly and annual recurring revenue analysis',
      data: metrics.map(m => ({
        date: m.metricDate.toISOString().split('T')[0],
        mrrBrl: Number(m.mrrBrl),
        mrrUsd: Number(m.mrrUsd),
        arrBrl: Number(m.arrBrl),
        arrUsd: Number(m.arrUsd),
        revenueBrl: Number(m.revenueBrl),
        revenueUsd: Number(m.revenueUsd),
        refundsBrl: Number(m.refundsBrl),
        refundsUsd: Number(m.refundsUsd),
      })),
    };
  }

  private async collectSubscriptionData(whereClause: any): Promise<any> {
    const metrics = await this.prisma.dailyMetrics.findMany({
      where: whereClause,
      orderBy: { metricDate: 'asc' },
    });

    return {
      title: 'Subscriptions Report',
      description: 'Subscription metrics and churn analysis',
      data: metrics.map(m => ({
        date: m.metricDate.toISOString().split('T')[0],
        activeSubscriptions: m.activeSubscriptionsCount,
        trialSubscriptions: m.trialSubscriptionsCount,
        canceledSubscriptions: m.canceledSubscriptionsCount,
        newSubscriptions: m.newSubscriptionsCount,
        churnCount: m.churnCount,
        churnRate: Number(m.churnRate),
        trialConversionRate: Number(m.trialConversionRate),
      })),
    };
  }

  private async collectCustomerData(whereClause: any): Promise<any> {
    const metrics = await this.prisma.dailyMetrics.findMany({
      where: whereClause,
      orderBy: { metricDate: 'asc' },
    });

    return {
      title: 'Customers Report',
      description: 'Customer acquisition and lifetime value analysis',
      data: metrics.map(m => ({
        date: m.metricDate.toISOString().split('T')[0],
        newCustomers: m.newCustomersCount,
        totalCustomers: m.totalCustomersCount,
        arpuBrl: Number(m.averageRevenuePerUserBrl),
        arpuUsd: Number(m.averageRevenuePerUserUsd),
        clvBrl: Number(m.customerLifetimeValueBrl),
        clvUsd: Number(m.customerLifetimeValueUsd),
      })),
    };
  }

  private async collectChurnData(whereClause: any): Promise<any> {
    const metrics = await this.prisma.dailyMetrics.findMany({
      where: whereClause,
      orderBy: { metricDate: 'asc' },
    });

    return {
      title: 'Churn Analysis Report',
      description: 'Customer churn and retention analysis',
      data: metrics.map(m => ({
        date: m.metricDate.toISOString().split('T')[0],
        churnCount: m.churnCount,
        churnRate: Number(m.churnRate),
        activeSubscriptions: m.activeSubscriptionsCount,
        canceledSubscriptions: m.canceledSubscriptionsCount,
      })),
    };
  }

  private async collectAffiliateData(whereClause: any): Promise<any> {
    const metrics = await this.prisma.affiliateMetrics.findMany({
      where: whereClause,
      orderBy: { revenueBrl: 'desc' },
    });

    return {
      title: 'Affiliates Report',
      description: 'Affiliate performance and revenue analysis',
      data: metrics.map(m => ({
        affiliateId: m.affiliateId,
        date: m.metricDate.toISOString().split('T')[0],
        salesCount: m.salesCount,
        revenueBrl: Number(m.revenueBrl),
        revenueUsd: Number(m.revenueUsd),
        conversionRate: Number(m.conversionRate),
        newCustomers: m.newCustomersCount,
        repeatCustomers: m.repeatCustomersCount,
      })),
    };
  }

  private async collectCohortData(whereClause: any): Promise<any> {
    const cohorts = await this.prisma.cohortAnalysis.findMany({
      where: whereClause,
      orderBy: [
        { cohortDate: 'desc' },
        { period: 'asc' },
      ],
    });

    return {
      title: 'Cohort Analysis Report',
      description: 'Customer retention by cohort analysis',
      data: cohorts.map(c => ({
        cohortDate: c.cohortDate.toISOString().split('T')[0],
        period: c.period,
        customersCount: c.customersCount,
        retainedCount: c.retainedCount,
        retentionRate: Number(c.retentionRate),
        revenueBrl: Number(c.revenueBrl),
        revenueUsd: Number(c.revenueUsd),
      })),
    };
  }

  private formatReportData(dto: GenerateReportDto, data: any): any {
    return {
      ...data,
      generatedAt: new Date().toISOString(),
      periodStart: dto.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      periodEnd: dto.endDate || new Date().toISOString().split('T')[0],
      filters: {
        platformIds: dto.platformIds,
        productIds: dto.productIds,
        affiliateIds: dto.affiliateIds,
      },
    };
  }

  private async generateFile(format: ReportFormat, data: any): Promise<Buffer> {
    switch (format) {
      case ReportFormat.CSV:
        return this.generateCSV(data);
      case ReportFormat.EXCEL:
        return this.generateExcel(data);
      case ReportFormat.PDF:
      default:
        return this.generatePDF(data);
    }
  }

  private async generateCSV(data: any): Promise<Buffer> {
    const csv = this.convertToCSV(data.data);
    return Buffer.from(csv, 'utf-8');
  }

  private async generateExcel(data: any): Promise<Buffer> {
    const csv = this.convertToCSV(data.data);
    return Buffer.from(csv, 'utf-8');
  }

  private async generatePDF(data: any): Promise<Buffer> {
    const html = this.convertToHTML(data);
    return Buffer.from(html, 'utf-8');
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  private convertToHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${data.title}</h1>
        <p>${data.description}</p>
        <p><strong>Generated:</strong> ${data.generatedAt}</p>
        <p><strong>Period:</strong> ${data.periodStart} to ${data.periodEnd}</p>
        <table>
          <thead>
            <tr>
              ${Object.keys(data.data[0] || {}).map(key => `<th>${key}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.data.map(row => `
              <tr>
                ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  private buildWhereClause(dto: GenerateReportDto): any {
    const where: any = {};

    if (dto.startDate && dto.endDate) {
      where.metricDate = {
        gte: new Date(dto.startDate),
        lte: new Date(dto.endDate),
      };
    }

    if (dto.platformIds && dto.platformIds.length > 0) {
      where.platformId = { in: dto.platformIds };
    }

    if (dto.productIds && dto.productIds.length > 0) {
      where.productId = { in: dto.productIds };
    }

    if (dto.affiliateIds && dto.affiliateIds.length > 0) {
      where.affiliateId = { in: dto.affiliateIds };
    }

    return where;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

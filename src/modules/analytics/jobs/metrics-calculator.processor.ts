import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { MetricsService } from '../metrics.service';

export interface MetricsCalculationJob {
  type: 'daily' | 'cohort' | 'affiliate';
  date: string;
  platformId?: string;
  productId?: string;
}

@Processor('metrics-calculator')
export class MetricsCalculatorProcessor {
  private readonly logger = new Logger(MetricsCalculatorProcessor.name);

  constructor(private readonly metricsService: MetricsService) {}

  @Process('calculate-daily-metrics')
  async handleDailyMetrics(job: Job<MetricsCalculationJob>) {
    const { date, platformId, productId } = job.data;
    
    this.logger.log(`Processing daily metrics calculation for ${date}`);
    
    try {
      await this.metricsService.calculateDailyMetrics(
        new Date(date),
        platformId,
        productId,
      );
      
      this.logger.log(`Daily metrics calculation completed for ${date}`);
    } catch (error) {
      this.logger.error(`Error calculating daily metrics for ${date}:`, error);
      throw error;
    }
  }

  @Process('calculate-cohort-analysis')
  async handleCohortAnalysis(job: Job<MetricsCalculationJob>) {
    const { date, platformId, productId } = job.data;
    
    this.logger.log(`Processing cohort analysis for ${date}`);
    
    try {
      await this.metricsService.calculateCohortAnalysis(
        new Date(date),
        platformId,
        productId,
      );
      
      this.logger.log(`Cohort analysis completed for ${date}`);
    } catch (error) {
      this.logger.error(`Error calculating cohort analysis for ${date}:`, error);
      throw error;
    }
  }

  @Process('calculate-affiliate-metrics')
  async handleAffiliateMetrics(job: Job<MetricsCalculationJob>) {
    const { date, platformId } = job.data;
    
    this.logger.log(`Processing affiliate metrics for ${date}`);
    
    try {
      await this.metricsService.calculateAffiliateMetrics(
        new Date(date),
        platformId,
      );
      
      this.logger.log(`Affiliate metrics calculation completed for ${date}`);
    } catch (error) {
      this.logger.error(`Error calculating affiliate metrics for ${date}:`, error);
      throw error;
    }
  }

  @Process('recalculate-all-metrics')
  async handleRecalculateAll(job: Job<{ startDate: string; endDate: string }>) {
    const { startDate, endDate } = job.data;
    
    this.logger.log(`Recalculating all metrics from ${startDate} to ${endDate}`);
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        await this.metricsService.calculateDailyMetrics(date);
        await this.metricsService.calculateCohortAnalysis(date);
        await this.metricsService.calculateAffiliateMetrics(date);
        
        this.logger.log(`Metrics calculated for ${date.toISOString().split('T')[0]}`);
      }
      
      this.logger.log(`All metrics recalculation completed`);
    } catch (error) {
      this.logger.error(`Error recalculating all metrics:`, error);
      throw error;
    }
  }
}

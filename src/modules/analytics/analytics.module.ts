import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { AnalyticsService } from './analytics.service';
import { MetricsService } from './metrics.service';
import { ReportsService } from './reports.service';
import { AnalyticsController } from './analytics.controller';
import { MetricsCalculatorProcessor } from './jobs/metrics-calculator.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'metrics-calculator',
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    MetricsService,
    ReportsService,
    MetricsCalculatorProcessor,
  ],
  exports: [
    AnalyticsService,
    MetricsService,
    ReportsService,
  ],
})
export class AnalyticsModule {}
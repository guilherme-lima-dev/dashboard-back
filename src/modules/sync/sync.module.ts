import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentProvidersModule } from '../payment-providers/payment-providers.module';
import { SyncLogsService } from './sync-logs.service';
import { SyncScheduler } from './sync-scheduler.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    PaymentProvidersModule,
  ],
  providers: [
    SyncLogsService,
    SyncScheduler,
  ],
  controllers: [
    SyncController,
  ],
  exports: [
    SyncLogsService,
    SyncScheduler,
  ],
})
export class SyncModule {}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSyncLogDto, UpdateSyncLogDto, SyncLogDto, SyncStatus } from './dto';

@Injectable()
export class SyncLogsService {
  private readonly logger = new Logger(SyncLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSyncLogDto): Promise<SyncLogDto> {
    this.logger.log(`Creating sync log for platform ${dto.platformId}, type ${dto.syncType}`);

    const syncLog = await this.prisma.syncLog.create({
      data: {
        platformId: dto.platformId,
        syncType: dto.syncType,
        status: dto.status,
        startedAt: dto.startedAt,
        recordsSynced: dto.recordsSynced || 0,
        recordsFailed: dto.recordsFailed || 0,
        missingRecordsFound: dto.missingRecordsFound || 0,
        errorDetails: dto.errorDetails,
      },
    });

    this.logger.log(`Sync log created: ${syncLog.id}`);
    return syncLog as SyncLogDto;
  }

  async update(id: string, dto: UpdateSyncLogDto): Promise<SyncLogDto> {
    this.logger.log(`Updating sync log: ${id}`);

    const syncLog = await this.prisma.syncLog.update({
      where: { id },
      data: {
        status: dto.status,
        completedAt: dto.completedAt,
        recordsSynced: dto.recordsSynced,
        recordsFailed: dto.recordsFailed,
        missingRecordsFound: dto.missingRecordsFound,
        errorDetails: dto.errorDetails,
      },
    });

    this.logger.log(`Sync log updated: ${id}`);
    return syncLog as SyncLogDto;
  }

  async complete(id: string, data: {
    status: SyncStatus.COMPLETED | SyncStatus.FAILED;
    completedAt: Date;
    recordsSynced?: number;
    recordsFailed?: number;
    missingRecordsFound?: number;
    errorDetails?: any;
  }): Promise<SyncLogDto> {
    return this.update(id, data);
  }

  async fail(id: string, error: Error): Promise<SyncLogDto> {
    return this.update(id, {
      status: SyncStatus.FAILED,
      completedAt: new Date(),
      errorDetails: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async findRecent(platformId: string, syncType: string, hours: number = 24): Promise<SyncLogDto[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const syncLogs = await this.prisma.syncLog.findMany({
      where: {
        platformId,
        syncType,
        startedAt: { gte: since },
      },
      orderBy: { startedAt: 'desc' },
    });

    return syncLogs as SyncLogDto[];
  }

  async getStats(platformId?: string, days: number = 7): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    totalRecordsSynced: number;
    totalMissingFound: number;
    avgSyncDuration: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const whereClause = {
      startedAt: { gte: since },
      ...(platformId && { platformId }),
    };

    const [totalSyncs, successfulSyncs, failedSyncs, recordsStats] = await Promise.all([
      this.prisma.syncLog.count({ where: whereClause }),
      this.prisma.syncLog.count({ where: { ...whereClause, status: 'completed' } }),
      this.prisma.syncLog.count({ where: { ...whereClause, status: 'failed' } }),
      this.prisma.syncLog.aggregate({
        where: whereClause,
        _sum: {
          recordsSynced: true,
          missingRecordsFound: true,
        },
        _avg: {
          recordsSynced: true,
        },
      }),
    ]);

    const completedSyncs = await this.prisma.syncLog.findMany({
      where: { ...whereClause, status: 'completed' },
      select: { startedAt: true, completedAt: true },
    });

    const avgSyncDuration = completedSyncs.length > 0
      ? completedSyncs.reduce((acc, sync) => {
          const duration = sync.completedAt!.getTime() - sync.startedAt.getTime();
          return acc + duration;
        }, 0) / completedSyncs.length / 1000 // Convert to seconds
      : 0;

    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      totalRecordsSynced: recordsStats._sum.recordsSynced || 0,
      totalMissingFound: recordsStats._sum.missingRecordsFound || 0,
      avgSyncDuration,
    };
  }
}

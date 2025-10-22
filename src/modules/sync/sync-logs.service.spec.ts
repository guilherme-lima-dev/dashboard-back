import { Test, TestingModule } from '@nestjs/testing';
import { SyncLogsService } from './sync-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSyncLogDto, UpdateSyncLogDto, SyncType, SyncStatus } from './dto';

describe('SyncLogsService', () => {
  let service: SyncLogsService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      syncLog: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncLogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SyncLogsService>(SyncLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a sync log', async () => {
      const dto: CreateSyncLogDto = {
        platformId: 'platform-1',
        syncType: SyncType.SUBSCRIPTIONS,
        status: SyncStatus.RUNNING,
        startedAt: new Date(),
      };

      const expectedSyncLog = {
        id: 'sync-log-1',
        ...dto,
        recordsSynced: 0,
        recordsFailed: 0,
        missingRecordsFound: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.syncLog.create.mockResolvedValue(expectedSyncLog);

      const result = await service.create(dto);

      expect(mockPrismaService.syncLog.create).toHaveBeenCalledWith({
        data: {
          platformId: dto.platformId,
          syncType: dto.syncType,
          status: dto.status,
          startedAt: dto.startedAt,
          recordsSynced: 0,
          recordsFailed: 0,
          missingRecordsFound: 0,
          errorDetails: undefined,
        },
      });
      expect(result).toEqual(expectedSyncLog);
    });
  });

  describe('update', () => {
    it('should update a sync log', async () => {
      const id = 'sync-log-1';
      const dto: UpdateSyncLogDto = {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        recordsSynced: 10,
        recordsFailed: 2,
        missingRecordsFound: 1,
      };

      const expectedSyncLog = {
        id,
        ...dto,
        platformId: 'platform-1',
        syncType: SyncType.SUBSCRIPTIONS,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.syncLog.update.mockResolvedValue(expectedSyncLog);

      const result = await service.update(id, dto);

      expect(mockPrismaService.syncLog.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
      });
      expect(result).toEqual(expectedSyncLog);
    });
  });

  describe('complete', () => {
    it('should complete a sync log', async () => {
      const id = 'sync-log-1';
      const data = {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        recordsSynced: 10,
        recordsFailed: 2,
        missingRecordsFound: 1,
      };

      const expectedSyncLog = {
        id,
        ...data,
        platformId: 'platform-1',
        syncType: SyncType.SUBSCRIPTIONS,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.syncLog.update.mockResolvedValue(expectedSyncLog);

      const result = await service.complete(id, data);

      expect(mockPrismaService.syncLog.update).toHaveBeenCalledWith({
        where: { id },
        data,
      });
      expect(result).toEqual(expectedSyncLog);
    });
  });

  describe('fail', () => {
    it('should fail a sync log with error details', async () => {
      const id = 'sync-log-1';
      const error = new Error('Sync failed');

      const expectedSyncLog = {
        id,
        status: SyncStatus.FAILED,
        completedAt: expect.any(Date),
        errorDetails: {
          message: error.message,
          stack: error.stack,
          timestamp: expect.any(String),
        },
        platformId: 'platform-1',
        syncType: SyncType.SUBSCRIPTIONS,
        startedAt: new Date(),
        recordsSynced: 0,
        recordsFailed: 0,
        missingRecordsFound: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.syncLog.update.mockResolvedValue(expectedSyncLog);

      const result = await service.fail(id, error);

      expect(mockPrismaService.syncLog.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          status: SyncStatus.FAILED,
          completedAt: expect.any(Date),
          errorDetails: {
            message: error.message,
            stack: error.stack,
            timestamp: expect.any(String),
          },
        },
      });
      expect(result).toEqual(expectedSyncLog);
    });
  });

  describe('findRecent', () => {
    it('should find recent sync logs', async () => {
      const platformId = 'platform-1';
      const syncType = SyncType.SUBSCRIPTIONS;
      const hours = 24;

      const expectedSyncLogs = [
        {
          id: 'sync-log-1',
          platformId,
          syncType,
          status: SyncStatus.COMPLETED,
          startedAt: new Date(),
          completedAt: new Date(),
          recordsSynced: 10,
          recordsFailed: 2,
          missingRecordsFound: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.syncLog.findMany.mockResolvedValue(expectedSyncLogs);

      const result = await service.findRecent(platformId, syncType, hours);

      expect(mockPrismaService.syncLog.findMany).toHaveBeenCalledWith({
        where: {
          platformId,
          syncType,
          startedAt: { gte: expect.any(Date) },
        },
        orderBy: { startedAt: 'desc' },
      });
      expect(result).toEqual(expectedSyncLogs);
    });
  });

  describe('getStats', () => {
    it('should get sync statistics', async () => {
      const platformId = 'platform-1';
      const days = 7;

      mockPrismaService.syncLog.count
        .mockResolvedValueOnce(10) // totalSyncs
        .mockResolvedValueOnce(8)  // successfulSyncs
        .mockResolvedValueOnce(2); // failedSyncs

      mockPrismaService.syncLog.aggregate.mockResolvedValue({
        _sum: {
          recordsSynced: 100,
          missingRecordsFound: 5,
        },
        _avg: {
          recordsSynced: 10,
        },
      });

      mockPrismaService.syncLog.findMany.mockResolvedValue([
        {
          startedAt: new Date('2025-01-01T10:00:00Z'),
          completedAt: new Date('2025-01-01T10:05:00Z'),
        },
        {
          startedAt: new Date('2025-01-01T11:00:00Z'),
          completedAt: new Date('2025-01-01T11:03:00Z'),
        },
      ]);

      const result = await service.getStats(platformId, days);

      expect(result).toEqual({
        totalSyncs: 10,
        successfulSyncs: 8,
        failedSyncs: 2,
        totalRecordsSynced: 100,
        totalMissingFound: 5,
        avgSyncDuration: 240, // 4 minutes average
      });
    });

    it('should get sync statistics for all platforms', async () => {
      const days = 7;

      mockPrismaService.syncLog.count
        .mockResolvedValueOnce(20) // totalSyncs
        .mockResolvedValueOnce(18) // successfulSyncs
        .mockResolvedValueOnce(2); // failedSyncs

      mockPrismaService.syncLog.aggregate.mockResolvedValue({
        _sum: {
          recordsSynced: 200,
          missingRecordsFound: 10,
        },
        _avg: {
          recordsSynced: 10,
        },
      });

      mockPrismaService.syncLog.findMany.mockResolvedValue([]);

      const result = await service.getStats(undefined, days);

      expect(result).toEqual({
        totalSyncs: 20,
        successfulSyncs: 18,
        failedSyncs: 2,
        totalRecordsSynced: 200,
        totalMissingFound: 10,
        avgSyncDuration: 0,
      });
    });
  });
});

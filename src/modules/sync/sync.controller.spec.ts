import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncLogsService } from './sync-logs.service';
import { SyncScheduler } from './sync-scheduler.service';
import { CreateSyncLogDto, SyncLogDto, SyncStatsDto, SyncType, SyncStatus } from './dto';

describe('SyncController', () => {
  let controller: SyncController;
  let mockSyncLogsService: any;
  let mockSyncScheduler: any;

  beforeEach(async () => {
    mockSyncLogsService = {
      create: jest.fn(),
      findRecent: jest.fn(),
      getStats: jest.fn(),
    };

    mockSyncScheduler = {
      syncPlatform: jest.fn(),
      syncAllPlatforms: jest.fn(),
      prisma: {
        platform: {
          findUnique: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: SyncLogsService,
          useValue: mockSyncLogsService,
        },
        {
          provide: SyncScheduler,
          useValue: mockSyncScheduler,
        },
      ],
    }).compile();

    controller = module.get<SyncController>(SyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createSyncLog', () => {
    it('should create a sync log', async () => {
      const dto: CreateSyncLogDto = {
        platformId: 'platform-1',
        syncType: SyncType.SUBSCRIPTIONS,
        status: SyncStatus.RUNNING,
        startedAt: new Date(),
      };

      const expectedSyncLog: SyncLogDto = {
        id: 'sync-log-1',
        ...dto,
        recordsSynced: 0,
        recordsFailed: 0,
        missingRecordsFound: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSyncLogsService.create.mockResolvedValue(expectedSyncLog);

      const result = await controller.createSyncLog(dto);

      expect(mockSyncLogsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedSyncLog);
    });
  });

  describe('getSyncLogs', () => {
    it('should get sync logs with filters', async () => {
      const platformId = 'platform-1';
      const syncType = SyncType.SUBSCRIPTIONS;
      const hours = 24;

      const expectedSyncLogs: SyncLogDto[] = [
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

      mockSyncLogsService.findRecent.mockResolvedValue(expectedSyncLogs);

      const result = await controller.getSyncLogs(platformId, syncType, hours);

      expect(mockSyncLogsService.findRecent).toHaveBeenCalledWith(platformId, syncType, hours);
      expect(result).toEqual(expectedSyncLogs);
    });

    it('should return empty array when no filters provided', async () => {
      const result = await controller.getSyncLogs();

      expect(mockSyncLogsService.findRecent).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getSyncStats', () => {
    it('should get sync statistics', async () => {
      const platformId = 'platform-1';
      const days = 7;

      const expectedStats: SyncStatsDto = {
        totalSyncs: 10,
        successfulSyncs: 8,
        failedSyncs: 2,
        totalRecordsSynced: 100,
        totalMissingFound: 5,
        avgSyncDuration: 240,
      };

      mockSyncLogsService.getStats.mockResolvedValue(expectedStats);

      const result = await controller.getSyncStats(platformId, days);

      expect(mockSyncLogsService.getStats).toHaveBeenCalledWith(platformId, days);
      expect(result).toEqual(expectedStats);
    });

    it('should get sync statistics with default days', async () => {
      const platformId = 'platform-1';

      const expectedStats: SyncStatsDto = {
        totalSyncs: 10,
        successfulSyncs: 8,
        failedSyncs: 2,
        totalRecordsSynced: 100,
        totalMissingFound: 5,
        avgSyncDuration: 240,
      };

      mockSyncLogsService.getStats.mockResolvedValue(expectedStats);

      const result = await controller.getSyncStats(platformId);

      expect(mockSyncLogsService.getStats).toHaveBeenCalledWith(platformId, 7);
      expect(result).toEqual(expectedStats);
    });
  });

  describe('triggerPlatformSync', () => {
    it('should trigger sync for specific platform', async () => {
      const platformId = 'platform-1';
      const platform = {
        id: platformId,
        slug: 'stripe',
        name: 'Stripe',
      };

      mockSyncScheduler.prisma.platform.findUnique.mockResolvedValue(platform);
      mockSyncScheduler.syncPlatform.mockResolvedValue(undefined);

      const result = await controller.triggerPlatformSync(platformId);

      expect(mockSyncScheduler.prisma.platform.findUnique).toHaveBeenCalledWith({
        where: { id: platformId },
      });
      expect(mockSyncScheduler.syncPlatform).toHaveBeenCalledWith(platformId, platform.slug);
      expect(result).toEqual({ message: 'Sync triggered for platform stripe' });
    });

    it('should throw error when platform not found', async () => {
      const platformId = 'non-existent-platform';

      mockSyncScheduler.prisma.platform.findUnique.mockResolvedValue(null);

      await expect(controller.triggerPlatformSync(platformId)).rejects.toThrow('Platform not found');
    });
  });

  describe('triggerAllSync', () => {
    it('should trigger sync for all platforms', async () => {
      mockSyncScheduler.syncAllPlatforms.mockResolvedValue(undefined);

      const result = await controller.triggerAllSync();

      expect(mockSyncScheduler.syncAllPlatforms).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Sync triggered for all platforms' });
    });
  });
});

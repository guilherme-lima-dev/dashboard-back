import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SyncLogsService } from './sync-logs.service';
import { SyncScheduler } from './sync-scheduler.service';
import { CreateSyncLogDto, SyncLogDto, SyncStatsDto } from './dto';

@ApiTags('Sync Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sync')
export class SyncController {
  constructor(
    private readonly syncLogsService: SyncLogsService,
    private readonly syncScheduler: SyncScheduler,
  ) {}

  @Post('logs')
  @RequirePermission('sync:create')
  @ApiOperation({ summary: 'Create sync log' })
  @ApiResponse({ status: 201, description: 'Sync log created successfully', type: SyncLogDto })
  async createSyncLog(@Body() dto: CreateSyncLogDto): Promise<SyncLogDto> {
    return this.syncLogsService.create(dto);
  }

  @Get('logs')
  @RequirePermission('sync:read')
  @ApiOperation({ summary: 'Get sync logs' })
  @ApiResponse({ status: 200, description: 'Sync logs retrieved successfully', type: [SyncLogDto] })
  async getSyncLogs(
    @Query('platformId') platformId?: string,
    @Query('syncType') syncType?: string,
    @Query('hours') hours?: number,
  ): Promise<SyncLogDto[]> {
    if (platformId && syncType) {
      return this.syncLogsService.findRecent(platformId, syncType, hours || 24);
    }
    return [];
  }

  @Get('stats')
  @RequirePermission('sync:read')
  @ApiOperation({ summary: 'Get sync statistics' })
  @ApiResponse({ status: 200, description: 'Sync statistics retrieved successfully', type: SyncStatsDto })
  async getSyncStats(
    @Query('platformId') platformId?: string,
    @Query('days') days?: number,
  ): Promise<SyncStatsDto> {
    return this.syncLogsService.getStats(platformId, days || 7);
  }

  @Post('platform/:platformId')
  @RequirePermission('sync:create')
  @ApiOperation({ summary: 'Trigger manual sync for platform' })
  @ApiResponse({ status: 200, description: 'Manual sync triggered successfully' })
  async triggerPlatformSync(@Param('platformId') platformId: string): Promise<{ message: string }> {
    // Get platform info
    const platform = await this.syncScheduler['prisma'].platform.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      throw new Error('Platform not found');
    }

    // Trigger sync in background
    this.syncScheduler.syncPlatform(platformId, platform.slug);

    return { message: `Sync triggered for platform ${platform.slug}` };
  }

  @Post('all')
  @RequirePermission('sync:create')
  @ApiOperation({ summary: 'Trigger sync for all platforms' })
  @ApiResponse({ status: 200, description: 'Sync triggered for all platforms' })
  async triggerAllSync(): Promise<{ message: string }> {
    // Trigger sync in background
    this.syncScheduler.syncAllPlatforms();

    return { message: 'Sync triggered for all platforms' };
  }
}

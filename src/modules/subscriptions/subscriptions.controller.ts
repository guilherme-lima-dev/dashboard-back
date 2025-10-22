import { Controller, Get, Param, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { QuerySubscriptionsDto } from './dto/query-subscriptions.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  @RequirePermission('subscriptions:read')
  @ApiOperation({ summary: 'List all subscriptions with filters' })
  async findAll(@Query() query: QuerySubscriptionsDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('subscriptions:read')
  @ApiOperation({ summary: 'Get subscription by ID with full details' })
  async findOne(@Param('id') id: string) {
    return this.subscriptionsService.findById(id);
  }

  @Patch(':id/cancel')
  @RequirePermission('subscriptions:manage')
  @ApiOperation({ summary: 'Cancel an active subscription' })
  async cancel(@Param('id') id: string, @Body() dto: CancelSubscriptionDto) {
    return this.subscriptionsService.cancel(id, dto);
  }

  @Patch(':id/pause')
  @RequirePermission('subscriptions:manage')
  @ApiOperation({ summary: 'Pause an active subscription' })
  async pause(@Param('id') id: string) {
    return this.subscriptionsService.pause(id);
  }

  @Patch(':id/resume')
  @RequirePermission('subscriptions:manage')
  @ApiOperation({ summary: 'Resume a paused subscription' })
  async resume(@Param('id') id: string) {
    return this.subscriptionsService.resume(id);
  }
}
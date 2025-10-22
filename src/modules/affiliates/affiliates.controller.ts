import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AffiliatesService } from './affiliates.service';
import { CreateAffiliateDto, UpdateAffiliateDto, AffiliateQueryDto, AffiliatePerformanceDto, AffiliateDashboardDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Affiliates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Post()
  @RequirePermission('affiliates:create')
  @ApiOperation({ summary: 'Create a new affiliate' })
  @ApiResponse({ status: 201, description: 'Affiliate created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createAffiliateDto: CreateAffiliateDto) {
    return this.affiliatesService.create(createAffiliateDto);
  }

  @Get()
  @RequirePermission('affiliates:read')
  @ApiOperation({ summary: 'Get all affiliates with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Affiliates retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query() query: AffiliateQueryDto) {
    return this.affiliatesService.findAll(query);
  }

  @Get('performance')
  @RequirePermission('affiliates:read')
  @ApiOperation({ summary: 'Get affiliate performance metrics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Affiliate performance retrieved successfully',
    type: [AffiliatePerformanceDto]
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getPerformance(@Query() query: AffiliateQueryDto): Promise<AffiliatePerformanceDto[]> {
    return this.affiliatesService.getPerformance(query);
  }

  @Get('dashboard')
  @RequirePermission('affiliates:read')
  @ApiOperation({ summary: 'Get affiliate dashboard data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Affiliate dashboard data retrieved successfully',
    type: AffiliateDashboardDto
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getDashboard(): Promise<AffiliateDashboardDto> {
    return this.affiliatesService.getDashboard();
  }

  @Get('tiers/recalculate')
  @RequirePermission('affiliates:manage')
  @ApiOperation({ summary: 'Recalculate all affiliate tiers' })
  @ApiResponse({ status: 200, description: 'Tiers recalculated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  async recalculateTiers() {
    await this.affiliatesService.recalculateTiers();
    return { message: 'Tiers recalculated successfully' };
  }

  @Get(':id')
  @RequirePermission('affiliates:read')
  @ApiOperation({ summary: 'Get affiliate by ID' })
  @ApiResponse({ status: 200, description: 'Affiliate retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Affiliate not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id') id: string) {
    return this.affiliatesService.findOne(id);
  }

  @Get('external/:platformId/:externalId')
  @RequirePermission('affiliates:read')
  @ApiOperation({ summary: 'Get affiliate by external ID' })
  @ApiResponse({ status: 200, description: 'Affiliate retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Affiliate not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findByExternalId(
    @Param('platformId') platformId: string,
    @Param('externalId') externalId: string,
  ) {
    return this.affiliatesService.findByExternalId(platformId, externalId);
  }

  @Patch(':id')
  @RequirePermission('affiliates:update')
  @ApiOperation({ summary: 'Update affiliate' })
  @ApiResponse({ status: 200, description: 'Affiliate updated successfully' })
  @ApiResponse({ status: 404, description: 'Affiliate not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(@Param('id') id: string, @Body() updateAffiliateDto: UpdateAffiliateDto) {
    return this.affiliatesService.update(id, updateAffiliateDto);
  }

  @Delete(':id')
  @RequirePermission('affiliates:delete')
  @ApiOperation({ summary: 'Delete affiliate' })
  @ApiResponse({ status: 200, description: 'Affiliate deleted successfully' })
  @ApiResponse({ status: 404, description: 'Affiliate not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.affiliatesService.remove(id);
  }
}
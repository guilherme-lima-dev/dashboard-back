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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OfferPlatformMappingsService } from './offer-platform-mappings.service';
import { CreateOfferPlatformMappingDto } from './dto/create-offer-platform-mapping.dto';
import { UpdateOfferPlatformMappingDto } from './dto/update-offer-platform-mapping.dto';
import { OfferPlatformMappingDto } from './dto/offer-platform-mapping.dto';
import { ApiStandardResponses } from '../../common/decorators/api-standard-responses.decorator';

@ApiTags('Offer Platform Mappings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('offer-platform-mappings')
export class OfferPlatformMappingsController {
  constructor(private readonly offerPlatformMappingsService: OfferPlatformMappingsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo mapeamento oferta-plataforma' })
  @ApiStandardResponses()
  @ApiResponse({
    status: 201,
    description: 'Mapeamento criado com sucesso',
    type: OfferPlatformMappingDto,
  })
  create(@Body() createOfferPlatformMappingDto: CreateOfferPlatformMappingDto) {
    return this.offerPlatformMappingsService.create(createOfferPlatformMappingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os mapeamentos' })
  @ApiStandardResponses()
  @ApiResponse({
    status: 200,
    description: 'Lista de mapeamentos retornada com sucesso',
    type: [OfferPlatformMappingDto],
  })
  findAll() {
    return this.offerPlatformMappingsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Listar mapeamentos ativos' })
  @ApiStandardResponses()
  @ApiResponse({
    status: 200,
    description: 'Lista de mapeamentos ativos retornada com sucesso',
    type: [OfferPlatformMappingDto],
  })
  findActive() {
    return this.offerPlatformMappingsService.findActive();
  }

  @Get('by-offer/:offerId')
  @ApiOperation({ summary: 'Listar mapeamentos por oferta' })
  @ApiStandardResponses()
  @ApiResponse({
    status: 200,
    description: 'Lista de mapeamentos da oferta retornada com sucesso',
    type: [OfferPlatformMappingDto],
  })
  findByOffer(@Param('offerId') offerId: string) {
    return this.offerPlatformMappingsService.findByOffer(offerId);
  }

  @Get('by-platform/:platformId')
  @ApiOperation({ summary: 'Listar mapeamentos por plataforma' })
  @ApiStandardResponses()
  @ApiResponse({
    status: 200,
    description: 'Lista de mapeamentos da plataforma retornada com sucesso',
    type: [OfferPlatformMappingDto],
  })
  findByPlatform(@Param('platformId') platformId: string) {
    return this.offerPlatformMappingsService.findByPlatform(platformId);
  }

  @Get('by-external-product')
  @ApiOperation({ summary: 'Buscar mapeamento por produto externo' })
  @ApiStandardResponses()
  @ApiQuery({ name: 'platformId', description: 'ID da plataforma' })
  @ApiQuery({ name: 'externalProductId', description: 'ID do produto na plataforma externa' })
  @ApiResponse({
    status: 200,
    description: 'Mapeamento encontrado com sucesso',
    type: OfferPlatformMappingDto,
  })
  findByExternalProduct(
    @Query('platformId') platformId: string,
    @Query('externalProductId') externalProductId: string,
  ) {
    return this.offerPlatformMappingsService.findByExternalProduct(platformId, externalProductId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar mapeamento por ID' })
  @ApiStandardResponses()
  @ApiResponse({
    status: 200,
    description: 'Mapeamento encontrado com sucesso',
    type: OfferPlatformMappingDto,
  })
  findOne(@Param('id') id: string) {
    return this.offerPlatformMappingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar mapeamento' })
  @ApiStandardResponses()
  @ApiResponse({
    status: 200,
    description: 'Mapeamento atualizado com sucesso',
    type: OfferPlatformMappingDto,
  })
  update(@Param('id') id: string, @Body() updateOfferPlatformMappingDto: UpdateOfferPlatformMappingDto) {
    return this.offerPlatformMappingsService.update(id, updateOfferPlatformMappingDto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Alternar status ativo do mapeamento' })
  @ApiStandardResponses()
  @ApiResponse({
    status: 200,
    description: 'Status do mapeamento alterado com sucesso',
    type: OfferPlatformMappingDto,
  })
  toggleActive(@Param('id') id: string) {
    return this.offerPlatformMappingsService.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover mapeamento' })
  @ApiStandardResponses()
  @ApiResponse({
    status: 200,
    description: 'Mapeamento removido com sucesso',
  })
  remove(@Param('id') id: string) {
    return this.offerPlatformMappingsService.remove(id);
  }
}

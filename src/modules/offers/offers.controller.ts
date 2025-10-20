import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OfferDto } from './dto/offer.dto';
import { ApiStandardResponses } from '../../common/decorators/api-standard-responses.decorator';

@ApiTags('Offers')
@ApiBearerAuth('JWT-auth')
@ApiStandardResponses()
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar oferta',
    description: 'Cria uma nova oferta para um produto',
  })
  @ApiBody({ type: CreateOfferDto })
  @ApiResponse({
    status: 201,
    description: 'Oferta criada com sucesso',
    type: OfferDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Oferta com este slug já existe para este produto',
  })
  async create(@Body() createOfferDto: CreateOfferDto): Promise<OfferDto> {
    return this.offersService.create(createOfferDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar ofertas',
    description: 'Retorna lista de ofertas com filtros opcionais',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filtrar por ID do produto',
  })
  @ApiQuery({
    name: 'billingType',
    required: false,
    enum: ['recurring', 'one_time'],
    description: 'Filtrar por tipo de cobrança',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filtrar apenas ofertas ativas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ofertas retornada com sucesso',
    type: [OfferDto],
  })
  async findAll(
    @Query('productId') productId?: string,
    @Query('billingType') billingType?: string,
    @Query('active') active?: boolean,
  ): Promise<OfferDto[]> {
    if (productId) {
      return this.offersService.findByProduct(productId);
    }
    
    if (billingType) {
      return this.offersService.findByBillingType(billingType);
    }
    
    if (active === true) {
      return this.offersService.findActive();
    }
    
    return this.offersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar oferta por ID',
    description: 'Retorna detalhes de uma oferta específica',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID da oferta',
    example: 'uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Oferta encontrada',
    type: OfferDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Oferta não encontrada',
  })
  async findOne(@Param('id') id: string): Promise<OfferDto> {
    return this.offersService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Buscar oferta por slug',
    description: 'Retorna detalhes de uma oferta pelo slug',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'Slug da oferta',
    example: 'holymind-mensal',
  })
  @ApiResponse({
    status: 200,
    description: 'Oferta encontrada',
    type: OfferDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Oferta não encontrada',
  })
  async findBySlug(@Param('slug') slug: string): Promise<OfferDto> {
    return this.offersService.findBySlug(slug);
  }

  @Get('product/:productId')
  @ApiOperation({
    summary: 'Listar ofertas por produto',
    description: 'Retorna todas as ofertas de um produto específico',
  })
  @ApiParam({
    name: 'productId',
    type: String,
    description: 'UUID do produto',
    example: 'uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ofertas retornada com sucesso',
    type: [OfferDto],
  })
  async findByProduct(@Param('productId') productId: string): Promise<OfferDto[]> {
    return this.offersService.findByProduct(productId);
  }

  @Get('type/:billingType')
  @ApiOperation({
    summary: 'Listar ofertas por tipo de cobrança',
    description: 'Retorna ofertas de um tipo específico',
  })
  @ApiParam({
    name: 'billingType',
    enum: ['recurring', 'one_time'],
    description: 'Tipo de cobrança',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ofertas retornada com sucesso',
    type: [OfferDto],
  })
  async findByBillingType(@Param('billingType') billingType: string): Promise<OfferDto[]> {
    return this.offersService.findByBillingType(billingType);
  }

  @Get('active/list')
  @ApiOperation({
    summary: 'Listar ofertas ativas',
    description: 'Retorna apenas ofertas que estão ativas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ofertas ativas retornada com sucesso',
    type: [OfferDto],
  })
  async findActive(): Promise<OfferDto[]> {
    return this.offersService.findActive();
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar oferta',
    description: 'Atualiza dados de uma oferta existente',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID da oferta',
    example: 'uuid-123',
  })
  @ApiBody({ type: UpdateOfferDto })
  @ApiResponse({
    status: 200,
    description: 'Oferta atualizada com sucesso',
    type: OfferDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Oferta não encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Oferta com este slug já existe para este produto',
  })
  async update(
    @Param('id') id: string,
    @Body() updateOfferDto: UpdateOfferDto,
  ): Promise<OfferDto> {
    return this.offersService.update(id, updateOfferDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar oferta',
    description: 'Remove uma oferta do catálogo',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID da oferta',
    example: 'uuid-123',
  })
  @ApiResponse({
    status: 204,
    description: 'Oferta deletada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Oferta não encontrada',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.offersService.remove(id);
  }
}
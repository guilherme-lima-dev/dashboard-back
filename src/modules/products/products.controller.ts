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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductDto } from './dto/product.dto';
import { ApiStandardResponses } from '../../common/decorators/api-standard-responses.decorator';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@ApiStandardResponses()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar produto',
    description: 'Cria um novo produto no catálogo',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Produto criado com sucesso',
    type: ProductDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Produto com este slug já existe',
  })
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductDto> {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar produtos',
    description: 'Retorna lista de produtos com filtros opcionais',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['subscription', 'one_time', 'addon'],
    description: 'Filtrar por tipo de produto',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filtrar apenas produtos ativos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de produtos retornada com sucesso',
    type: [ProductDto],
  })
  async findAll(
    @Query('type') type?: string,
    @Query('active') active?: boolean,
  ): Promise<ProductDto[]> {
    if (type) {
      return this.productsService.findByType(type);
    }
    
    if (active === true) {
      return this.productsService.findActive();
    }
    
    return this.productsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar produto por ID',
    description: 'Retorna detalhes de um produto específico',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID do produto',
    example: 'uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado',
    type: ProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
  })
  async findOne(@Param('id') id: string): Promise<ProductDto> {
    return this.productsService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Buscar produto por slug',
    description: 'Retorna detalhes de um produto pelo slug',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'Slug do produto',
    example: 'holymind',
  })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado',
    type: ProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
  })
  async findBySlug(@Param('slug') slug: string): Promise<ProductDto> {
    return this.productsService.findBySlug(slug);
  }

  @Get('type/:type')
  @ApiOperation({
    summary: 'Listar produtos por tipo',
    description: 'Retorna lista de produtos de um tipo específico',
  })
  @ApiParam({
    name: 'type',
    enum: ['subscription', 'one_time', 'addon'],
    description: 'Tipo do produto',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de produtos retornada com sucesso',
    type: [ProductDto],
  })
  async findByType(@Param('type') type: string): Promise<ProductDto[]> {
    return this.productsService.findByType(type);
  }

  @Get('active/list')
  @ApiOperation({
    summary: 'Listar produtos ativos',
    description: 'Retorna apenas produtos que estão ativos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de produtos ativos retornada com sucesso',
    type: [ProductDto],
  })
  async findActive(): Promise<ProductDto[]> {
    return this.productsService.findActive();
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar produto',
    description: 'Atualiza dados de um produto existente',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID do produto',
    example: 'uuid-123',
  })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({
    status: 200,
    description: 'Produto atualizado com sucesso',
    type: ProductDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Produto com este slug já existe',
  })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductDto> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar produto',
    description: 'Remove um produto do catálogo',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID do produto',
    example: 'uuid-123',
  })
  @ApiResponse({
    status: 204,
    description: 'Produto deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
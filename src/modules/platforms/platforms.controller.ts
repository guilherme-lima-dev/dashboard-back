import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
} from '@nestjs/swagger';
import { PlatformsService } from './platforms.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { PlatformDto } from './dto/platform.dto';
import { ApiStandardResponses } from '../../common/decorators/api-standard-responses.decorator';

@ApiTags('Platforms')
@ApiBearerAuth('JWT-auth')
@ApiStandardResponses()
@Controller('platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar plataforma',
    description: 'Cria uma nova plataforma de pagamento no sistema',
  })
  @ApiBody({ type: CreatePlatformDto })
  @ApiResponse({
    status: 201,
    description: 'Plataforma criada com sucesso',
    type: PlatformDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Plataforma com este slug já existe',
  })
  async create(@Body() createPlatformDto: CreatePlatformDto): Promise<PlatformDto> {
    return this.platformsService.create(createPlatformDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar plataformas',
    description: 'Retorna lista de todas as plataformas cadastradas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de plataformas retornada com sucesso',
    type: [PlatformDto],
  })
  async findAll(): Promise<PlatformDto[]> {
    return this.platformsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar plataforma por ID',
    description: 'Retorna detalhes de uma plataforma específica',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID da plataforma',
    example: 'uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'Plataforma encontrada',
    type: PlatformDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plataforma não encontrada',
  })
  async findOne(@Param('id') id: string): Promise<PlatformDto> {
    return this.platformsService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Buscar plataforma por slug',
    description: 'Retorna detalhes de uma plataforma pelo slug',
  })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'Slug da plataforma',
    example: 'stripe',
  })
  @ApiResponse({
    status: 200,
    description: 'Plataforma encontrada',
    type: PlatformDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plataforma não encontrada',
  })
  async findBySlug(@Param('slug') slug: string): Promise<PlatformDto> {
    return this.platformsService.findBySlug(slug);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar plataforma',
    description: 'Atualiza dados de uma plataforma existente',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID da plataforma',
    example: 'uuid-123',
  })
  @ApiBody({ type: UpdatePlatformDto })
  @ApiResponse({
    status: 200,
    description: 'Plataforma atualizada com sucesso',
    type: PlatformDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Plataforma não encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Plataforma com este slug já existe',
  })
  async update(
    @Param('id') id: string,
    @Body() updatePlatformDto: UpdatePlatformDto,
  ): Promise<PlatformDto> {
    return this.platformsService.update(id, updatePlatformDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletar plataforma',
    description: 'Remove uma plataforma do sistema',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID da plataforma',
    example: 'uuid-123',
  })
  @ApiResponse({
    status: 204,
    description: 'Plataforma deletada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Plataforma não encontrada',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.platformsService.remove(id);
  }
}

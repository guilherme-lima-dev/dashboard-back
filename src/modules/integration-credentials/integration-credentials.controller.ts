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
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { IntegrationCredentialsService } from './integration-credentials.service';
import {
    CreateCredentialDto,
    UpdateCredentialDto,
    CredentialDto,
    FilterCredentialDto,
    TestConnectionResponseDto,
} from './dto';

@ApiTags('Integration Credentials')
@ApiBearerAuth()
@Controller('integration-credentials')
export class IntegrationCredentialsController {
    constructor(
        private readonly credentialsService: IntegrationCredentialsService,
    ) {}

    @Post()
    @ApiOperation({
        summary: 'Criar nova credencial',
        description: 'Cria uma nova credencial de integração. O valor será criptografado automaticamente.',
    })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Credencial criada com sucesso',
        type: CredentialDto,
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Credencial já existe para esta plataforma, tipo e ambiente',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Plataforma não encontrada',
    })
    async create(
        @Body() createDto: CreateCredentialDto,
    ): Promise<CredentialDto> {
        return this.credentialsService.create(createDto);
    }

    @Get()
    @ApiOperation({
        summary: 'Listar todas as credenciais',
        description: 'Retorna lista de credenciais com filtros opcionais',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Lista de credenciais',
        type: [CredentialDto],
    })
    async findAll(
        @Query() filters: FilterCredentialDto,
    ): Promise<CredentialDto[]> {
        if (filters.platformId) {
            return this.credentialsService.findByPlatform(
                filters.platformId,
                filters.includeDecrypted || false,
            );
        }
        return this.credentialsService.findAll(filters.includeDecrypted || false);
    }

    @Get('platform/:platformId')
    @ApiOperation({
        summary: 'Listar credenciais por plataforma',
        description: 'Retorna todas as credenciais de uma plataforma específica',
    })
    @ApiParam({
        name: 'platformId',
        description: 'ID da plataforma',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiQuery({
        name: 'includeDecrypted',
        required: false,
        type: Boolean,
        description: 'Incluir valor descriptografado',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Lista de credenciais da plataforma',
        type: [CredentialDto],
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Plataforma não encontrada',
    })
    async findByPlatform(
        @Param('platformId') platformId: string,
        @Query('includeDecrypted') includeDecrypted?: boolean,
    ): Promise<CredentialDto[]> {
        return this.credentialsService.findByPlatform(
            platformId,
            includeDecrypted || false,
        );
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Buscar credencial por ID',
        description: 'Retorna uma credencial específica',
    })
    @ApiParam({
        name: 'id',
        description: 'ID da credencial',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiQuery({
        name: 'includeDecrypted',
        required: false,
        type: Boolean,
        description: 'Incluir valor descriptografado',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Credencial encontrada',
        type: CredentialDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Credencial não encontrada',
    })
    async findOne(
        @Param('id') id: string,
        @Query('includeDecrypted') includeDecrypted?: boolean,
    ): Promise<CredentialDto> {
        return this.credentialsService.findOne(id, includeDecrypted || false);
    }

    @Get(':id/test')
    @ApiOperation({
        summary: 'Testar credencial',
        description: 'Testa se a credencial está válida e ativa',
    })
    @ApiParam({
        name: 'id',
        description: 'ID da credencial',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Resultado do teste',
        type: TestConnectionResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Credencial não encontrada',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Credencial inativa ou expirada',
    })
    async testConnection(
        @Param('id') id: string,
    ): Promise<TestConnectionResponseDto> {
        return this.credentialsService.testConnection(id);
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Atualizar credencial',
        description: 'Atualiza uma credencial existente. Se o valor for alterado, será criptografado automaticamente.',
    })
    @ApiParam({
        name: 'id',
        description: 'ID da credencial',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Credencial atualizada com sucesso',
        type: CredentialDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Credencial não encontrada',
    })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateCredentialDto,
    ): Promise<CredentialDto> {
        return this.credentialsService.update(id, updateDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Deletar credencial',
        description: 'Remove uma credencial do sistema',
    })
    @ApiParam({
        name: 'id',
        description: 'ID da credencial',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @ApiResponse({
        status: HttpStatus.NO_CONTENT,
        description: 'Credencial deletada com sucesso',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Credencial não encontrada',
    })
    async remove(@Param('id') id: string): Promise<void> {
        return this.credentialsService.remove(id);
    }
}

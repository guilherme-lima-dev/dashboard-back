import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Registrar novo usuário',
        description: 'Cria um novo usuário no sistema. O usuário fica com status "pending_approval" até ser aprovado por um administrador.',
    })
    @ApiBody({ type: RegisterDto })
    @ApiResponse({
        status: 201,
        description: 'Usuário criado com sucesso',
        schema: {
            example: {
                message: 'Usuário criado com sucesso. Aguardando aprovação do administrador.',
                user: {
                    id: 'uuid-123',
                    email: 'joao.silva@example.com',
                    fullName: 'João Silva',
                    status: 'pending_approval',
                    createdAt: '2025-10-20T12:00:00.000Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 409,
        description: 'Email já cadastrado',
        schema: {
            example: {
                statusCode: 409,
                message: 'Email já cadastrado',
                error: 'Conflict',
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Dados inválidos',
        schema: {
            example: {
                statusCode: 400,
                message: ['Senha deve conter letra maiúscula, minúscula, número e caractere especial'],
                error: 'Bad Request',
            },
        },
    })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Login',
        description: 'Autentica o usuário e retorna tokens JWT (access + refresh)',
    })
    @ApiBody({ type: LoginDto })
    @ApiResponse({
        status: 200,
        description: 'Login realizado com sucesso',
        schema: {
            example: {
                user: {
                    id: 'uuid-123',
                    email: 'admin@analytics.com',
                    fullName: 'Super Admin',
                    roles: ['Super Admin'],
                    permissions: ['dashboard:read', 'users:create', 'products:manage'],
                },
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                expiresIn: '15m',
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Credenciais inválidas ou usuário não aprovado',
        schema: {
            example: {
                statusCode: 401,
                message: 'Email ou senha inválidos',
                error: 'Unauthorized',
            },
        },
    })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Renovar access token',
        description: 'Gera um novo par de tokens (access + refresh) usando um refresh token válido. O refresh token antigo é revogado.',
    })
    @ApiBody({ type: RefreshTokenDto })
    @ApiResponse({
        status: 200,
        description: 'Tokens renovados com sucesso',
        schema: {
            example: {
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                expiresIn: '15m',
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Refresh token inválido ou expirado',
        schema: {
            example: {
                statusCode: 401,
                message: 'Refresh token inválido ou revogado',
                error: 'Unauthorized',
            },
        },
    })
    async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.refreshTokens(refreshTokenDto.refreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Logout',
        description: 'Revoga o refresh token, invalidando futuras renovações',
    })
    @ApiBody({ type: RefreshTokenDto })
    @ApiResponse({
        status: 200,
        description: 'Logout realizado com sucesso',
        schema: {
            example: {
                message: 'Logout realizado com sucesso',
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Não autenticado',
    })
    async logout(@Body() refreshTokenDto: RefreshTokenDto) {
        return this.authService.logout(refreshTokenDto.refreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @Post('me')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Obter perfil do usuário autenticado',
        description: 'Retorna informações do usuário logado (id, email, roles, permissions)',
    })
    @ApiResponse({
        status: 200,
        description: 'Perfil do usuário',
        schema: {
            example: {
                user: {
                    id: 'uuid-123',
                    email: 'admin@analytics.com',
                    fullName: 'Super Admin',
                    roles: ['Super Admin'],
                    permissions: ['dashboard:read', 'users:create', 'products:manage'],
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Não autenticado',
    })
    async getProfile(@CurrentUser() user: any) {
        return {
            user: {
                id: user.userId,
                email: user.email,
                fullName: user.fullName,
                roles: user.roles,
                permissions: user.permissions,
            },
        };
    }
}

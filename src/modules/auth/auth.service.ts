import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {}

    async register(registerDto: RegisterDto, createdById?: string) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email já cadastrado');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: registerDto.email,
                fullName: registerDto.fullName,
                passwordHash: hashedPassword,
                status: 'pending_approval',
                createdById,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                status: true,
                createdAt: true,
            },
        });

        return {
            message: 'Usuário criado com sucesso. Aguardando aprovação do administrador.',
            user,
        };
    }

    async login(loginDto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: {
                                            include: {
                                                resource: true,
                                                action: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Email ou senha inválidos');
        }

        if (user.status !== 'active') {
            throw new UnauthorizedException(
                'Usuário aguardando aprovação ou inativo',
            );
        }

        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Email ou senha inválidos');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        const permissions = this.extractPermissions(user.userRoles);

        const tokens = await this.generateTokens(user.id, user.email, permissions);

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                roles: user.userRoles.map((ur) => ur.role.name),
                permissions,
            },
            ...tokens,
        };
    }

    async refreshTokens(refreshToken: string) {
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token é obrigatório');
        }

        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });

        if (!storedToken || storedToken.revokedAt) {
            throw new UnauthorizedException('Refresh token inválido ou revogado');
        }

        if (new Date() > storedToken.expiresAt) {
            throw new UnauthorizedException('Refresh token expirado');
        }

        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
        });

        const user = await this.prisma.user.findUnique({
            where: { id: storedToken.userId },
            include: {
                userRoles: {
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: {
                                            include: {
                                                resource: true,
                                                action: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('Usuário não encontrado');
        }

        const permissions = this.extractPermissions(user.userRoles);

        return this.generateTokens(user.id, user.email, permissions);
    }

    async logout(refreshToken: string) {
        await this.prisma.refreshToken.updateMany({
            where: { token: refreshToken },
            data: { revokedAt: new Date() },
        });

        return { message: 'Logout realizado com sucesso' };
    }

    private async generateTokens(
        userId: string,
        email: string,
        permissions: string[],
    ) {
        const payload = { sub: userId, email, permissions };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
            }),
        ]);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.prisma.refreshToken.create({
            data: {
                userId,
                token: refreshToken,
                expiresAt,
            },
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
        };
    }

    private extractPermissions(userRoles: any[]): string[] {
        const permissions = new Set<string>();

        userRoles.forEach((ur) => {
            ur.role.rolePermissions.forEach((rp) => {
                if (rp.granted) {
                    const permission = `${rp.permission.resource.slug}:${rp.permission.action.slug}`;
                    permissions.add(permission);
                }
            });
        });

        return Array.from(permissions);
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userRoles: {
                    include: {
                        role: true,
                    },
                },
            },
        });

        if (!user || user.status !== 'active') {
            throw new UnauthorizedException('Usuário inválido ou inativo');
        }

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: user.userRoles.map((ur) => ur.role.slug),
        };
    }
}

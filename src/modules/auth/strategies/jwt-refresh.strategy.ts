import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private configService: ConfigService) {
        const secret = configService.get<string>('JWT_REFRESH_SECRET');

        if (!secret) {
            throw new Error('JWT_REFRESH_SECRET não configurado');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: any) {
        const refreshToken = req.get('Authorization')?.replace('Bearer', '').trim();

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token não fornecido');
        }

        return {
            userId: payload.sub,
            email: payload.email,
            refreshToken,
        };
    }
}

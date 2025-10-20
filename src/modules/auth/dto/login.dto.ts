import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: 'Email do usuário',
        example: 'admin@analytics.com',
        type: String,
    })
    @IsEmail({}, { message: 'Email inválido' })
    @IsNotEmpty({ message: 'Email é obrigatório' })
    email: string;

    @ApiProperty({
        description: 'Senha do usuário',
        example: 'Admin@123',
        minLength: 6,
        type: String,
    })
    @IsString()
    @IsNotEmpty({ message: 'Senha é obrigatória' })
    @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
    password: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        description: 'Email do usuário',
        example: 'joao.silva@example.com',
        type: String,
    })
    @IsEmail({}, { message: 'Email inválido' })
    @IsNotEmpty({ message: 'Email é obrigatório' })
    email: string;

    @ApiProperty({
        description: 'Nome completo do usuário',
        example: 'João Silva',
        minLength: 3,
        type: String,
    })
    @IsString()
    @IsNotEmpty({ message: 'Nome completo é obrigatório' })
    @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
    fullName: string;

    @ApiProperty({
        description: 'Senha forte (mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial)',
        example: 'Senha@123',
        minLength: 8,
        type: String,
    })
    @IsString()
    @IsNotEmpty({ message: 'Senha é obrigatória' })
    @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        {
            message: 'Senha deve conter letra maiúscula, minúscula, número e caractere especial',
        },
    )
    password: string;
}

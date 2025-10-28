import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ 
    description: 'Email do usuário para recuperação de senha',
    example: 'usuario@exemplo.com'
  })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsString()
  email: string;
}
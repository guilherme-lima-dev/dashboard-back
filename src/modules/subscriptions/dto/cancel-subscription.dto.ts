import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelSubscriptionDto {
  @ApiProperty({ example: 'Customer requested cancellation' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ example: 'user' })
  @IsString()
  @IsOptional()
  canceledBy?: string;
}

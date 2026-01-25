import { ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class TransactionQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({ example: '2025-01' })
  @IsString()
  @IsOptional()
  month?: string;

  @ApiPropertyOptional({ example: '2025' })
  @IsString()
  @IsOptional()
  year?: string;
}


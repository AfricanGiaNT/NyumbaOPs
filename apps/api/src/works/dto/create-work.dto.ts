import { ApiProperty } from '@nestjs/swagger';
import { Currency, WorkCategory, WorkPriority } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateWorkDto {
  @ApiProperty({ example: 'Fix leaking pipe in bathroom' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'property-uuid' })
  @IsString()
  propertyId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: WorkPriority, required: false })
  @IsEnum(WorkPriority)
  @IsOptional()
  priority?: WorkPriority;

  @ApiProperty({ enum: WorkCategory, required: false })
  @IsEnum(WorkCategory)
  @IsOptional()
  category?: WorkCategory;

  @ApiProperty({ example: '2025-06-01', required: false })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiProperty({ example: 50000, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @ApiProperty({ enum: Currency, required: false })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

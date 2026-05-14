import { ApiProperty } from '@nestjs/swagger';
import { Currency, WorkCategory, WorkPriority, WorkStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateWorkDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: WorkStatus, required: false })
  @IsEnum(WorkStatus)
  @IsOptional()
  status?: WorkStatus;

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

  @ApiProperty({ example: '2025-06-05', required: false })
  @IsDateString()
  @IsOptional()
  completedDate?: string;

  @ApiProperty({ example: 50000, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @ApiProperty({ example: 45000, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  actualCost?: number;

  @ApiProperty({ enum: Currency, required: false })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

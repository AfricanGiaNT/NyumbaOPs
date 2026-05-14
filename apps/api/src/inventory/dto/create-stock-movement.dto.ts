import { ApiProperty } from '@nestjs/swagger';
import { Currency, StockMovementType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateStockMovementDto {
  @ApiProperty({ enum: StockMovementType })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 500, required: false, description: 'Cost per unit (for IN movements)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @ApiProperty({ enum: Currency, required: false })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({ required: false, description: 'Link to a work order (for OUT movements)' })
  @IsString()
  @IsOptional()
  workId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

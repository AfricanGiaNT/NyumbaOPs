import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class BatchMovementItemDto {
  @ApiProperty({ description: 'Inventory item being restocked' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ example: 5, description: 'Quantity bought (IN)' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 500, required: false, description: 'Cost per unit' })
  @IsInt()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @ApiProperty({ enum: Currency, required: false })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;
}

export class BatchMovementDto {
  @ApiProperty({ type: [BatchMovementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchMovementItemDto)
  items: BatchMovementItemDto[];
}

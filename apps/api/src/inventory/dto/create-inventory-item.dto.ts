import { ApiProperty } from '@nestjs/swagger';
import { Currency, InventoryCategory } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'Toilet paper' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'property-uuid' })
  @IsString()
  propertyId: string;

  @ApiProperty({ enum: InventoryCategory, required: false })
  @IsEnum(InventoryCategory)
  @IsOptional()
  category?: InventoryCategory;

  @ApiProperty({ example: 'rolls', required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ example: 5, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  minQuantity?: number;

  @ApiProperty({ example: 500, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @ApiProperty({ enum: Currency, required: false })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Currency, InventoryCategory } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateInventoryItemDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: InventoryCategory, required: false })
  @IsEnum(InventoryCategory)
  @IsOptional()
  category?: InventoryCategory;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  minQuantity?: number;

  @ApiProperty({ required: false })
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

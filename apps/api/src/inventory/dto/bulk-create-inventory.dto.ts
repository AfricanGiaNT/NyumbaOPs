import { InventoryCategory } from '@prisma/client';
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

export class BulkInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(InventoryCategory)
  @IsOptional()
  category?: InventoryCategory;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  minQuantity?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkCreateInventoryDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkInventoryItemDto)
  items: BulkInventoryItemDto[];
}

import { ApiProperty } from '@nestjs/swagger';
import { InventoryCategory } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class InventoryQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  propertyId?: string;

  @ApiProperty({ enum: InventoryCategory, required: false })
  @IsEnum(InventoryCategory)
  @IsOptional()
  category?: InventoryCategory;

  @ApiProperty({ required: false, description: 'Filter items below minimum quantity' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  lowStock?: boolean;
}

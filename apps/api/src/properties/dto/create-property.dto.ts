import { ApiProperty } from '@nestjs/swagger';
import { Currency, PropertyStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Area 43 - House A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Lilongwe', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  bedrooms: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  bathrooms: number;

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(1)
  maxGuests: number;

  @ApiProperty({ example: 55000, required: false })
  @IsInt()
  @Min(0)
  @Max(1000000000)
  @IsOptional()
  nightlyRate?: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ example: -13.9626, required: false })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ example: 33.7741, required: false })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({ example: 'https://maps.google.com/?q=-13.9626,33.7741', required: false })
  @IsString()
  @IsOptional()
  googleMapsUrl?: string;

  @ApiProperty({ enum: PropertyStatus, required: false, default: PropertyStatus.ACTIVE })
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;
}


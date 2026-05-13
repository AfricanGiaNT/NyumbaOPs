import { ApiProperty } from '@nestjs/swagger';
import { Currency, PropertyStatus } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PropertyImageDto {
  @IsString()
  url: string;

  @IsString()
  @IsOptional()
  alt?: string;

  @IsBoolean()
  isCover: boolean;

  @IsInt()
  sortOrder: number;
}

export class CreatePropertyDto {
  @ApiProperty({ example: 'Area 43 - House A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'apartment', required: false })
  @IsString()
  @IsOptional()
  propertyType?: string;

  @ApiProperty({ example: 'Lilongwe', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'Area 43, Lilongwe', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  spaceDescription?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  guestAccess?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  otherDetails?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  highlights?: string[];

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  bedrooms: number;

  @ApiProperty({ example: 4, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  beds?: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  bathrooms: number;

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(1)
  maxGuests: number;

  @ApiProperty({ example: 85, required: false })
  @IsNumber()
  @IsOptional()
  propertySize?: number;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bedTypes?: string[];

  @ApiProperty({ example: 55000, required: false })
  @IsInt()
  @Min(0)
  @Max(1000000000)
  @IsOptional()
  nightlyRate?: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ example: 65000, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  weekendRate?: number;

  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  weeklyDiscount?: number;

  @ApiProperty({ example: 20, required: false })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  monthlyDiscount?: number;

  @ApiProperty({ example: 5000, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  cleaningFee?: number;

  @ApiProperty({ example: 20000, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  securityDeposit?: number;

  @ApiProperty({ example: 2000, required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  extraGuestFee?: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  minimumStay?: number;

  @ApiProperty({ example: 30, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  maximumStay?: number;

  @ApiProperty({ example: '15:00', required: false })
  @IsString()
  @IsOptional()
  checkInTime?: string;

  @ApiProperty({ example: '11:00', required: false })
  @IsString()
  @IsOptional()
  checkOutTime?: string;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  smokingAllowed?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  petsAllowed?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsBoolean()
  @IsOptional()
  eventsAllowed?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  quietHours?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  additionalRules?: string;

  @ApiProperty({ example: 'moderate', required: false })
  @IsString()
  @IsOptional()
  cancellationPolicy?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

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

  @ApiProperty({ type: [PropertyImageDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyImageDto)
  @IsOptional()
  images?: PropertyImageDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  seoTitle?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  seoDescription?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  seoKeywords?: string[];
}


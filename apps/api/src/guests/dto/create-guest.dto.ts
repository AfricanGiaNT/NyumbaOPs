import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuestSource } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGuestDto {
  @ApiProperty({ example: 'Chikondi Phiri' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'chikondi@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+265991000111' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ enum: GuestSource })
  @IsEnum(GuestSource)
  source: GuestSource;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;
}

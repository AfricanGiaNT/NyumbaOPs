import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiPropertyOptional({ example: '2025-02-10T14:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  actualCheckIn?: string;

  @ApiPropertyOptional({ example: '2025-02-15T09:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  actualCheckOut?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  checkInNotes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  checkOutNotes?: string;
}

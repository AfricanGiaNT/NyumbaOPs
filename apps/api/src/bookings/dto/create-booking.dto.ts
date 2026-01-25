import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'guest-id' })
  @IsString()
  guestId: string;

  @ApiProperty({ example: 'property-id' })
  @IsString()
  propertyId: string;

  @ApiProperty({ example: '2025-02-10' })
  @IsDateString()
  checkInDate: string;

  @ApiProperty({ example: '2025-02-15' })
  @IsDateString()
  checkOutDate: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({ example: 'property-id' })
  @IsString()
  propertyId: string;

  @ApiProperty({ example: '2025-02-10' })
  @IsDateString()
  checkInDate: string;

  @ApiProperty({ example: '2025-02-15' })
  @IsDateString()
  checkOutDate: string;
}

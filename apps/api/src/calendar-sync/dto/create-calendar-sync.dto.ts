import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class CreateCalendarSyncDto {
  @ApiProperty({ example: 'property-uuid' })
  @IsString()
  propertyId: string;

  @ApiProperty({ example: 'AIRBNB', description: 'Platform name (AIRBNB, BOOKING_COM, etc.)' })
  @IsString()
  platform: string;

  @ApiProperty({ 
    example: 'https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe',
    description: 'iCal feed URL from Airbnb'
  })
  @IsUrl()
  icalUrl: string;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiProperty({ example: 30, default: 30, description: 'Sync frequency in minutes' })
  @IsInt()
  @Min(15)
  @IsOptional()
  syncFrequency?: number;
}

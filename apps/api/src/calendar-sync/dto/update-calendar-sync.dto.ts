import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCalendarSyncDto {
  @ApiPropertyOptional({ example: 'AIRBNB' })
  @IsString()
  @IsOptional()
  platform?: string;

  @ApiPropertyOptional({ 
    example: 'https://www.airbnb.com/calendar/ical/1302977127776391705.ics?t=8995afbaaa4d47a88983f1366ff8abfe'
  })
  @IsUrl()
  @IsOptional()
  icalUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Sync frequency in minutes' })
  @IsInt()
  @Min(15)
  @IsOptional()
  syncFrequency?: number;
}

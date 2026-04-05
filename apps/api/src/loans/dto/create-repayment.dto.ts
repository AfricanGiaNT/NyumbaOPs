import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRepaymentDto {
  @ApiProperty({ example: 100000 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2025-02-15' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

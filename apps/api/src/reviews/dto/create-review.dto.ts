import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'Chikondi Phiri' })
  @IsString()
  reviewerName: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiPropertyOptional({ example: 'Lovely stay, would recommend!' })
  @IsString()
  @MaxLength(1500)
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  cleanlinessRating?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  locationRating?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  valueRating?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  communicationRating?: number;
}

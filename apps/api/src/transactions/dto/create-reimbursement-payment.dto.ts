import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateReimbursementPaymentDto {
  @ApiProperty({
    example: 500000,
    description: 'Amount received in the expense currency',
  })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z' })
  @IsDateString()
  paidAt: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

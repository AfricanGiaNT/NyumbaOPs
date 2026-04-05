import { ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class LoanQueryDto {
  @ApiPropertyOptional({ enum: LoanStatus })
  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;
}

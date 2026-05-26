import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UtilityType } from '@prisma/client';

export class QueryUtilityBillsDto {
  @IsString()
  @IsOptional()
  propertyId?: string;

  @IsEnum(UtilityType)
  @IsOptional()
  type?: UtilityType;
}

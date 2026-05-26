import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Currency, UtilityType } from '@prisma/client';

export class CreateUtilityBillDto {
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsEnum(UtilityType)
  type: UtilityType;

  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsString()
  @IsNotEmpty()
  billingDate: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

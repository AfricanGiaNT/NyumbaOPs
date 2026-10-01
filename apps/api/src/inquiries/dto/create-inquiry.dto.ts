import { IsDateString, IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  propertyId: string;

  @IsString()
  @MaxLength(120)
  guestName: string;

  @IsEmail()
  guestEmail: string;

  @IsString()
  @MaxLength(40)
  guestPhone: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsInt()
  @Min(1)
  @Max(30)
  numberOfGuests: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

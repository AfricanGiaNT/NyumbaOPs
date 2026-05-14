import { ApiProperty } from '@nestjs/swagger';
import { WorkCategory, WorkPriority, WorkStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class WorkQueryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  propertyId?: string;

  @ApiProperty({ enum: WorkStatus, required: false })
  @IsEnum(WorkStatus)
  @IsOptional()
  status?: WorkStatus;

  @ApiProperty({ enum: WorkPriority, required: false })
  @IsEnum(WorkPriority)
  @IsOptional()
  priority?: WorkPriority;

  @ApiProperty({ enum: WorkCategory, required: false })
  @IsEnum(WorkCategory)
  @IsOptional()
  category?: WorkCategory;
}

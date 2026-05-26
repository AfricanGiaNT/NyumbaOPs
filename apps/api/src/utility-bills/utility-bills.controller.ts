import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUtilityBillDto } from './dto/create-utility-bill.dto';
import { QueryUtilityBillsDto } from './dto/query-utility-bills.dto';
import { UtilityBillsService } from './utility-bills.service';

@ApiTags('utility-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('utility-bills')
export class UtilityBillsController {
  constructor(private readonly utilityBillsService: UtilityBillsService) {}

  @Post()
  create(
    @Body() dto: CreateUtilityBillDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.utilityBillsService.create(dto, userId);
  }

  @Get()
  findAll(@Query() query: QueryUtilityBillsDto) {
    return this.utilityBillsService.findAll(query);
  }

  @Get('anomalies')
  getAnomalies(@Query('propertyId') propertyId?: string) {
    return this.utilityBillsService.getAnomalies(propertyId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.utilityBillsService.remove(id, userId);
  }
}

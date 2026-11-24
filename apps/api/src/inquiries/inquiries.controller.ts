import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryStatusDto } from './dto/update-inquiry-status.dto';
import { InquiriesService } from './inquiries.service';
import { ReservationsService } from '../reservations/reservations.service';

@Controller()
export class InquiriesController {
  constructor(
    private readonly inquiries: InquiriesService,
    private readonly reservations: ReservationsService,
  ) {}

  @Post('v1/public/inquiries')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  create(@Body() dto: CreateInquiryDto) {
    return this.reservations.create(dto);
  }

  @Get('inquiries')
  @Roles('OWNER', 'STAFF')
  findAll() {
    return this.inquiries.findAll();
  }

  @Get('inquiries/:id')
  @Roles('OWNER', 'STAFF')
  findOne(@Param('id') id: string) {
    return this.inquiries.findOne(id);
  }

  @Patch('inquiries/:id/status')
  @Roles('OWNER', 'STAFF')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateInquiryStatusDto) {
    return this.inquiries.updateStatus(id, dto.status);
  }

  @Post('inquiries/:id/convert')
  @Roles('OWNER')
  convert(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.inquiries.convert(id, req.user.id);
  }
}

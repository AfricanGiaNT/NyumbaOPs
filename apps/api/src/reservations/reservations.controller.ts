import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateInquiryDto } from '../inquiries/dto/create-inquiry.dto';
import { ReservationsService } from './reservations.service';

@Controller()
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post('v1/public/reservations')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  create(@Body() dto: CreateInquiryDto) {
    return this.reservations.create(dto);
  }

  @Get('reservations')
  @Roles('OWNER', 'STAFF')
  list() {
    return this.reservations.list();
  }

  @Post('reservations/:id/start-review')
  @Roles('OWNER')
  startLegacy(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.reservations.startLegacy(id, req.user.id);
  }

  @Post('reservations/:id/accept')
  @Roles('OWNER')
  accept(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.reservations.accept(id, req.user.id);
  }

  @Post('reservations/:id/reject')
  @Roles('OWNER')
  reject(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.reservations.reject(id, req.user.id);
  }

  @Post('reservations/:id/confirm')
  @Roles('OWNER')
  confirm(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.reservations.confirm(id, req.user.id);
  }

  @Post('reservations/:id/cancel')
  @Roles('OWNER')
  cancel(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.reservations.cancel(id, req.user.id);
  }
}

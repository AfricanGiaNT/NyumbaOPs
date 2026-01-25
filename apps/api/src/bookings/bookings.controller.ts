import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles('OWNER', 'STAFF')
  create(@Body() dto: CreateBookingDto, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.bookingsService.create(dto, userId);
  }

  @Get()
  @Roles('OWNER', 'STAFF')
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get('availability')
  @Roles('OWNER', 'STAFF')
  checkAvailability(@Query() query: AvailabilityQueryDto) {
    return this.bookingsService.checkAvailability(query);
  }

  @Get(':id')
  @Roles('OWNER', 'STAFF')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'STAFF')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.bookingsService.update(id, dto, userId);
  }

  @Patch(':id/status')
  @Roles('OWNER', 'STAFF')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.bookingsService.updateStatus(id, dto, userId);
  }

  @Delete(':id')
  @Roles('OWNER', 'STAFF')
  remove(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.bookingsService.remove(id, userId);
  }
}

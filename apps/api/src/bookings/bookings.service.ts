import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { BookingStatus, PropertyStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { isValidStatusTransition } from './bookings.utils';

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
];

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly telegram?: TelegramService,
  ) {}

  async create(dto: CreateBookingDto, userId: string) {
    await this.ensureGuestExists(dto.guestId);
    await this.ensurePropertyAvailable(dto.propertyId, dto.checkInDate, dto.checkOutDate);

    const booking = await this.prisma.booking.create({
      data: {
        guestId: dto.guestId,
        propertyId: dto.propertyId,
        checkInDate: new Date(dto.checkInDate),
        checkOutDate: new Date(dto.checkOutDate),
        notes: dto.notes,
        createdBy: userId,
      },
    });

    if (this.telegram) {
      await this.telegram.notifyNewBooking(booking.id);
    }

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'Booking',
      resourceId: booking.id,
      userId,
      details: { status: booking.status },
    });

    return booking;
  }

  findAll() {
    return this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { guest: true, property: true },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { guest: true, property: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async update(id: string, dto: UpdateBookingDto, userId: string) {
    if (dto.guestId) {
      await this.ensureGuestExists(dto.guestId);
    }
    if (dto.propertyId || dto.checkInDate || dto.checkOutDate) {
      const existing = await this.prisma.booking.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Booking not found');
      }
      const propertyId = dto.propertyId ?? existing.propertyId;
      const checkInDate = dto.checkInDate ?? existing.checkInDate.toISOString();
      const checkOutDate = dto.checkOutDate ?? existing.checkOutDate.toISOString();
      await this.ensurePropertyAvailable(propertyId, checkInDate, checkOutDate, id);
    }

    const booking = await this.prisma.booking.update({
      where: { id },
      data: {
        guestId: dto.guestId,
        propertyId: dto.propertyId,
        checkInDate: dto.checkInDate ? new Date(dto.checkInDate) : undefined,
        checkOutDate: dto.checkOutDate ? new Date(dto.checkOutDate) : undefined,
        notes: dto.notes,
      },
    });

    await this.audit.logAction({
      action: 'UPDATE',
      resourceType: 'Booking',
      resourceId: booking.id,
      userId,
      details: { status: booking.status },
    });

    return booking;
  }

  async updateStatus(id: string, dto: UpdateBookingStatusDto, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!isValidStatusTransition(booking.status, dto.status)) {
      throw new BadRequestException('Invalid status transition');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: dto.status,
        actualCheckIn: dto.actualCheckIn ? new Date(dto.actualCheckIn) : undefined,
        actualCheckOut: dto.actualCheckOut ? new Date(dto.actualCheckOut) : undefined,
        checkInNotes: dto.checkInNotes,
        checkOutNotes: dto.checkOutNotes,
      },
    });

    await this.audit.logAction({
      action: 'UPDATE',
      resourceType: 'Booking',
      resourceId: updated.id,
      userId,
      details: { status: updated.status },
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const booking = await this.prisma.booking.delete({ where: { id } });

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'Booking',
      resourceId: booking.id,
      userId,
      details: { status: booking.status },
    });

    return booking;
  }

  async checkAvailability(query: AvailabilityQueryDto) {
    await this.ensurePropertyAvailable(
      query.propertyId,
      query.checkInDate,
      query.checkOutDate,
    );
    return { available: true };
  }

  private async ensureGuestExists(guestId: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }
  }

  private async ensurePropertyAvailable(
    propertyId: string,
    checkInDate: string,
    checkOutDate: string,
    excludeBookingId?: string,
  ) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    if (property.status !== PropertyStatus.ACTIVE) {
      throw new BadRequestException('Property is not active');
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (!(checkIn < checkOut)) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    const overlapCount = await this.prisma.booking.count({
      where: {
        propertyId,
        status: { in: ACTIVE_STATUSES },
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    });

    if (overlapCount > 0) {
      throw new BadRequestException('Property is not available for these dates');
    }
  }
}

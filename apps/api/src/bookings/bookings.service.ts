import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { BookingStatus, Prisma, PropertyStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { isValidStatusTransition } from './bookings.utils';
import { ReservationsService } from '../reservations/reservations.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly reservations: ReservationsService,
    @Optional() private readonly telegram?: TelegramService,
  ) {}

  async create(dto: CreateBookingDto, userId: string) {
    await this.reservations.maintain(dto.propertyId);
    await this.ensureGuestExists(dto.guestId);
    const booking = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Property" WHERE id = ${dto.propertyId} FOR UPDATE`;
        await this.reservations.preparePropertyTx(tx, dto.propertyId);
        await this.ensurePropertyAvailable(
          dto.propertyId,
          dto.checkInDate,
          dto.checkOutDate,
          undefined,
          tx,
        );
        return tx.booking.create({
          data: {
            guestId: dto.guestId,
            propertyId: dto.propertyId,
            checkInDate: new Date(dto.checkInDate),
            checkOutDate: new Date(dto.checkOutDate),
            notes: dto.notes,
            createdBy: userId,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

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
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Booking not found');
    if (existing.source === 'RESERVATION')
      throw new BadRequestException(
        'Change reservation dates through a new request',
      );
    if (dto.guestId) {
      await this.ensureGuestExists(dto.guestId);
    }
    if (dto.propertyId || dto.checkInDate || dto.checkOutDate) {
      const propertyId = dto.propertyId ?? existing.propertyId;
      await this.reservations.maintain(propertyId);
      const checkInDate = dto.checkInDate ?? existing.checkInDate.toISOString();
      const checkOutDate =
        dto.checkOutDate ?? existing.checkOutDate.toISOString();
      const booking = await this.prisma.$transaction(
        async (tx) => {
          for (const property of [
            ...new Set([existing.propertyId, propertyId]),
          ].sort()) {
            await tx.$queryRaw`SELECT id FROM "Property" WHERE id = ${property} FOR UPDATE`;
          }
          await this.reservations.preparePropertyTx(tx, propertyId);
          await this.ensurePropertyAvailable(
            propertyId,
            checkInDate,
            checkOutDate,
            id,
            tx,
          );
          const updated = await tx.booking.update({
            where: { id },
            data: {
              guestId: dto.guestId,
              propertyId: dto.propertyId,
              checkInDate: dto.checkInDate
                ? new Date(dto.checkInDate)
                : undefined,
              checkOutDate: dto.checkOutDate
                ? new Date(dto.checkOutDate)
                : undefined,
              notes: dto.notes,
            },
          });
          await this.reservations.preparePropertyTx(tx, existing.propertyId);
          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await this.audit.logAction({
        action: 'UPDATE',
        resourceType: 'Booking',
        resourceId: booking.id,
        userId,
        details: { status: booking.status },
      });
      await this.reservations.maintainBestEffort(existing.propertyId);
      return booking;
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
    if (
      booking.source === 'RESERVATION' &&
      ([BookingStatus.CONFIRMED, BookingStatus.CANCELLED] as BookingStatus[]).includes(dto.status)
    ) {
      throw new BadRequestException('Use reservation decisions for this stay');
    }
    if (booking.isSyncedBooking && dto.status === BookingStatus.CANCELLED) {
      throw new BadRequestException(
        'A synced stay is released when it disappears from the external calendar',
      );
    }

    if (!isValidStatusTransition(booking.status, dto.status)) {
      throw new BadRequestException('Invalid status transition');
    }

    if (
      dto.status === BookingStatus.CONFIRMED &&
      booking.holdExpiresAt &&
      booking.holdExpiresAt <= new Date()
    ) {
      throw new BadRequestException('Booking hold has expired');
    }

    const statusData = {
      status: dto.status,
      actualCheckIn: dto.actualCheckIn
        ? new Date(dto.actualCheckIn)
        : undefined,
      actualCheckOut: dto.actualCheckOut
        ? new Date(dto.actualCheckOut)
        : undefined,
      checkInNotes: dto.checkInNotes,
      checkOutNotes: dto.checkOutNotes,
    };
    if (dto.status === BookingStatus.CONFIRMED) {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Property" WHERE id = ${booking.propertyId} FOR UPDATE`;
          await this.reservations.preparePropertyTx(tx, booking.propertyId);
          await this.ensurePropertyAvailable(
            booking.propertyId,
            booking.checkInDate.toISOString(),
            booking.checkOutDate.toISOString(),
            id,
            tx,
          );
          const changed = await tx.booking.updateMany({
            where: {
              id,
              status: BookingStatus.PENDING,
              ...(booking.holdExpiresAt
                ? { holdExpiresAt: { gt: new Date() } }
                : {}),
            },
            data: statusData,
          });
          if (changed.count !== 1)
            throw new BadRequestException(
              'Booking hold has expired or changed',
            );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } else if (dto.status === BookingStatus.CANCELLED) {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Property" WHERE id = ${booking.propertyId} FOR UPDATE`;
          const changed = await tx.booking.updateMany({
            where: { id, status: booking.status },
            data: statusData,
          });
          if (changed.count !== 1)
            throw new BadRequestException(
              'Booking status changed; reload and try again',
            );
          await this.reservations.preparePropertyTx(tx, booking.propertyId);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } else {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Property" WHERE id = ${booking.propertyId} FOR UPDATE`;
          const changed = await tx.booking.updateMany({
            where: { id, status: booking.status },
            data: statusData,
          });
          if (changed.count !== 1)
            throw new BadRequestException(
              'Booking status changed; reload and try again',
            );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }
    const updated = await this.prisma.booking.findUniqueOrThrow({
      where: { id },
    });

    await this.audit.logAction({
      action: 'UPDATE',
      resourceType: 'Booking',
      resourceId: updated.id,
      userId,
      details: { status: updated.status },
    });

    if (dto.status === BookingStatus.CANCELLED)
      await this.reservations.maintainBestEffort(booking.propertyId);

    return updated;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Booking not found');
    if (existing.source === 'RESERVATION')
      throw new BadRequestException('Use reservation decisions for this stay');
    if (existing.isSyncedBooking)
      throw new BadRequestException('Synced stays cannot be deleted manually');
    const booking = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Property" WHERE id = ${existing.propertyId} FOR UPDATE`;
        const removed = await tx.booking.delete({ where: { id } });
        await this.reservations.preparePropertyTx(tx, existing.propertyId);
        return removed;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'Booking',
      resourceId: booking.id,
      userId,
      details: { status: booking.status },
    });

    await this.reservations.maintainBestEffort(booking.propertyId);

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
    const guest = await this.prisma.guest.findUnique({
      where: { id: guestId },
    });
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }
  }

  private async ensurePropertyAvailable(
    propertyId: string,
    checkInDate: string,
    checkOutDate: string,
    excludeBookingId?: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const property = await client.property.findUnique({
      where: { id: propertyId },
    });
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

    const overlapCount = await client.booking.count({
      where: {
        propertyId,
        OR: [
          {
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
          },
          {
            status: BookingStatus.PENDING,
            OR: [
              { holdExpiresAt: null },
              { holdExpiresAt: { gt: new Date() } },
            ],
          },
        ],
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    });

    if (overlapCount > 0) {
      throw new BadRequestException(
        'Property is not available for these dates',
      );
    }
  }
}

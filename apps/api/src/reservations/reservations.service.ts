import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BookingStatus,
  GuestSource,
  InquiryStatus,
  Prisma,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from '../inquiries/dto/create-inquiry.dto';
import { ReservationEmailService } from './reservations-email.service';

const DAY = 24 * 60 * 60 * 1000;
const LIVE_REQUEST = [
  InquiryStatus.PENDING_REVIEW,
  InquiryStatus.AWAITING_CONFIRMATION,
];

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: ReservationEmailService,
  ) {}

  private async transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2034'
          )
        )
          throw error;
        if (attempt === 2)
          throw new ConflictException('Reservation changed; please try again');
      }
    }
    throw new ConflictException('Reservation changed; please try again');
  }

  // All paths that assign dates lock the same property row before checking overlap.
  private async lockProperty(tx: Prisma.TransactionClient, propertyId: string) {
    await tx.$queryRaw`SELECT id FROM "Property" WHERE id = ${propertyId} FOR UPDATE`;
  }

  private blockingWhere(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
    now: Date,
    excludeId?: string,
  ): Prisma.BookingWhereInput {
    return {
      propertyId,
      checkInDate: { lt: checkOutDate },
      checkOutDate: { gt: checkInDate },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] } },
        {
          status: BookingStatus.PENDING,
          OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }],
        },
      ],
    };
  }

  private async available(
    tx: Prisma.TransactionClient,
    propertyId: string,
    start: Date,
    end: Date,
    now: Date,
    excludeId?: string,
  ) {
    return (
      (await tx.booking.count({
        where: this.blockingWhere(propertyId, start, end, now, excludeId),
      })) === 0
    );
  }

  private parseDate(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new BadRequestException('Dates must use YYYY-MM-DD');
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      throw new BadRequestException('Invalid date');
    return date;
  }

  private todayForStay(now = new Date()): Date {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Blantyre',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const value = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '';
    return new Date(
      `${value('year')}-${value('month')}-${value('day')}T00:00:00.000Z`,
    );
  }

  async create(dto: CreateInquiryDto) {
    if (!process.env.RESERVATIONS_ADMIN_EMAIL?.trim())
      throw new ServiceUnavailableException(
        'Reservation requests are temporarily unavailable',
      );
    const start = this.parseDate(dto.checkInDate);
    const end = this.parseDate(dto.checkOutDate);
    const today = this.todayForStay();
    if (start < today || end <= start)
      throw new BadRequestException('Choose a valid future stay');
    const name = dto.guestName.trim();
    const phone = dto.guestPhone.trim();
    if (!name || !phone)
      throw new BadRequestException('Name and phone are required');

    const created = await this.transaction(async (tx) => {
      await this.lockProperty(tx, dto.propertyId);
      const property = await tx.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property || property.status !== PropertyStatus.ACTIVE)
        throw new NotFoundException('Property not available');
      if (dto.numberOfGuests > property.maxGuests)
        throw new BadRequestException('Guest count exceeds property capacity');
      const now = new Date();
      await this.releaseExpiredTx(tx, property.id, now);
      await this.advanceQueueTx(tx, property.id, now);
      const free = await this.available(tx, property.id, start, end, now);
      let inquiry = await tx.inquiry.create({
        data: {
          propertyId: property.id,
          guestName: name,
          guestEmail: dto.guestEmail.trim().toLowerCase(),
          guestPhone: phone,
          checkInDate: start,
          checkOutDate: end,
          numberOfGuests: dto.numberOfGuests,
          message: dto.message?.trim() || null,
          status: free ? InquiryStatus.PENDING_REVIEW : InquiryStatus.QUEUED,
        },
      });
      if (free) inquiry = await this.makeHoldTx(tx, inquiry, now);
      await this.queueStatusEmailsTx(
        tx,
        inquiry,
        property.name,
        free ? 'held' : 'queued',
        true,
      );
      return inquiry;
    });
    await this.emails.tryDispatch();
    return { success: true, data: { id: created.id, status: created.status } };
  }

  async list() {
    const data = await this.prisma.inquiry.findMany({
      include: {
        property: { select: { id: true, name: true } },
        booking: { select: { id: true, status: true, holdExpiresAt: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return { success: true, data };
  }

  async startLegacy(id: string, userId: string) {
    const data = await this.transaction(async (tx) => {
      const initial = await tx.inquiry.findUnique({ where: { id } });
      if (!initial) throw new NotFoundException('Reservation not found');
      await this.lockProperty(tx, initial.propertyId);
      const current = await tx.inquiry.findUniqueOrThrow({ where: { id } });
      if (
        !([InquiryStatus.NEW, InquiryStatus.CONTACTED] as InquiryStatus[]).includes(current.status)
      )
        throw new BadRequestException('Legacy request is already processed');
      const property = await tx.property.findUnique({
        where: { id: current.propertyId },
      });
      const now = new Date();
      const today = this.todayForStay(now);
      if (
        !property ||
        property.status !== PropertyStatus.ACTIVE ||
        current.checkInDate < today
      )
        throw new BadRequestException(
          'Dates or property are no longer available',
        );
      await this.releaseExpiredTx(tx, current.propertyId, now);
      await this.advanceQueueTx(tx, current.propertyId, now);
      const free = await this.available(
        tx,
        current.propertyId,
        current.checkInDate,
        current.checkOutDate,
        now,
      );
      let updated = await tx.inquiry.update({
        where: { id },
        data: {
          status: free ? InquiryStatus.PENDING_REVIEW : InquiryStatus.QUEUED,
          reviewedBy: userId,
          reviewedAt: now,
        },
      });
      if (free) updated = await this.makeHoldTx(tx, updated, now, userId);
      await this.queueStatusEmailsTx(
        tx,
        updated,
        property.name,
        free ? 'held' : 'queued',
        false,
      );
      return updated;
    });
    await this.emails.tryDispatch();
    return { success: true, data };
  }

  async accept(id: string, userId: string) {
    const data = await this.transaction(async (tx) => {
      const initial = await tx.inquiry.findUnique({ where: { id } });
      if (!initial) throw new NotFoundException('Reservation not found');
      await this.lockProperty(tx, initial.propertyId);
      const inquiry = await tx.inquiry.findUniqueOrThrow({
        where: { id },
        include: { booking: true, property: true },
      });
      if (
        inquiry.status !== InquiryStatus.PENDING_REVIEW ||
        !inquiry.booking ||
        inquiry.booking.status !== BookingStatus.PENDING
      )
        throw new BadRequestException('Reservation is not awaiting review');
      const now = new Date();
      if (
        inquiry.property.status !== PropertyStatus.ACTIVE ||
        inquiry.checkInDate < this.todayForStay(now)
      )
        throw new ConflictException(
          'Property or dates are no longer available',
        );
      if (
        !inquiry.booking.holdExpiresAt ||
        inquiry.booking.holdExpiresAt <= now
      )
        throw new ConflictException('Review hold expired');
      if (
        !(await this.available(
          tx,
          inquiry.propertyId,
          inquiry.checkInDate,
          inquiry.checkOutDate,
          now,
          inquiry.booking.id,
        ))
      )
        throw new ConflictException('Dates are no longer available');
      await tx.booking.update({
        where: { id: inquiry.booking.id },
        data: { holdExpiresAt: new Date(now.getTime() + DAY) },
      });
      const updated = await tx.inquiry.update({
        where: { id },
        data: {
          status: InquiryStatus.AWAITING_CONFIRMATION,
          reviewedBy: userId,
          reviewedAt: now,
        },
      });
      await this.queueStatusEmailsTx(
        tx,
        updated,
        inquiry.property.name,
        'accepted',
        false,
      );
      return updated;
    });
    await this.emails.tryDispatch();
    return { success: true, data };
  }

  async reject(id: string, userId: string) {
    const data = await this.transaction(async (tx) => {
      const initial = await tx.inquiry.findUnique({ where: { id } });
      if (!initial) throw new NotFoundException('Reservation not found');
      await this.lockProperty(tx, initial.propertyId);
      const inquiry = await tx.inquiry.findUniqueOrThrow({
        where: { id },
        include: { booking: true, property: true },
      });
      if (
        !([
          InquiryStatus.PENDING_REVIEW,
          InquiryStatus.AWAITING_CONFIRMATION,
          InquiryStatus.QUEUED,
        ] as InquiryStatus[]).includes(inquiry.status)
      )
        throw new BadRequestException('Reservation cannot be rejected');
      const now = new Date();
      if (inquiry.booking?.status === BookingStatus.PENDING)
        await tx.booking.update({
          where: { id: inquiry.booking.id },
          data: { status: BookingStatus.CANCELLED },
        });
      const updated = await tx.inquiry.update({
        where: { id },
        data: {
          status: InquiryStatus.REJECTED,
          reviewedBy: userId,
          reviewedAt: now,
        },
      });
      await this.queueStatusEmailsTx(
        tx,
        updated,
        inquiry.property.name,
        'rejected',
        false,
      );
      await this.advanceQueueTx(tx, inquiry.propertyId, now);
      return updated;
    });
    await this.emails.tryDispatch();
    return { success: true, data };
  }

  async confirm(id: string, userId: string) {
    const data = await this.transaction(async (tx) => {
      const initial = await tx.inquiry.findUnique({ where: { id } });
      if (!initial) throw new NotFoundException('Reservation not found');
      await this.lockProperty(tx, initial.propertyId);
      const inquiry = await tx.inquiry.findUniqueOrThrow({
        where: { id },
        include: { booking: true, property: true },
      });
      if (
        inquiry.status !== InquiryStatus.AWAITING_CONFIRMATION ||
        !inquiry.booking ||
        inquiry.booking.status !== BookingStatus.PENDING
      )
        throw new BadRequestException(
          'Reservation is not awaiting final confirmation',
        );
      const now = new Date();
      if (
        inquiry.property.status !== PropertyStatus.ACTIVE ||
        inquiry.checkInDate < this.todayForStay(now)
      )
        throw new ConflictException(
          'Property or dates are no longer available',
        );
      if (
        !inquiry.booking.holdExpiresAt ||
        inquiry.booking.holdExpiresAt <= now
      )
        throw new ConflictException('Follow-up hold expired');
      if (
        !(await this.available(
          tx,
          inquiry.propertyId,
          inquiry.checkInDate,
          inquiry.checkOutDate,
          now,
          inquiry.booking.id,
        ))
      )
        throw new ConflictException('Dates are no longer available');
      await tx.booking.update({
        where: { id: inquiry.booking.id },
        data: { status: BookingStatus.CONFIRMED, holdExpiresAt: null },
      });
      const updated = await tx.inquiry.update({
        where: { id },
        data: {
          status: InquiryStatus.CONFIRMED,
          confirmedBy: userId,
          confirmedAt: now,
        },
      });
      await this.queueStatusEmailsTx(
        tx,
        updated,
        inquiry.property.name,
        'confirmed',
        false,
      );
      return updated;
    });
    await this.emails.tryDispatch();
    return { success: true, data };
  }

  async cancel(id: string, userId: string) {
    const data = await this.transaction(async (tx) => {
      const initial = await tx.inquiry.findUnique({ where: { id } });
      if (!initial) throw new NotFoundException('Reservation not found');
      await this.lockProperty(tx, initial.propertyId);
      const inquiry = await tx.inquiry.findUniqueOrThrow({
        where: { id },
        include: { booking: true, property: true },
      });
      if (
        inquiry.status !== InquiryStatus.CONFIRMED ||
        !inquiry.booking ||
        inquiry.booking.status !== BookingStatus.CONFIRMED
      )
        throw new BadRequestException(
          'Only confirmed future reservations can be cancelled here',
        );
      const today = this.todayForStay();
      if (inquiry.checkInDate < today)
        throw new BadRequestException(
          'An active stay cannot be cancelled here',
        );
      await tx.booking.update({
        where: { id: inquiry.booking.id },
        data: { status: BookingStatus.CANCELLED },
      });
      const updated = await tx.inquiry.update({
        where: { id },
        data: {
          status: InquiryStatus.CANCELLED,
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });
      await this.queueStatusEmailsTx(
        tx,
        updated,
        inquiry.property.name,
        'cancelled',
        false,
      );
      await this.advanceQueueTx(tx, inquiry.propertyId, new Date());
      return updated;
    });
    await this.emails.tryDispatch();
    return { success: true, data };
  }

  async maintain(propertyId?: string) {
    const ids = propertyId
      ? [propertyId]
      : (await this.prisma.property.findMany({ select: { id: true } })).map(
          (item) => item.id,
        );
    for (const id of ids) {
      await this.transaction(async (tx) => {
        await this.lockProperty(tx, id);
        await this.preparePropertyTx(tx, id);
      });
    }
    await this.emails.tryDispatch();
  }

  async maintainBestEffort(propertyId: string) {
    try {
      await this.maintain(propertyId);
    } catch (error) {
      this.logger.error(
        `Reservation maintenance failed for ${propertyId}; the scheduler will retry`,
        error,
      );
    }
  }

  async preparePropertyTx(tx: Prisma.TransactionClient, propertyId: string) {
    const now = new Date();
    await this.releaseExpiredTx(tx, propertyId, now);
    await this.reconcileCancelledTx(tx, propertyId);
    await this.advanceQueueTx(tx, propertyId, now);
  }

  private async makeHoldTx(
    tx: Prisma.TransactionClient,
    inquiry: {
      id: string;
      propertyId: string;
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      checkInDate: Date;
      checkOutDate: Date;
      message: string | null;
    },
    now: Date,
    actorId?: string,
  ) {
    const system = actorId
      ? { id: actorId }
      : await tx.user.upsert({
          where: { email: 'system@nyumbaops.com' },
          create: {
            email: 'system@nyumbaops.com',
            name: 'System',
            role: 'OWNER',
          },
          update: {},
          select: { id: true },
        });
    const guest = await tx.guest.create({
      data: {
        name: inquiry.guestName,
        email: inquiry.guestEmail,
        phone: inquiry.guestPhone,
        source: GuestSource.LOCAL,
        createdBy: system.id,
      },
    });
    const booking = await tx.booking.create({
      data: {
        guestId: guest.id,
        propertyId: inquiry.propertyId,
        status: BookingStatus.PENDING,
        holdExpiresAt: new Date(now.getTime() + DAY),
        checkInDate: inquiry.checkInDate,
        checkOutDate: inquiry.checkOutDate,
        notes: inquiry.message,
        source: 'RESERVATION',
        createdBy: system.id,
      },
    });
    return tx.inquiry.update({
      where: { id: inquiry.id },
      data: { bookingId: booking.id },
    });
  }

  private async releaseExpiredTx(
    tx: Prisma.TransactionClient,
    propertyId: string,
    now: Date,
  ) {
    const expired = await tx.inquiry.findMany({
      where: {
        propertyId,
        status: { in: LIVE_REQUEST },
        booking: { status: BookingStatus.PENDING, holdExpiresAt: { lte: now } },
      },
      include: { booking: true, property: true },
    });
    for (const inquiry of expired) {
      if (!inquiry.booking) continue;
      await tx.booking.update({
        where: { id: inquiry.booking.id },
        data: { status: BookingStatus.CANCELLED },
      });
      const updated = await tx.inquiry.update({
        where: { id: inquiry.id },
        data: { status: InquiryStatus.EXPIRED },
      });
      await this.queueStatusEmailsTx(
        tx,
        updated,
        inquiry.property.name,
        'expired',
        false,
      );
    }
  }

  private async reconcileCancelledTx(
    tx: Prisma.TransactionClient,
    propertyId: string,
  ) {
    const cancelled = await tx.inquiry.findMany({
      where: {
        propertyId,
        status: { in: [...LIVE_REQUEST, InquiryStatus.CONFIRMED] },
        booking: { status: BookingStatus.CANCELLED },
      },
      include: { property: true },
    });
    for (const inquiry of cancelled) {
      const updated = await tx.inquiry.update({
        where: { id: inquiry.id },
        data: { status: InquiryStatus.CANCELLED },
      });
      await this.queueStatusEmailsTx(
        tx,
        updated,
        inquiry.property.name,
        'cancelled',
        false,
      );
    }
  }

  private async advanceQueueTx(
    tx: Prisma.TransactionClient,
    propertyId: string,
    now: Date,
  ) {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      select: { status: true },
    });
    const queued = await tx.inquiry.findMany({
      where: { propertyId, status: InquiryStatus.QUEUED },
      include: { property: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const today = this.todayForStay(now);
    for (const inquiry of queued) {
      if (inquiry.checkInDate < today) {
        const updated = await tx.inquiry.update({
          where: { id: inquiry.id },
          data: { status: InquiryStatus.EXPIRED },
        });
        await this.queueStatusEmailsTx(
          tx,
          updated,
          inquiry.property.name,
          'expired',
          false,
        );
        continue;
      }
      if (!property || property.status !== PropertyStatus.ACTIVE) continue;
      if (
        !(await this.available(
          tx,
          propertyId,
          inquiry.checkInDate,
          inquiry.checkOutDate,
          now,
        ))
      )
        continue;
      const updated = await tx.inquiry.update({
        where: { id: inquiry.id },
        data: { status: InquiryStatus.PENDING_REVIEW },
      });
      const held = await this.makeHoldTx(tx, updated, now);
      await this.queueStatusEmailsTx(
        tx,
        held,
        inquiry.property.name,
        'promoted',
        true,
      );
    }
  }

  private async queueStatusEmailsTx(
    tx: Prisma.TransactionClient,
    inquiry: {
      id: string;
      guestName: string;
      guestEmail: string;
      checkInDate: Date;
      checkOutDate: Date;
    },
    propertyName: string,
    event: string,
    notifyAdmin: boolean,
  ) {
    const dates = `${inquiry.checkInDate.toISOString().slice(0, 10)} to ${inquiry.checkOutDate.toISOString().slice(0, 10)}`;
    const text: Record<string, string> = {
      held: 'Your dates are temporarily held for 24 hours while the owner reviews your request. This is not a confirmed reservation.',
      queued:
        'Your request is queued because the dates are currently held or booked. We will email you if they open up.',
      promoted:
        'Your queued request now has a 24-hour review hold. This is not a confirmed reservation.',
      accepted:
        'The owner accepted your request for follow-up. Your dates are held for another 24 hours, but your stay is not confirmed yet.',
      confirmed: 'The owner has confirmed your reservation.',
      rejected: 'The owner has declined your reservation request.',
      expired: 'Your request or temporary hold has expired.',
      cancelled:
        'Your reservation or temporary hold has been cancelled. Please contact us if you would like to request other dates.',
    };
    await tx.reservationEmail.create({
      data: {
        inquiryId: inquiry.id,
        eventKey: `${inquiry.id}:${event}:guest`,
        recipient: inquiry.guestEmail,
        subject: `Nyumba Stays reservation ${event}`,
        body: `Hello ${inquiry.guestName},\n\n${text[event]}\n\nProperty: ${propertyName}\nDates: ${dates}\n\nPlease contact us if you have questions.`,
      },
    });
    const admin = process.env.RESERVATIONS_ADMIN_EMAIL?.trim();
    if (notifyAdmin && !admin)
      throw new ServiceUnavailableException(
        'Reservation notifications are not configured',
      );
    if (notifyAdmin && admin)
      await tx.reservationEmail.create({
        data: {
          inquiryId: inquiry.id,
          eventKey: `${inquiry.id}:${event}:admin`,
          recipient: admin,
          subject: `Reservation ${event}: ${propertyName}`,
          body: `Guest: ${inquiry.guestName}\nProperty: ${propertyName}\nDates: ${dates}\n\nReview: ${process.env.DASHBOARD_URL?.replace(/\/$/, '') ?? ''}/reservations?selected=${encodeURIComponent(inquiry.id)}`,
        },
      });
  }
}

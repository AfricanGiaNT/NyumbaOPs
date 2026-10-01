import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, GuestSource, InquiryStatus, Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInquiryDto) {
    const property = await this.prisma.property.findUnique({ where: { id: dto.propertyId } });
    if (!property || property.status !== PropertyStatus.ACTIVE) throw new NotFoundException('Property not available');
    const checkInDate = new Date(dto.checkInDate);
    const checkOutDate = new Date(dto.checkOutDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!Number.isFinite(checkInDate.getTime()) || !Number.isFinite(checkOutDate.getTime()) || checkInDate < today || checkOutDate <= checkInDate) {
      throw new BadRequestException('Choose a valid future stay');
    }
    if (dto.numberOfGuests > property.maxGuests) throw new BadRequestException('Guest count exceeds property capacity');
    if (!dto.guestName.trim() || !dto.guestPhone.trim()) throw new BadRequestException('Name and phone are required');

    const inquiry = await this.prisma.inquiry.create({
      data: {
        propertyId: property.id,
        guestName: dto.guestName.trim(),
        guestEmail: dto.guestEmail.trim().toLowerCase(),
        guestPhone: dto.guestPhone.trim(),
        checkInDate,
        checkOutDate,
        numberOfGuests: dto.numberOfGuests,
        message: dto.message?.trim() || null,
      },
    });
    return { success: true, data: inquiry };
  }

  async findAll() {
    const data = await this.prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' } });
    return { success: true, data };
  }

  async findOne(id: string) {
    const data = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('Inquiry not found');
    return { success: true, data };
  }

  async updateStatus(id: string, status: InquiryStatus) {
    if (status !== InquiryStatus.CONTACTED && status !== InquiryStatus.EXPIRED) {
      throw new BadRequestException('Use conversion to create a booking');
    }
    const current = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Inquiry not found');
    if (current.status === InquiryStatus.CONVERTED || current.status === InquiryStatus.EXPIRED) {
      throw new BadRequestException('Inquiry is already closed');
    }
    const data = await this.prisma.inquiry.update({ where: { id }, data: { status } });
    return { success: true, data };
  }

  async convert(id: string, userId: string) {
    try {
    return await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Inquiry" WHERE id = ${id} FOR UPDATE`;
      const inquiry = await tx.inquiry.findUnique({ where: { id } });
      if (!inquiry) throw new NotFoundException('Inquiry not found');
      if (inquiry.bookingId) return { success: true, data: inquiry };
      if (inquiry.status === InquiryStatus.EXPIRED) throw new BadRequestException('Inquiry is expired');

      const now = new Date();
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);
      const property = await tx.property.findUnique({ where: { id: inquiry.propertyId } });
      if (!property || property.status !== PropertyStatus.ACTIVE || inquiry.checkInDate < today) {
        throw new BadRequestException('Property or dates are no longer available');
      }
      const overlap = await tx.booking.count({
        where: {
          propertyId: inquiry.propertyId,
          checkInDate: { lt: inquiry.checkOutDate },
          checkOutDate: { gt: inquiry.checkInDate },
          OR: [
            { status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] } },
            { status: BookingStatus.PENDING, OR: [{ holdExpiresAt: null }, { holdExpiresAt: { gt: now } }] },
          ],
        },
      });
      if (overlap) throw new ConflictException('Property is no longer available for these dates');

      const guest = await tx.guest.create({
        data: {
          name: inquiry.guestName,
          email: inquiry.guestEmail,
          phone: inquiry.guestPhone,
          source: GuestSource.LOCAL,
          createdBy: userId,
        },
      });
      const booking = await tx.booking.create({
        data: {
          guestId: guest.id,
          propertyId: inquiry.propertyId,
          status: BookingStatus.PENDING,
          holdExpiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
          checkInDate: inquiry.checkInDate,
          checkOutDate: inquiry.checkOutDate,
          notes: inquiry.message,
          source: 'INQUIRY',
          createdBy: userId,
        },
      });
      const data = await tx.inquiry.update({
        where: { id },
        data: { status: InquiryStatus.CONVERTED, bookingId: booking.id },
      });
      return { success: true, data };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Dates changed while creating the hold. Please try again.');
      }
      throw error;
    }
  }
}

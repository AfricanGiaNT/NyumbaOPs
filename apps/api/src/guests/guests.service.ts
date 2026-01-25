import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Injectable()
export class GuestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateGuestDto, userId: string) {
    const guest = await this.prisma.guest.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        notes: dto.notes,
        rating: dto.rating,
        createdBy: userId,
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'Guest',
      resourceId: guest.id,
      userId,
      details: { name: guest.name, source: guest.source },
    });

    return guest;
  }

  findAll() {
    return this.prisma.guest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const guest = await this.prisma.guest.findUnique({
      where: { id },
      include: { bookings: { include: { property: true } } },
    });
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }
    return guest;
  }

  async update(id: string, dto: UpdateGuestDto, userId: string) {
    const guest = await this.prisma.guest.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        source: dto.source,
        notes: dto.notes,
        rating: dto.rating,
      },
    });

    await this.audit.logAction({
      action: 'UPDATE',
      resourceType: 'Guest',
      resourceId: guest.id,
      userId,
      details: { name: guest.name, source: guest.source },
    });

    return guest;
  }

  async remove(id: string, userId: string) {
    const guest = await this.prisma.guest.delete({ where: { id } });

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'Guest',
      resourceId: guest.id,
      userId,
      details: { name: guest.name },
    });

    return guest;
  }
}

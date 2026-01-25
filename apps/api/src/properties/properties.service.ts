import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyStatus } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreatePropertyDto, userId: string) {
    const property = await this.prisma.property.create({
      data: {
        name: dto.name,
        location: dto.location,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        maxGuests: dto.maxGuests,
        nightlyRate: dto.nightlyRate,
        currency: dto.currency,
        status: dto.status ?? PropertyStatus.ACTIVE,
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'Property',
      resourceId: property.id,
      userId,
      details: { name: property.name },
    });

    return property;
  }

  findAll() {
    return this.prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }

  async update(id: string, dto: UpdatePropertyDto, userId: string) {
    const property = await this.prisma.property.update({
      where: { id },
      data: {
        name: dto.name,
        location: dto.location,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        maxGuests: dto.maxGuests,
        nightlyRate: dto.nightlyRate,
        currency: dto.currency,
        status: dto.status,
      },
    });

    await this.audit.logAction({
      action: 'UPDATE',
      resourceType: 'Property',
      resourceId: property.id,
      userId,
      details: { name: property.name },
    });

    return property;
  }

  async remove(id: string, userId: string) {
    const property = await this.prisma.property.update({
      where: { id },
      data: { status: PropertyStatus.INACTIVE },
    });

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'Property',
      resourceId: property.id,
      userId,
      details: { name: property.name },
    });

    return property;
  }
}


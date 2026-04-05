import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyStatus } from '@prisma/client';

const PROPERTY_INCLUDE = {
  amenities: {
    include: { amenity: { select: { name: true } } },
  },
  images: {
    select: { url: true, alt: true, sortOrder: true, isCover: true },
    orderBy: { sortOrder: 'asc' as const },
  },
};

@Injectable()
export class PropertiesService {
  private readonly canonicalStorageUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'xtfpppcqscwsnpdfrzmw';
    this.canonicalStorageUrl = `https://${projectRef}.supabase.co/storage/v1`;
  }

  private normalizeImageUrl(url: string): string {
    if (!url) return url;
    if (url.startsWith(this.canonicalStorageUrl)) {
      console.log('[ImageURL] Already canonical:', url);
      return url;
    }
    const match = url.match(/\/storage\/v1\/object\/public\/(.+)$/);
    if (match) {
      const normalized = `${this.canonicalStorageUrl}/object/public/${match[1]}`;
      console.log('[ImageURL] Normalized:', url, '->', normalized);
      return normalized;
    }
    console.warn('[ImageURL] Could not normalize (no /storage/v1/object/public/ pattern):', url);
    return url;
  }

  private async syncAmenities(propertyId: string, amenityNames: string[]) {
    await this.prisma.propertyAmenity.deleteMany({ where: { propertyId } });
    if (!amenityNames.length) return;

    // Upsert each amenity so it is always present regardless of prior seeding
    await Promise.all(
      amenityNames.map((name) =>
        this.prisma.amenity.upsert({
          where: { name },
          create: { name },
          update: {},
        }),
      ),
    );

    const amenities = await this.prisma.amenity.findMany({
      where: { name: { in: amenityNames } },
      select: { id: true },
    });

    await this.prisma.propertyAmenity.createMany({
      data: amenities.map((a) => ({ propertyId, amenityId: a.id })),
      skipDuplicates: true,
    });
  }

  async create(dto: CreatePropertyDto, userId: string) {
    console.log('[PropertiesService.create] called with name:', dto.name, 'userId:', userId);
    try {
      const property = await this.prisma.property.create({
        data: {
          name: dto.name,
          propertyType: dto.propertyType,
          location: dto.location,
          address: dto.address,
          description: dto.description,
          spaceDescription: dto.spaceDescription,
          guestAccess: dto.guestAccess,
          otherDetails: dto.otherDetails,
          highlights: dto.highlights ?? [],
          bedrooms: dto.bedrooms,
          beds: dto.beds,
          bathrooms: dto.bathrooms,
          maxGuests: dto.maxGuests,
          propertySize: dto.propertySize,
          bedTypes: dto.bedTypes ?? [],
          nightlyRate: dto.nightlyRate,
          currency: dto.currency,
          weekendRate: dto.weekendRate,
          weeklyDiscount: dto.weeklyDiscount,
          monthlyDiscount: dto.monthlyDiscount,
          cleaningFee: dto.cleaningFee,
          securityDeposit: dto.securityDeposit,
          extraGuestFee: dto.extraGuestFee,
          minimumStay: dto.minimumStay,
          maximumStay: dto.maximumStay,
          checkInTime: dto.checkInTime,
          checkOutTime: dto.checkOutTime,
          smokingAllowed: dto.smokingAllowed ?? false,
          petsAllowed: dto.petsAllowed ?? false,
          eventsAllowed: dto.eventsAllowed ?? false,
          quietHours: dto.quietHours,
          additionalRules: dto.additionalRules,
          cancellationPolicy: dto.cancellationPolicy,
          latitude: dto.latitude,
          longitude: dto.longitude,
          googleMapsUrl: dto.googleMapsUrl,
          status: dto.status ?? PropertyStatus.ACTIVE,
        },
      });

      console.log('[PropertiesService.create] property created:', property.id);

      if (dto.amenities?.length) {
        await this.syncAmenities(property.id, dto.amenities);
      }

      await this.audit.logAction({
        action: 'CREATE',
        resourceType: 'Property',
        resourceId: property.id,
        userId,
        details: { name: property.name },
      });

      return this.findOne(property.id);
    } catch (err) {
      console.error('[PropertiesService.create] FAILED:', err);
      throw err;
    }
  }

  async findAll() {
    const properties = await this.prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: PROPERTY_INCLUDE,
    });
    return properties.map((p) => ({
      ...p,
      amenities: p.amenities.map((a) => a.amenity.name),
      images: p.images.map((img) => ({ ...img, url: this.normalizeImageUrl(img.url) })),
    }));
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: PROPERTY_INCLUDE,
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return {
      ...property,
      amenities: property.amenities.map((a) => a.amenity.name),
      images: property.images.map((img) => ({ ...img, url: this.normalizeImageUrl(img.url) })),
    };
  }

  async update(id: string, dto: UpdatePropertyDto, userId: string) {
    const property = await this.prisma.property.update({
      where: { id },
      data: {
        name: dto.name,
        propertyType: dto.propertyType,
        location: dto.location,
        address: dto.address,
        description: dto.description,
        spaceDescription: dto.spaceDescription,
        guestAccess: dto.guestAccess,
        otherDetails: dto.otherDetails,
        highlights: dto.highlights,
        bedrooms: dto.bedrooms,
        beds: dto.beds,
        bathrooms: dto.bathrooms,
        maxGuests: dto.maxGuests,
        propertySize: dto.propertySize,
        bedTypes: dto.bedTypes,
        nightlyRate: dto.nightlyRate,
        currency: dto.currency,
        weekendRate: dto.weekendRate,
        weeklyDiscount: dto.weeklyDiscount,
        monthlyDiscount: dto.monthlyDiscount,
        cleaningFee: dto.cleaningFee,
        securityDeposit: dto.securityDeposit,
        extraGuestFee: dto.extraGuestFee,
        minimumStay: dto.minimumStay,
        maximumStay: dto.maximumStay,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        smokingAllowed: dto.smokingAllowed,
        petsAllowed: dto.petsAllowed,
        eventsAllowed: dto.eventsAllowed,
        quietHours: dto.quietHours,
        additionalRules: dto.additionalRules,
        cancellationPolicy: dto.cancellationPolicy,
        latitude: dto.latitude,
        longitude: dto.longitude,
        googleMapsUrl: dto.googleMapsUrl,
        status: dto.status,
      },
    });

    if (dto.amenities !== undefined) {
      await this.syncAmenities(property.id, dto.amenities);
    }

    await this.audit.logAction({
      action: 'UPDATE',
      resourceType: 'Property',
      resourceId: property.id,
      userId,
      details: { name: property.name },
    });

    return this.findOne(property.id);
  }

  async remove(id: string, userId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'Property',
      resourceId: property.id,
      userId,
      details: { name: property.name },
    });

    await this.prisma.property.delete({ where: { id } });

    return { success: true, id };
  }
}


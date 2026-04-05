import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PropertyStatus } from '@prisma/client';
import { PublicPropertiesQueryDto } from './dto/public-properties-query.dto';
import {
  PublicPropertyDetailDto,
  PublicPropertyListItemDto,
} from './dto/public-property.dto';

@Injectable()
export class PublicService {
  private readonly storageUrl: string;
  private readonly storageBucket: string;
  private readonly serviceRoleKey: string;

  private readonly canonicalStorageUrl: string;

  constructor(private readonly prisma: PrismaService) {
    const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'xtfpppcqscwsnpdfrzmw';
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    this.storageBucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'property-images';
    this.storageUrl = `https://${projectRef}.supabase.co/storage/v1`;
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

  async getPublicProperties(query: PublicPropertiesQueryDto) {
    const limit = query.featured ? 6 : query.limit ?? 10;
    const offset = query.offset ?? 0;

    const [total, properties] = await Promise.all([
      this.prisma.property.count({
        where: { status: PropertyStatus.ACTIVE },
      }),
      this.prisma.property.findMany({
        where: { status: PropertyStatus.ACTIVE },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          images: {
            select: { url: true, alt: true, sortOrder: true, isCover: true },
            orderBy: { sortOrder: 'asc' },
          },
          amenities: {
            include: { amenity: { select: { name: true } } },
          },
        },
      }),
    ]);

    const data: PublicPropertyListItemDto[] = properties.map((property) => {
      const coverImage = property.images.find((image) => image.isCover) ?? property.images[0];
      return {
        id: property.id,
        name: property.name,
        location: property.location,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        maxGuests: property.maxGuests,
        nightlyRate: property.nightlyRate,
        currency: property.currency,
        status: property.status,
        coverImageUrl: coverImage?.url ? this.normalizeImageUrl(coverImage.url) : null,
        coverImageAlt: coverImage?.alt ?? null,
        amenities: property.amenities.map((amenity) => amenity.amenity.name),
      };
    });

    return {
      success: true,
      data,
      meta: {
        total,
        limit,
        offset,
      },
    };
  }

  async getPublicProperty(id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, status: PropertyStatus.ACTIVE },
      include: {
        images: {
          select: { url: true, alt: true, sortOrder: true, isCover: true },
          orderBy: { sortOrder: 'asc' },
        },
        amenities: {
          include: { amenity: { select: { name: true, description: true } } },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const data: PublicPropertyDetailDto = {
      id: property.id,
      name: property.name,
      propertyType: property.propertyType,
      location: property.location,
      address: property.address,
      description: property.description,
      spaceDescription: property.spaceDescription,
      guestAccess: property.guestAccess,
      otherDetails: property.otherDetails,
      highlights: property.highlights,
      bedrooms: property.bedrooms,
      beds: property.beds,
      bathrooms: property.bathrooms,
      maxGuests: property.maxGuests,
      propertySize: property.propertySize,
      bedTypes: property.bedTypes,
      nightlyRate: property.nightlyRate,
      currency: property.currency,
      weekendRate: property.weekendRate,
      cleaningFee: property.cleaningFee,
      minimumStay: property.minimumStay,
      maximumStay: property.maximumStay,
      checkInTime: property.checkInTime,
      checkOutTime: property.checkOutTime,
      smokingAllowed: property.smokingAllowed,
      petsAllowed: property.petsAllowed,
      eventsAllowed: property.eventsAllowed,
      quietHours: property.quietHours,
      additionalRules: property.additionalRules,
      cancellationPolicy: property.cancellationPolicy,
      latitude: property.latitude,
      longitude: property.longitude,
      googleMapsUrl: property.googleMapsUrl,
      status: property.status,
      images: property.images.map((image) => ({
        url: this.normalizeImageUrl(image.url),
        alt: image.alt,
        sortOrder: image.sortOrder,
        isCover: image.isCover,
      })),
      amenities: property.amenities.map((amenity) => ({
        name: amenity.amenity.name,
        description: amenity.amenity.description ?? null,
      })),
    };

    return { success: true, data };
  }

  async uploadImage(
    file: { buffer: Buffer; mimetype: string; originalname: string },
    propertyId: string,
    alt?: string,
    isCover?: boolean,
    sortOrder?: number,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (!this.serviceRoleKey) {
      throw new BadRequestException('Storage is not configured (missing SUPABASE_SERVICE_ROLE_KEY)');
    }

    const safeFilename = this.sanitizeFilename(file.originalname);
    const key = `properties/${propertyId}/${Date.now()}-${safeFilename}`;

    const uploadRes = await fetch(
      `${this.storageUrl}/object/${this.storageBucket}/${key}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          'Content-Type': file.mimetype,
          'x-upsert': 'true',
        },
        body: new Uint8Array(file.buffer),
      },
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new BadRequestException(`Storage upload failed: ${err}`);
    }

    const publicUrl = `${this.storageUrl}/object/public/${this.storageBucket}/${key}`;

    const image = await this.prisma.propertyImage.create({
      data: {
        propertyId,
        url: publicUrl,
        alt: alt ?? null,
        sortOrder: sortOrder ?? 0,
        isCover: isCover ?? false,
      },
    });

    return {
      success: true,
      data: {
        publicUrl,
        imageId: image.id,
      },
    };
  }

  async getICalFeed(propertyId: string): Promise<string> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        propertyId,
        status: { not: BookingStatus.CANCELLED },
      },
      orderBy: { checkInDate: 'asc' },
      select: { id: true, checkInDate: true, checkOutDate: true },
    });

    const toDateStr = (d: Date): string =>
      d.toISOString().slice(0, 10).replace(/-/g, '');

    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');

    const vevents = bookings
      .map((b) =>
        [
          'BEGIN:VEVENT',
          `UID:booking-${b.id}@nyumbaops`,
          `DTSTAMP:${now}Z`,
          `DTSTART;VALUE=DATE:${toDateStr(b.checkInDate)}`,
          `DTEND;VALUE=DATE:${toDateStr(b.checkOutDate)}`,
          'SUMMARY:Reserved',
          'STATUS:CONFIRMED',
          'END:VEVENT',
        ].join('\r\n')
      )
      .join('\r\n');

    const parts = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NyumbaOps//NyumbaOps Property Management//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];
    if (vevents) parts.push(vevents);
    parts.push('END:VCALENDAR');

    return parts.join('\r\n') + '\r\n';
  }

  private sanitizeFilename(filename: string) {
    const sanitized = filename
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return sanitized.length > 0 ? sanitized : 'upload';
  }
}

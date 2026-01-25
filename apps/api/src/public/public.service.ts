import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyStatus } from '@prisma/client';
import { PublicPropertiesQueryDto } from './dto/public-properties-query.dto';
import {
  PublicPropertyDetailDto,
  PublicPropertyListItemDto,
} from './dto/public-property.dto';
import { PublicUploadDto } from './dto/public-upload.dto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class PublicService {
  private readonly s3Client: S3Client | null;

  constructor(private readonly prisma: PrismaService) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const region = process.env.R2_REGION ?? 'auto';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.s3Client = null;
    } else {
      this.s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
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
        coverImageUrl: coverImage?.url ?? null,
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
          include: { amenity: { select: { name: true } } },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const data: PublicPropertyDetailDto = {
      id: property.id,
      name: property.name,
      location: property.location,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      maxGuests: property.maxGuests,
      nightlyRate: property.nightlyRate,
      currency: property.currency,
      status: property.status,
      images: property.images.map((image) => ({
        url: image.url,
        alt: image.alt,
        sortOrder: image.sortOrder,
        isCover: image.isCover,
      })),
      amenities: property.amenities.map((amenity) => amenity.amenity.name),
    };

    return { success: true, data };
  }

  async createUploadUrl(payload: PublicUploadDto) {
    if (!this.s3Client) {
      throw new BadRequestException('R2 storage is not configured');
    }

    const bucket = process.env.R2_BUCKET;
    const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
    if (!bucket || !publicBaseUrl) {
      throw new BadRequestException('R2 bucket configuration is missing');
    }

    const property = await this.prisma.property.findUnique({
      where: { id: payload.propertyId },
      select: { id: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const safeFilename = this.sanitizeFilename(payload.filename);
    const key = `properties/${payload.propertyId}/${Date.now()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: payload.contentType,
    });

    const expiresIn = Number(process.env.R2_UPLOAD_URL_TTL_SECONDS ?? 900);
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    const publicUrl = `${publicBaseUrl.replace(/\/$/, '')}/${key}`;

    const image = await this.prisma.propertyImage.create({
      data: {
        propertyId: payload.propertyId,
        url: publicUrl,
        alt: payload.alt,
        sortOrder: payload.sortOrder ?? 0,
        isCover: payload.isCover ?? false,
      },
    });

    return {
      success: true,
      data: {
        uploadUrl,
        publicUrl,
        imageId: image.id,
      },
    };
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

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyStatus, ReviewStatus } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { containsProfanity } from './profanity';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitReview(propertyId: string, dto: CreateReviewDto) {
    // Honeypot: a real user never sees or fills this field. If it's set, treat
    // the submission as a bot and reject with a generic message.
    if (dto.website && dto.website.trim().length > 0) {
      throw new BadRequestException('Unable to submit review.');
    }

    if (containsProfanity(dto.reviewerName, dto.comment)) {
      throw new BadRequestException(
        'Your review contains language that isn’t allowed. Please revise and try again.',
      );
    }

    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, status: PropertyStatus.ACTIVE },
      select: { id: true },
    });
    if (!property) throw new NotFoundException('Property not found');

    const review = await this.prisma.review.create({
      data: {
        propertyId,
        reviewerName: dto.reviewerName,
        overallRating: dto.overallRating,
        comment: dto.comment ?? null,
        cleanlinessRating: dto.cleanlinessRating ?? null,
        locationRating: dto.locationRating ?? null,
        valueRating: dto.valueRating ?? null,
        communicationRating: dto.communicationRating ?? null,
      },
    });

    return { success: true, data: review };
  }

  async getPublicReviews(propertyId: string) {
    // Reviews display immediately. The admin can hide a review by rejecting it,
    // so we surface everything that hasn't been explicitly rejected.
    const reviews = await this.prisma.review.findMany({
      where: { propertyId, status: { not: ReviewStatus.REJECTED } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: reviews };
  }

  async findAll(query: ReviewQueryDto) {
    const where = query.status ? { status: query.status } : {};
    const reviews = await this.prisma.review.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: reviews };
  }

  async updateStatus(id: string, dto: UpdateReviewStatusDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id },
      data: { status: dto.status },
    });
    return { success: true, data: updated };
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.delete({ where: { id } });
    return { success: true };
  }
}

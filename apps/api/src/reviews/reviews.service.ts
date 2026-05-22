import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyStatus, ReviewStatus } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { ReviewQueryDto } from './dto/review-query.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitReview(propertyId: string, dto: CreateReviewDto) {
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

  async getApprovedReviews(propertyId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { propertyId, status: ReviewStatus.APPROVED },
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

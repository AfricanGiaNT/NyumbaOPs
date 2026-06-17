import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PublicService } from './public.service';
import { PublicPropertiesQueryDto } from './dto/public-properties-query.dto';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';

@ApiTags('Public')
@Controller('v1/public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Get('properties')
  findAll(@Query() query: PublicPropertiesQueryDto) {
    return this.publicService.getPublicProperties(query);
  }

  @Get('properties/:id/blocked-dates')
  getBlockedDates(@Param('id') id: string) {
    return this.publicService.getBlockedDates(id);
  }

  @Get('properties/:id/availability')
  checkAvailability(
    @Param('id') id: string,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
  ) {
    return this.publicService.checkAvailability(id, checkInDate, checkOutDate);
  }

  @Get('properties/:id')
  findOne(@Param('id') id: string) {
    return this.publicService.getPublicProperty(id);
  }

  @Get('ical/:filename')
  async getICalFeed(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const propertyId = filename.replace(/\.ics$/i, '');
    const ical = await this.publicService.getICalFeed(propertyId);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${propertyId}.ics"`);
    res.send(ical);
  }

  @Post('properties/:id/reviews')
  @HttpCode(201)
  // Per-IP rate limit: max 3 review submissions per 10 minutes.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  submitReview(@Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.submitReview(id, dto);
  }

  @Get('properties/:id/reviews')
  getPublicReviews(@Param('id') id: string) {
    return this.reviewsService.getPublicReviews(id);
  }

  @Post('uploads')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadImage(
    @UploadedFile() file: any,
    @Body('propertyId') propertyId: string,
    @Body('alt') alt?: string,
    @Body('isCover') isCover?: string,
    @Body('sortOrder') sortOrder?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!propertyId) throw new BadRequestException('propertyId is required');
    return this.publicService.uploadImage(
      file,
      propertyId,
      alt,
      isCover === 'true',
      sortOrder != null ? Number(sortOrder) : undefined,
    );
  }
}

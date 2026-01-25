import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(@Query('month') month?: string) {
    return this.analyticsService.getSummary(month);
  }

  @Get('property/:id/summary')
  getPropertySummary(@Param('id') id: string, @Query('month') month?: string) {
    return this.analyticsService.getPropertySummary(id, month);
  }
}


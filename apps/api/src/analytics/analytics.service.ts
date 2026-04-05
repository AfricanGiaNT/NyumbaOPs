import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateCurrencySummary } from './analytics.utils';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(month?: string, year?: string, from?: string, to?: string) {
    const dateRange = this.getDateRange(month, year, from, to);
    const transactions = await this.prisma.transaction.findMany({
      where: dateRange ? { date: dateRange } : undefined,
    });

    return {
      month: month ?? null,
      totals: calculateCurrencySummary(transactions),
    };
  }

  async getPropertySummary(propertyId: string, month?: string) {
    const dateRange = this.getDateRange(month);
    const transactions = await this.prisma.transaction.findMany({
      where: {
        propertyId,
        ...(dateRange ? { date: dateRange } : {}),
      },
    });

    return {
      propertyId,
      month: month ?? null,
      totals: calculateCurrencySummary(transactions),
    };
  }

  private getDateRange(month?: string, year?: string, from?: string, to?: string) {
    if (from || to) {
      const gte = from ? new Date(from) : undefined;
      const lte = to ? new Date(to + 'T23:59:59.999Z') : undefined;
      return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
    }

    if (month) {
      const [yearPart, monthPart] = month.split('-').map((value) => Number(value));
      if (!yearPart || !monthPart || monthPart < 1 || monthPart > 12) {
        throw new BadRequestException('Invalid month format. Use YYYY-MM');
      }
      const start = new Date(Date.UTC(yearPart, monthPart - 1, 1));
      const end = new Date(Date.UTC(yearPart, monthPart, 1));
      return { gte: start, lt: end };
    }

    if (year) {
      const yearPart = Number(year);
      if (!yearPart) {
        throw new BadRequestException('Invalid year format. Use YYYY');
      }
      const start = new Date(Date.UTC(yearPart, 0, 1));
      const end = new Date(Date.UTC(yearPart + 1, 0, 1));
      return { gte: start, lt: end };
    }

    return undefined;
  }
}


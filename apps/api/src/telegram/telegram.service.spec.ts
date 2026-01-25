import { Currency, TransactionType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from '../analytics/analytics.service';
import { CategoriesService } from '../categories/categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  const createService = () =>
    new TelegramService(
      {} as ConfigService,
      {} as PrismaService,
      {} as AnalyticsService,
      {} as CategoriesService,
      {} as PropertiesService,
      {} as TransactionsService,
    );

  it('summarizes transactions by currency', () => {
    const service = createService();
    const summary = (service as any).analyticsSummaryFromTransactions([
      { currency: Currency.MWK, type: TransactionType.REVENUE, amount: 1000 },
      { currency: Currency.MWK, type: TransactionType.EXPENSE, amount: 250 },
      { currency: Currency.GBP, type: TransactionType.REVENUE, amount: 500 },
    ]);

    expect(summary).toEqual(
      expect.arrayContaining([
        { currency: Currency.MWK, revenue: 1000, expense: 250, profit: 750 },
        { currency: Currency.GBP, revenue: 500, expense: 0, profit: 500 },
      ]),
    );
  });

  it('rate limits after exceeding the threshold', () => {
    const service = createService();
    const userId = 'user-1';

    for (let i = 0; i < 30; i += 1) {
      expect((service as any).isRateLimited(userId)).toBe(false);
    }
    expect((service as any).isRateLimited(userId)).toBe(true);
  });
});

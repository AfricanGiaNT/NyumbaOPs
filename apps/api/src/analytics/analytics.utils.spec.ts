import { Currency, TransactionType } from '@prisma/client';
import { calculateCurrencySummary } from './analytics.utils';

describe('calculateCurrencySummary', () => {
  it('aggregates revenue and expense per currency', () => {
    const result = calculateCurrencySummary([
      { currency: Currency.MWK, type: TransactionType.REVENUE, amount: 1000 },
      { currency: Currency.MWK, type: TransactionType.EXPENSE, amount: 200 },
      { currency: Currency.USD, type: TransactionType.REVENUE, amount: 150 },
    ]);

    expect(result).toEqual([
      { currency: Currency.MWK, revenue: 1000, expense: 200, profit: 800 },
      { currency: Currency.USD, revenue: 150, expense: 0, profit: 150 },
    ]);
  });
});


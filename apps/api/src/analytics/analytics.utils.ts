import { Currency, TransactionType } from '@prisma/client';

export type CurrencySummary = {
  currency: Currency;
  revenue: number;
  expense: number;
  profit: number;
};

export function calculateCurrencySummary(
  transactions: { currency: Currency; type: TransactionType; amount: number }[],
): CurrencySummary[] {
  const map = new Map<Currency, { revenue: number; expense: number }>();

  transactions.forEach((transaction) => {
    const entry = map.get(transaction.currency) ?? { revenue: 0, expense: 0 };
    if (transaction.type === TransactionType.REVENUE) {
      entry.revenue += transaction.amount;
    } else {
      entry.expense += transaction.amount;
    }
    map.set(transaction.currency, entry);
  });

  return Array.from(map.entries()).map(([currency, values]) => ({
    currency,
    revenue: values.revenue,
    expense: values.expense,
    profit: values.revenue - values.expense,
  }));
}


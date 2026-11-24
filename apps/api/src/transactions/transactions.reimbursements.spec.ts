import { BadRequestException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from './transactions.service';

const paidAt = '2026-10-01T00:00:00.000Z';

function setup(previousPayments: number[] = []) {
  const createdPayments: Array<{ transactionId: string; amount: number }> = [];
  const auditTypes: string[] = [];
  const readQueries: unknown[] = [];
  const expense = {
    id: 'expense-1',
    type: 'EXPENSE',
    requiresReimbursement: true,
    paidBy: 'Trevor',
    reimbursedAt: null,
    amount: 1_600_000,
    currency: 'MWK',
    reimbursementPayments: previousPayments.map((amount) => ({ amount })),
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: expense.id }]),
    transaction: {
      findUnique: jest.fn().mockResolvedValue(expense),
      update: jest
        .fn()
        .mockResolvedValue({ ...expense, reimbursedAt: new Date(paidAt) }),
    },
    reimbursementPayment: {
      create: jest.fn().mockImplementation(
        ({
          data,
        }: {
          data: {
            transactionId: string;
            amount: number;
            paidAt: Date;
            notes?: string;
            createdBy: string;
          };
        }) => {
          createdPayments.push(data);
          return Promise.resolve({ id: 'payment-1', ...data });
        },
      ),
    },
  };
  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    transaction: {
      findMany: jest.fn().mockImplementation((query: unknown) => {
        readQueries.push(query);
        return Promise.resolve([]);
      }),
    },
  };
  const audit = {
    logAction: jest
      .fn()
      .mockImplementation((action: { resourceType: string }) => {
        auditTypes.push(action.resourceType);
        return Promise.resolve(undefined);
      }),
  };
  const service = new TransactionsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
  );
  return { service, prisma, tx, createdPayments, auditTypes, readQueries };
}

describe('partial reimbursements', () => {
  it('leaves 1,100,000 outstanding after a 500,000 payment on 1,600,000', async () => {
    const { service, tx, createdPayments, auditTypes } = setup();
    const result = await service.recordReimbursementPayment(
      'expense-1',
      { amount: 500_000, paidAt },
      'user-1',
    );

    expect(result.reimbursedAmount).toBe(500_000);
    expect(result.remainingAmount).toBe(1_100_000);
    expect(createdPayments[0].transactionId).toBe('expense-1');
    expect(createdPayments[0].amount).toBe(500_000);
    expect(tx.transaction.update).not.toHaveBeenCalled();
    expect(auditTypes[0]).toBe('ReimbursementPayment');
  });

  it('marks the expense complete only when the remaining balance is paid', async () => {
    const { service, tx } = setup([500_000]);
    const result = await service.recordReimbursementPayment(
      'expense-1',
      { amount: 1_100_000, paidAt },
      'user-1',
    );

    expect(result.remainingAmount).toBe(0);
    expect(tx.transaction.update).toHaveBeenCalledWith({
      where: { id: 'expense-1' },
      data: { reimbursedAt: new Date(paidAt) },
    });
  });

  it('rejects an overpayment without creating a payment record', async () => {
    const { service, tx } = setup([500_000]);
    await expect(
      service.recordReimbursementPayment(
        'expense-1',
        { amount: 1_100_001, paidAt },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.reimbursementPayment.create).not.toHaveBeenCalled();
  });

  it('calculates outstanding balances from payment history across all months', async () => {
    const { service, prisma, readQueries } = setup();
    prisma.transaction.findMany.mockImplementation((query: unknown) => {
      readQueries.push(query);
      return Promise.resolve([
        {
          id: 'expense-1',
          amount: 1_600_000,
          reimbursementPayments: [{ id: 'payment-1', amount: 500_000 }],
        },
      ]);
    });
    const result = await service.findOutstandingReimbursements();

    expect(result[0].reimbursedAmount).toBe(500_000);
    expect(result[0].remainingAmount).toBe(1_100_000);
    const query = readQueries[0] as {
      where: { reimbursedAt: null };
    };
    expect(query.where.reimbursedAt).toBeNull();
  });
});

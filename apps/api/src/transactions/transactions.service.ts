import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateReimbursementPaymentDto } from './dto/create-reimbursement-payment.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getOrCreateDefaultCategory(
    type: TransactionType,
    userId: string,
  ) {
    const name = type === 'REVENUE' ? 'Rental Income' : 'General Expense';
    const existing = await this.prisma.category.findFirst({
      where: { name, type },
    });
    if (existing) return existing;
    return this.prisma.category.create({
      data: { name, type, isSystem: true, createdBy: userId },
    });
  }

  /**
   * Internal version of create() that skips the property status check.
   * Used by WorksService and InventoryService to auto-create expense transactions
   * even when a property has status MAINTENANCE.
   */
  async createInternal(
    type: TransactionType,
    dto: CreateTransactionDto,
    userId: string,
    metadata?: { createdVia?: string },
  ) {
    let categoryId = dto.categoryId;

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      if (category.type !== type) {
        throw new BadRequestException(
          'Category type does not match transaction type',
        );
      }
    } else {
      const defaultCategory = await this.getOrCreateDefaultCategory(
        type,
        userId,
      );
      categoryId = defaultCategory.id;
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        propertyId: dto.propertyId,
        bookingId: dto.bookingId,
        type,
        categoryId,
        name: dto.name,
        amount: dto.amount,
        currency: dto.currency,
        date: new Date(dto.date),
        notes: dto.notes,
        paidBy: dto.paidBy,
        requiresReimbursement: dto.requiresReimbursement ?? false,
        createdVia: metadata?.createdVia ?? 'DASHBOARD',
        createdBy: userId,
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'Transaction',
      resourceId: transaction.id,
      userId,
      details: {
        type,
        amount: transaction.amount,
        currency: transaction.currency,
      },
    });

    return transaction;
  }

  async create(
    type: TransactionType,
    dto: CreateTransactionDto,
    userId: string,
    metadata?: { createdVia?: string; telegramMessageId?: number },
  ) {
    let categoryId = dto.categoryId;

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      if (category.type !== type) {
        throw new BadRequestException(
          'Category type does not match transaction type',
        );
      }
    } else {
      const defaultCategory = await this.getOrCreateDefaultCategory(
        type,
        userId,
      );
      categoryId = defaultCategory.id;
    }

    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException('Property not found');
      }
      if (property.status !== 'ACTIVE') {
        throw new BadRequestException('Property is not active');
      }
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        propertyId: dto.propertyId,
        bookingId: dto.bookingId,
        type,
        categoryId,
        name: dto.name,
        amount: dto.amount,
        currency: dto.currency,
        date: new Date(dto.date),
        notes: dto.notes,
        paidBy: dto.paidBy,
        requiresReimbursement: dto.requiresReimbursement ?? false,
        createdVia: metadata?.createdVia ?? 'DASHBOARD',
        telegramMessageId: metadata?.telegramMessageId
          ? BigInt(metadata.telegramMessageId)
          : undefined,
        createdBy: userId,
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'Transaction',
      resourceId: transaction.id,
      userId,
      details: {
        type,
        amount: transaction.amount,
        currency: transaction.currency,
      },
    });

    return transaction;
  }

  findAll(query: TransactionQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.propertyId) {
      where.propertyId = query.propertyId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const dateRange = this.getDateRange(
      query.month,
      query.year,
      query.from,
      query.to,
    );
    if (dateRange) {
      where.date = dateRange;
    }

    return this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        category: { select: { id: true, name: true, type: true } },
        property: { select: { id: true, name: true } },
      },
    });
  }

  async findOutstandingReimbursements() {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        type: TransactionType.EXPENSE,
        requiresReimbursement: true,
        reimbursedAt: null,
        paidBy: { not: null },
      },
      orderBy: { date: 'desc' },
      include: {
        category: { select: { id: true, name: true, type: true } },
        property: { select: { id: true, name: true } },
        reimbursementPayments: {
          orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            amount: true,
            paidAt: true,
            notes: true,
            createdAt: true,
          },
        },
      },
    });

    return transactions
      .map((transaction) => {
        const reimbursedAmount = transaction.reimbursementPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );
        return {
          ...transaction,
          reimbursedAmount,
          remainingAmount: Math.max(0, transaction.amount - reimbursedAmount),
        };
      })
      .filter((transaction) => transaction.remainingAmount > 0);
  }

  async recordReimbursementPayment(
    id: string,
    dto: CreateReimbursementPaymentDto,
    userId: string,
  ) {
    return this.recordReimbursement(
      id,
      dto.amount,
      new Date(dto.paidAt),
      dto.notes,
      userId,
    );
  }

  async markReimbursed(id: string, userId: string) {
    return this.recordReimbursement(id, null, new Date(), undefined, userId);
  }

  private async recordReimbursement(
    id: string,
    requestedAmount: number | null,
    paidAt: Date,
    notes: string | undefined,
    userId: string,
  ) {
    if (Number.isNaN(paidAt.getTime()))
      throw new BadRequestException('Invalid payment date');

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Lock the expense while checking its balance so concurrent payments cannot overpay it.
        const locked = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT "id" FROM "Transaction" WHERE "id" = ${id} FOR UPDATE`;
        if (locked.length === 0)
          throw new NotFoundException('Expense not found');

        const transaction = await tx.transaction.findUnique({
          where: { id },
          include: { reimbursementPayments: { select: { amount: true } } },
        });
        if (
          !transaction ||
          transaction.type !== TransactionType.EXPENSE ||
          !transaction.requiresReimbursement ||
          !transaction.paidBy
        ) {
          throw new BadRequestException(
            'This expense is not awaiting reimbursement',
          );
        }
        if (transaction.reimbursedAt)
          throw new BadRequestException(
            'This expense is already fully reimbursed',
          );

        const reimbursedAmount = transaction.reimbursementPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        );
        const remainingAmount = transaction.amount - reimbursedAmount;
        const amount = requestedAmount ?? remainingAmount;
        if (
          !Number.isInteger(amount) ||
          amount < 1 ||
          amount > remainingAmount
        ) {
          throw new BadRequestException(
            `Payment must be between 1 and ${remainingAmount} ${transaction.currency}`,
          );
        }

        const payment = await tx.reimbursementPayment.create({
          data: { transactionId: id, amount, paidAt, notes, createdBy: userId },
        });
        if (amount === remainingAmount) {
          await tx.transaction.update({
            where: { id },
            data: { reimbursedAt: paidAt },
          });
        }
        return {
          payment,
          reimbursedAmount: reimbursedAmount + amount,
          remainingAmount: remainingAmount - amount,
          currency: transaction.currency,
        };
      },
      { timeout: 5000 },
    );

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'ReimbursementPayment',
      resourceId: result.payment.id,
      userId,
      details: {
        transactionId: id,
        amount: result.payment.amount,
        currency: result.currency,
        remainingAmount: result.remainingAmount,
      },
    });

    return result;
  }

  async remove(id: string, userId: string) {
    if (
      await this.prisma.reimbursementPayment.count({
        where: { transactionId: id },
      })
    ) {
      throw new BadRequestException(
        'This expense has reimbursement payments and cannot be deleted',
      );
    }
    const transaction = await this.prisma.transaction.delete({
      where: { id },
    });

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'Transaction',
      resourceId: transaction.id,
      userId,
      details: { type: transaction.type, amount: transaction.amount },
    });

    return transaction;
  }

  findLatestByUser(userId: string) {
    return this.prisma.transaction.findFirst({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        property: true,
      },
    });
  }

  private getDateRange(
    month?: string,
    year?: string,
    from?: string,
    to?: string,
  ) {
    if (from || to) {
      const gte = from ? new Date(from) : undefined;
      const lte = to ? new Date(to + 'T23:59:59.999Z') : undefined;
      return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
    }

    if (month) {
      const [yearPart, monthPart] = month
        .split('-')
        .map((value) => Number(value));
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

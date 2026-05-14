import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async getOrCreateDefaultCategory(type: TransactionType, userId: string) {
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
        throw new BadRequestException('Category type does not match transaction type');
      }
    } else {
      const defaultCategory = await this.getOrCreateDefaultCategory(type, userId);
      categoryId = defaultCategory.id;
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        propertyId: dto.propertyId,
        bookingId: dto.bookingId,
        type,
        categoryId,
        amount: dto.amount,
        currency: dto.currency,
        date: new Date(dto.date),
        notes: dto.notes,
        createdVia: metadata?.createdVia ?? 'DASHBOARD',
        createdBy: userId,
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'Transaction',
      resourceId: transaction.id,
      userId,
      details: { type, amount: transaction.amount, currency: transaction.currency },
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
        throw new BadRequestException('Category type does not match transaction type');
      }
    } else {
      const defaultCategory = await this.getOrCreateDefaultCategory(type, userId);
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
        amount: dto.amount,
        currency: dto.currency,
        date: new Date(dto.date),
        notes: dto.notes,
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
      details: { type, amount: transaction.amount, currency: transaction.currency },
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

    const dateRange = this.getDateRange(query.month, query.year, query.from, query.to);
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

  async remove(id: string, userId: string) {
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


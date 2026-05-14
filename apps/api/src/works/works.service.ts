import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType, Currency, TransactionType, WorkStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateWorkDto } from './dto/create-work.dto';
import { UpdateWorkDto } from './dto/update-work.dto';
import { WorkQueryDto } from './dto/work-query.dto';

@Injectable()
export class WorksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly transactionsService: TransactionsService,
    private readonly emailService: EmailService,
  ) {}

  private async getOrCreateMaintenanceCategory(userId: string) {
    const name = 'Maintenance';
    const existing = await this.prisma.category.findFirst({
      where: { name, type: CategoryType.EXPENSE },
    });
    if (existing) return existing;
    return this.prisma.category.create({
      data: { name, type: CategoryType.EXPENSE, isSystem: true, createdBy: userId },
    });
  }

  async create(dto: CreateWorkDto, userId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const work = await this.prisma.work.create({
      data: {
        propertyId: dto.propertyId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        category: dto.category,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        estimatedCost: dto.estimatedCost,
        currency: dto.currency ?? property.currency ?? Currency.MWK,
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        property: { select: { id: true, name: true, location: true } },
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'Work',
      resourceId: work.id,
      userId,
      details: { title: work.title, propertyId: work.propertyId, status: work.status },
    });

    return work;
  }

  async findAll(query: WorkQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.category) where.category = query.category;

    return this.prisma.work.findMany({
      where,
      orderBy: [{ status: 'asc' }, { scheduledDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        property: { select: { id: true, name: true, location: true } },
        transaction: { select: { id: true, amount: true, currency: true } },
      },
    });
  }

  async findOne(id: string) {
    const work = await this.prisma.work.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, name: true, location: true } },
        transaction: { select: { id: true, amount: true, currency: true } },
      },
    });
    if (!work) throw new NotFoundException('Work not found');
    return work;
  }

  async sendToAnyDo(id: string) {
    const work = await this.prisma.work.findUnique({
      where: { id },
      include: { property: { select: { name: true, location: true } } },
    });
    if (!work) throw new NotFoundException('Work not found');

    await this.emailService.sendWorkOrderToAnyDo(work);

    return this.prisma.work.update({
      where: { id },
      data: { sentToAnyDo: true, sentToAnyDoAt: new Date() },
      include: {
        property: { select: { id: true, name: true, location: true } },
        transaction: { select: { id: true, amount: true, currency: true } },
      },
    });
  }

  async update(id: string, dto: UpdateWorkDto, userId: string) {
    const existing = await this.prisma.work.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Work not found');

    const costForExpense = dto.actualCost ?? existing.actualCost ?? 0;
    const shouldCreateExpense =
      dto.status === WorkStatus.COMPLETED &&
      existing.status !== WorkStatus.COMPLETED &&
      existing.transactionId === null &&
      costForExpense > 0;

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.scheduledDate !== undefined)
      updateData.scheduledDate = dto.scheduledDate ? new Date(dto.scheduledDate) : null;
    if (dto.completedDate !== undefined)
      updateData.completedDate = dto.completedDate ? new Date(dto.completedDate) : null;
    if (dto.estimatedCost !== undefined) updateData.estimatedCost = dto.estimatedCost;
    if (dto.actualCost !== undefined) updateData.actualCost = dto.actualCost;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // Auto-set completedDate if not provided when completing
    if (dto.status === WorkStatus.COMPLETED && !dto.completedDate && !existing.completedDate) {
      updateData.completedDate = new Date();
    }

    if (shouldCreateExpense) {
      const currency = dto.currency ?? existing.currency;
      const category = await this.getOrCreateMaintenanceCategory(userId);
      const transaction = await this.transactionsService.createInternal(
        TransactionType.EXPENSE,
        {
          amount: costForExpense,
          currency,
          date: new Date().toISOString(),
          propertyId: existing.propertyId,
          categoryId: category.id,
          notes: `Auto: Work completed — ${existing.title} (${existing.id})`,
        },
        userId,
        { createdVia: 'WORKS' },
      );
      updateData.transactionId = transaction.id;
    }

    const work = await this.prisma.work.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { id: true, name: true, location: true } },
        transaction: { select: { id: true, amount: true, currency: true } },
      },
    });

    await this.audit.logAction({
      action: 'UPDATE',
      resourceType: 'Work',
      resourceId: work.id,
      userId,
      details: { status: work.status, autoExpenseCreated: shouldCreateExpense },
    });

    // Auto-send to Any.do when work transitions PENDING → IN_PROGRESS
    if (
      dto.status === WorkStatus.IN_PROGRESS &&
      existing.status === WorkStatus.PENDING
    ) {
      this.emailService.sendWorkOrderToAnyDo(work).catch(() => {
        // Non-fatal — don't fail the update if email fails
      });
      await this.prisma.work.update({
        where: { id },
        data: { sentToAnyDo: true, sentToAnyDoAt: new Date() },
      });
      return { ...work, sentToAnyDo: true, sentToAnyDoAt: new Date() };
    }

    return work;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.work.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Work not found');

    if (
      existing.status !== WorkStatus.PENDING &&
      existing.status !== WorkStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Only PENDING or CANCELLED works can be deleted',
      );
    }

    await this.prisma.work.delete({ where: { id } });

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'Work',
      resourceId: id,
      userId,
      details: { title: existing.title },
    });

    return { deleted: true };
  }
}

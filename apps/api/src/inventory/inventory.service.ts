import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryType, Currency, StockMovementType, TransactionType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly transactionsService: TransactionsService,
  ) {}

  private async getOrCreateInventoryCategory(userId: string) {
    const name = 'Inventory/Materials';
    const existing = await this.prisma.category.findFirst({
      where: { name, type: CategoryType.EXPENSE },
    });
    if (existing) return existing;
    return this.prisma.category.create({
      data: { name, type: CategoryType.EXPENSE, isSystem: true, createdBy: userId },
    });
  }

  async create(dto: CreateInventoryItemDto, userId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property) throw new NotFoundException('Property not found');

    const item = await this.prisma.inventoryItem.create({
      data: {
        propertyId: dto.propertyId,
        name: dto.name,
        category: dto.category,
        unit: dto.unit ?? 'unit',
        quantity: dto.quantity ?? 0,
        minQuantity: dto.minQuantity ?? 0,
        unitCost: dto.unitCost,
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
      resourceType: 'InventoryItem',
      resourceId: item.id,
      userId,
      details: { name: item.name, propertyId: item.propertyId },
    });

    return item;
  }

  async findAll(query: InventoryQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.propertyId) where.propertyId = query.propertyId;
    if (query.category) where.category = query.category;

    let items = await this.prisma.inventoryItem.findMany({
      where,
      orderBy: [{ propertyId: 'asc' }, { name: 'asc' }],
      include: {
        property: { select: { id: true, name: true, location: true } },
      },
    });

    if (query.lowStock) {
      items = items.filter(
        (item) => item.minQuantity > 0 && item.quantity < item.minQuantity,
      );
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        property: { select: { id: true, name: true, location: true } },
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            transaction: { select: { id: true, amount: true, currency: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Inventory item not found');
    return item;
  }

  async update(id: string, dto: UpdateInventoryItemDto, userId: string) {
    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Inventory item not found');

    const item = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        unit: dto.unit,
        minQuantity: dto.minQuantity,
        unitCost: dto.unitCost,
        currency: dto.currency,
        notes: dto.notes,
      },
      include: {
        property: { select: { id: true, name: true, location: true } },
      },
    });

    await this.audit.logAction({
      action: 'UPDATE',
      resourceType: 'InventoryItem',
      resourceId: item.id,
      userId,
      details: { name: item.name },
    });

    return item;
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Inventory item not found');

    await this.prisma.inventoryItem.delete({ where: { id } });

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'InventoryItem',
      resourceId: id,
      userId,
      details: { name: existing.name },
    });

    return { deleted: true };
  }

  async recordMovement(itemId: string, dto: CreateStockMovementDto, userId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { property: true },
    });
    if (!item) throw new NotFoundException('Inventory item not found');

    if (dto.type === StockMovementType.OUT && item.quantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock: ${item.quantity} ${item.unit} available, ${dto.quantity} requested`,
      );
    }

    const quantityDelta =
      dto.type === StockMovementType.IN ? dto.quantity : -dto.quantity;

    // Atomically create movement and update quantity
    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          inventoryItemId: itemId,
          workId: dto.workId,
          type: dto.type,
          quantity: dto.quantity,
          unitCost: dto.unitCost,
          currency: dto.currency ?? item.currency,
          notes: dto.notes,
          createdBy: userId,
        },
      }),
      this.prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: { increment: quantityDelta } },
      }),
    ]);

    // Auto-create expense for IN movements with cost
    if (
      dto.type === StockMovementType.IN &&
      dto.unitCost !== undefined &&
      dto.unitCost > 0
    ) {
      const totalCost = dto.quantity * dto.unitCost;
      const currency = dto.currency ?? item.currency;
      const category = await this.getOrCreateInventoryCategory(userId);

      const transaction = await this.transactionsService.createInternal(
        TransactionType.EXPENSE,
        {
          amount: totalCost,
          currency,
          date: new Date().toISOString(),
          propertyId: item.propertyId,
          categoryId: category.id,
          notes: `Auto: Inventory IN — ${item.name} ×${dto.quantity} @ ${dto.unitCost} (${movement.id})`,
        },
        userId,
        { createdVia: 'INVENTORY' },
      );

      await this.prisma.stockMovement.update({
        where: { id: movement.id },
        data: { transactionId: transaction.id },
      });

      // Also update item's last known unit cost
      await this.prisma.inventoryItem.update({
        where: { id: itemId },
        data: { unitCost: dto.unitCost, currency },
      });
    }

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'StockMovement',
      resourceId: movement.id,
      userId,
      details: { type: dto.type, quantity: dto.quantity, itemId },
    });

    return this.findOne(itemId);
  }

  async getMovements(itemId: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Inventory item not found');

    return this.prisma.stockMovement.findMany({
      where: { inventoryItemId: itemId },
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: { select: { id: true, amount: true, currency: true } },
      },
    });
  }
}

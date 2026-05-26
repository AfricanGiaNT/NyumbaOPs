import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilityBillDto } from './dto/create-utility-bill.dto';
import { QueryUtilityBillsDto } from './dto/query-utility-bills.dto';
import { UtilityType } from '@prisma/client';

type AnomalyResult = {
  propertyId: string;
  type: UtilityType;
  lastMonthAmount: number;
  avgAmount: number;
  isAnomaly: boolean;
  percentAboveAvg: number;
};

@Injectable()
export class UtilityBillsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUtilityBillDto, userId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      select: { id: true, currency: true },
    });
    if (!property) throw new NotFoundException('Property not found');

    return this.prisma.utilityBill.create({
      data: {
        propertyId: dto.propertyId,
        type: dto.type,
        amount: dto.amount,
        currency: dto.currency ?? property.currency,
        billingDate: new Date(dto.billingDate),
        notes: dto.notes,
        createdBy: userId,
      },
      include: { property: { select: { id: true, name: true } } },
    });
  }

  async findAll(query: QueryUtilityBillsDto) {
    return this.prisma.utilityBill.findMany({
      where: {
        ...(query.propertyId && { propertyId: query.propertyId }),
        ...(query.type && { type: query.type }),
      },
      include: { property: { select: { id: true, name: true } } },
      orderBy: { billingDate: 'desc' },
    });
  }

  async remove(id: string, userId: string) {
    const bill = await this.prisma.utilityBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException('Utility bill not found');
    if (bill.createdBy !== userId) throw new ForbiddenException('Not authorised');
    await this.prisma.utilityBill.delete({ where: { id } });
    return { success: true };
  }

  async getAnomalies(propertyId?: string): Promise<AnomalyResult[]> {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 4, 1);

    const bills = await this.prisma.utilityBill.findMany({
      where: {
        ...(propertyId && { propertyId }),
        billingDate: { gte: fourMonthsAgo },
      },
      select: { propertyId: true, type: true, amount: true, billingDate: true },
    });

    // Group by (propertyId, type, month)
    const monthlyTotals: Record<string, Record<string, number>> = {};
    for (const bill of bills) {
      const monthKey = `${bill.propertyId}::${bill.type}`;
      const month = `${bill.billingDate.getFullYear()}-${bill.billingDate.getMonth()}`;
      if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = {};
      monthlyTotals[monthKey][month] = (monthlyTotals[monthKey][month] ?? 0) + bill.amount;
    }

    const lastMonthKey = `${lastMonthStart.getFullYear()}-${lastMonthStart.getMonth()}`;
    const results: AnomalyResult[] = [];

    for (const [key, months] of Object.entries(monthlyTotals)) {
      const lastMonthAmount = months[lastMonthKey] ?? 0;
      if (lastMonthAmount === 0) continue;

      // Average of the 3 months before last month
      const historicMonths = Object.entries(months)
        .filter(([m]) => m !== lastMonthKey)
        .map(([, v]) => v);

      if (historicMonths.length === 0) continue;

      const avgAmount = historicMonths.reduce((a, b) => a + b, 0) / historicMonths.length;
      if (avgAmount === 0) continue;

      const [pid, type] = key.split('::');
      const percentAboveAvg = Math.round(((lastMonthAmount - avgAmount) / avgAmount) * 100);
      const isAnomaly = lastMonthAmount > avgAmount * 1.5;

      results.push({
        propertyId: pid,
        type: type as UtilityType,
        lastMonthAmount,
        avgAmount: Math.round(avgAmount),
        isAnomaly,
        percentAboveAvg,
      });
    }

    return results.filter((r) => r.isAnomaly);
  }
}

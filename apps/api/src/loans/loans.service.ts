import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LoanStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
import { LoanQueryDto } from './dto/loan-query.dto';

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateLoanDto, userId: string) {
    const loan = await this.prisma.loan.create({
      data: {
        lenderName: dto.lenderName,
        amount: dto.amount,
        dateTaken: new Date(dto.dateTaken),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        repayments: true,
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'Loan',
      resourceId: loan.id,
      userId,
      details: { lenderName: loan.lenderName, amount: loan.amount },
    });

    return loan;
  }

  findAll(query: LoanQueryDto) {
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.loan.findMany({
      where,
      include: {
        repayments: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { dateTaken: 'desc' },
    });
  }

  async findOne(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        repayments: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    return loan;
  }

  async createRepayment(loanId: string, dto: CreateRepaymentDto, userId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const remainingBalance = loan.amount - loan.amountRepaid;
    if (dto.amount > remainingBalance) {
      throw new BadRequestException(
        `Repayment amount (${dto.amount}) exceeds remaining balance (${remainingBalance})`,
      );
    }

    const newAmountRepaid = loan.amountRepaid + dto.amount;
    const newStatus = newAmountRepaid >= loan.amount ? LoanStatus.SETTLED : loan.status;

    const repayment = await this.prisma.loanRepayment.create({
      data: {
        loanId,
        amount: dto.amount,
        date: new Date(dto.date),
        notes: dto.notes,
        createdBy: userId,
      },
    });

    const updatedLoan = await this.prisma.loan.update({
      where: { id: loanId },
      data: {
        amountRepaid: newAmountRepaid,
        status: newStatus,
      },
      include: {
        repayments: {
          orderBy: { date: 'desc' },
        },
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'LoanRepayment',
      resourceId: repayment.id,
      userId,
      details: { loanId, amount: dto.amount, newStatus },
    });

    return updatedLoan;
  }

  async remove(id: string, userId: string) {
    const loan = await this.prisma.loan.delete({
      where: { id },
    });

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'Loan',
      resourceId: loan.id,
      userId,
      details: { lenderName: loan.lenderName, amount: loan.amount },
    });

    return loan;
  }
}

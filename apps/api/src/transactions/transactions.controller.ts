import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('revenue')
  @UseGuards(JwtAuthGuard)
  createRevenue(
    @Body() dto: CreateTransactionDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.create(TransactionType.REVENUE, dto, userId);
  }

  @Post('expense')
  @UseGuards(JwtAuthGuard)
  createExpense(
    @Body() dto: CreateTransactionDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.create(TransactionType.EXPENSE, dto, userId);
  }

  @Get()
  findAll(@Query() query: TransactionQueryDto) {
    return this.transactionsService.findAll(query);
  }

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  getLatest(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.findLatestByUser(userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.remove(id, userId);
  }
}


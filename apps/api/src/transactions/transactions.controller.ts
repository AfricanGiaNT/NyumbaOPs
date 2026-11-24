import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateReimbursementPaymentDto } from './dto/create-reimbursement-payment.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
@Roles('OWNER')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('revenue')
  @UseGuards(JwtAuthGuard)
  createRevenue(
    @Body() dto: CreateTransactionDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.create(
      TransactionType.REVENUE,
      dto,
      userId,
    );
  }

  @Post('expense')
  @UseGuards(JwtAuthGuard)
  createExpense(
    @Body() dto: CreateTransactionDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.create(
      TransactionType.EXPENSE,
      dto,
      userId,
    );
  }

  @Get()
  findAll(@Query() query: TransactionQueryDto) {
    return this.transactionsService.findAll(query);
  }

  @Get('outstanding-reimbursements')
  @UseGuards(JwtAuthGuard)
  outstandingReimbursements() {
    return this.transactionsService.findOutstandingReimbursements();
  }

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  getLatest(@Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.findLatestByUser(userId);
  }

  @Patch(':id/reimburse')
  @UseGuards(JwtAuthGuard)
  reimburse(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.markReimbursed(id, userId);
  }

  @Post(':id/reimbursements')
  @UseGuards(JwtAuthGuard)
  recordReimbursement(
    @Param('id') id: string,
    @Body() dto: CreateReimbursementPaymentDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.recordReimbursementPayment(id, dto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.transactionsService.remove(id, userId);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateLoanDto } from './dto/create-loan.dto';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
import { LoanQueryDto } from './dto/loan-query.dto';
import { LoansService } from './loans.service';

@ApiTags('Loans')
@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @Roles('OWNER', 'STAFF')
  create(@Body() dto: CreateLoanDto, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.loansService.create(dto, userId);
  }

  @Get()
  @Roles('OWNER', 'STAFF')
  findAll(@Query() query: LoanQueryDto) {
    return this.loansService.findAll(query);
  }

  @Get(':id')
  @Roles('OWNER', 'STAFF')
  findOne(@Param('id') id: string) {
    return this.loansService.findOne(id);
  }

  @Post(':id/repayments')
  @Roles('OWNER', 'STAFF')
  createRepayment(
    @Param('id') id: string,
    @Body() dto: CreateRepaymentDto,
    @Req() req: { user?: { id?: string } },
  ) {
    const userId = req.user?.id ?? 'system';
    return this.loansService.createRepayment(id, dto, userId);
  }

  @Delete(':id')
  @Roles('OWNER', 'STAFF')
  remove(@Param('id') id: string, @Req() req: { user?: { id?: string } }) {
    const userId = req.user?.id ?? 'system';
    return this.loansService.remove(id, userId);
  }
}

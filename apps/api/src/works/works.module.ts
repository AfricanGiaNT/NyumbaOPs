import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WorksController } from './works.controller';
import { WorksScheduler } from './works.scheduler';
import { WorksService } from './works.service';

@Module({
  imports: [AuditModule, TransactionsModule, TelegramModule],
  controllers: [WorksController],
  providers: [WorksService, WorksScheduler],
  exports: [WorksService],
})
export class WorksModule {}

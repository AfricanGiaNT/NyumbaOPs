import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [AuditModule, TransactionsModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

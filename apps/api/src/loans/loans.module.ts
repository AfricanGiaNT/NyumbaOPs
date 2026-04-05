import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}

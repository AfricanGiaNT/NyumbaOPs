import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { BookingsModule } from './bookings/bookings.module';
import { CalendarSyncModule } from './calendar-sync/calendar-sync.module';
import { CategoriesModule } from './categories/categories.module';
import { GuestsModule } from './guests/guests.module';
import { InventoryModule } from './inventory/inventory.module';
import { LoansModule } from './loans/loans.module';
import { PrismaModule } from './prisma/prisma.module';
import { PropertiesModule } from './properties/properties.module';
import { PublicModule } from './public/public.module';
import { TelegramModule } from './telegram/telegram.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WorksModule } from './works/works.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    AuditModule,
    PropertiesModule,
    CategoriesModule,
    TransactionsModule,
    AnalyticsModule,
    GuestsModule,
    BookingsModule,
    CalendarSyncModule,
    LoansModule,
    PublicModule,
    TelegramModule,
    WorksModule,
    InventoryModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditModule } from '../audit/audit.module';
import { CalendarSyncController } from './calendar-sync.controller';
import { CalendarSyncService } from './calendar-sync.service';
import { ICalParserService } from './ical-parser.service';
import { SyncEngineService } from './sync-engine.service';
import { CalendarSyncScheduler } from './calendar-sync.scheduler';

@Module({
  imports: [ScheduleModule.forRoot(), AuditModule],
  controllers: [CalendarSyncController],
  providers: [
    CalendarSyncService,
    ICalParserService,
    SyncEngineService,
    CalendarSyncScheduler,
  ],
  exports: [CalendarSyncService, SyncEngineService],
})
export class CalendarSyncModule {}

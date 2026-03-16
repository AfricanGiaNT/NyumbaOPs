import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SyncEngineService } from './sync-engine.service';

@Injectable()
export class CalendarSyncScheduler {
  private readonly logger = new Logger(CalendarSyncScheduler.name);
  private isSyncing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncEngine: SyncEngineService,
  ) {}

  /**
   * Run calendar sync every 30 minutes
   */
  @Cron('*/30 * * * *', {
    name: 'calendar-sync',
    timeZone: 'Africa/Blantyre', // Malawi timezone
  })
  async handleCalendarSync() {
    if (this.isSyncing) {
      this.logger.warn('Sync already in progress, skipping this run');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting scheduled calendar sync...');

      // Get all enabled calendar syncs
      const calendarSyncs = await this.prisma.calendarSync.findMany({
        where: { isEnabled: true },
        include: { property: true },
      });

      if (calendarSyncs.length === 0) {
        this.logger.log('No enabled calendar syncs found');
        return;
      }

      this.logger.log(`Found ${calendarSyncs.length} calendar syncs to process`);

      // Process syncs in batches of 5 to avoid overwhelming the system
      const batchSize = 5;
      let totalImported = 0;
      let totalFailed = 0;

      for (let i = 0; i < calendarSyncs.length; i += batchSize) {
        const batch = calendarSyncs.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(async (calendarSync) => {
            try {
              this.logger.log(`Syncing: ${calendarSync.property.name}`);
              const result = await this.syncEngine.syncCalendar(calendarSync.id);

              // Log the result
              await this.prisma.calendarSyncLog.create({
                data: {
                  calendarSyncId: calendarSync.id,
                  status: result.success ? 'SUCCESS' : 'FAILED',
                  eventsImported: result.eventsImported,
                  eventsSkipped: result.eventsSkipped,
                  errorMessage: result.error,
                  syncDuration: result.duration,
                },
              });

              return result;
            } catch (error) {
              this.logger.error(
                `Failed to sync ${calendarSync.property.name}`,
                error,
              );
              
              // Log the failure
              await this.prisma.calendarSyncLog.create({
                data: {
                  calendarSyncId: calendarSync.id,
                  status: 'FAILED',
                  eventsImported: 0,
                  eventsSkipped: 0,
                  errorMessage: error.message,
                  syncDuration: 0,
                },
              });

              throw error;
            }
          }),
        );

        // Count successes and failures
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            totalImported += result.value.eventsImported;
          } else {
            totalFailed++;
          }
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Scheduled sync completed: ${totalImported} events imported, ${totalFailed} failed (${duration}ms)`,
      );
    } catch (error) {
      this.logger.error('Scheduled sync failed', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Health check - runs every hour to clean up old sync logs
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'cleanup-sync-logs',
  })
  async cleanupOldLogs() {
    try {
      // Keep only last 100 logs per calendar sync
      const calendarSyncs = await this.prisma.calendarSync.findMany({
        select: { id: true },
      });

      for (const calendarSync of calendarSyncs) {
        const logs = await this.prisma.calendarSyncLog.findMany({
          where: { calendarSyncId: calendarSync.id },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        if (logs.length > 100) {
          const logsToDelete = logs.slice(100);
          await this.prisma.calendarSyncLog.deleteMany({
            where: {
              id: { in: logsToDelete.map((log) => log.id) },
            },
          });

          this.logger.log(
            `Cleaned up ${logsToDelete.length} old logs for calendar sync ${calendarSync.id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old logs', error);
    }
  }
}

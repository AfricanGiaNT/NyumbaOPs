import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICalParserService, ParsedEvent } from './ical-parser.service';
import { BookingStatus } from '@prisma/client';
import fetch from 'node-fetch';

export interface SyncResult {
  success: boolean;
  eventsImported: number;
  eventsSkipped: number;
  conflictsResolved: number;
  error?: string;
  duration: number;
}

@Injectable()
export class SyncEngineService {
  private readonly logger = new Logger(SyncEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly icalParser: ICalParserService,
  ) {}

  /**
   * Sync a property's calendar from iCal feed
   */
  async syncCalendar(calendarSyncId: string): Promise<SyncResult> {
    const startTime = Date.now();
    let eventsImported = 0;
    let eventsSkipped = 0;
    let conflictsResolved = 0;

    try {
      // Get calendar sync configuration
      const calendarSync = await this.prisma.calendarSync.findUnique({
        where: { id: calendarSyncId },
        include: { property: true },
      });

      if (!calendarSync) {
        throw new Error('Calendar sync configuration not found');
      }

      if (!calendarSync.isEnabled) {
        this.logger.log(`Calendar sync ${calendarSyncId} is disabled, skipping`);
        return {
          success: true,
          eventsImported: 0,
          eventsSkipped: 0,
          conflictsResolved: 0,
          duration: Date.now() - startTime,
        };
      }

      this.logger.log(`Syncing calendar for property: ${calendarSync.property.name}`);

      // Fetch iCal data
      const icalData = await this.fetchICalData(calendarSync.icalUrl);

      // Parse events
      const allEvents = this.icalParser.parseICalData(icalData);
      
      // Filter to only future events
      const futureEvents = this.icalParser.filterFutureEvents(allEvents);
      
      this.logger.log(`Found ${futureEvents.length} future events to process`);

      // Get or create system user for synced bookings
      const systemUser = await this.getOrCreateSystemUser();

      // Process each event
      for (const event of futureEvents) {
        try {
          const result = await this.processEvent(
            event,
            calendarSync.propertyId,
            calendarSync.platform,
            systemUser.id,
          );

          if (result.imported) {
            eventsImported++;
          } else {
            eventsSkipped++;
          }

          if (result.conflictResolved) {
            conflictsResolved++;
          }
        } catch (error) {
          this.logger.error(`Failed to process event ${event.uid}`, error);
          eventsSkipped++;
        }
      }

      // Update calendar sync status
      await this.prisma.calendarSync.update({
        where: { id: calendarSyncId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'SUCCESS',
          lastSyncError: null,
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `Sync completed: ${eventsImported} imported, ${eventsSkipped} skipped, ${conflictsResolved} conflicts resolved (${duration}ms)`,
      );

      return {
        success: true,
        eventsImported,
        eventsSkipped,
        conflictsResolved,
        duration,
      };
    } catch (error) {
      this.logger.error('Sync failed', error);

      // Update calendar sync with error
      await this.prisma.calendarSync.update({
        where: { id: calendarSyncId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'FAILED',
          lastSyncError: error.message,
        },
      });

      return {
        success: false,
        eventsImported,
        eventsSkipped,
        conflictsResolved,
        error: error.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch iCal data from URL
   */
  private async fetchICalData(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NyumbaOps Calendar Sync/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      this.logger.error('Failed to fetch iCal data', error);
      throw new Error(`Failed to fetch iCal feed: ${error.message}`);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(
    event: ParsedEvent,
    propertyId: string,
    platform: string,
    userId: string,
  ): Promise<{ imported: boolean; conflictResolved: boolean }> {
    // Check if booking already exists (by external ID)
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        externalId: event.uid,
        propertyId,
      },
    });

    if (existingBooking) {
      // Update existing booking if dates changed
      const datesChanged =
        existingBooking.checkInDate.getTime() !== event.startDate.getTime() ||
        existingBooking.checkOutDate.getTime() !== event.endDate.getTime();

      if (datesChanged) {
        await this.prisma.booking.update({
          where: { id: existingBooking.id },
          data: {
            checkInDate: event.startDate,
            checkOutDate: event.endDate,
            updatedAt: new Date(),
          },
        });
        this.logger.log(`Updated booking ${existingBooking.id} with new dates`);
        return { imported: true, conflictResolved: false };
      }

      // No changes needed
      return { imported: false, conflictResolved: false };
    }

    // Check for conflicts with local bookings
    const conflictResolved = await this.resolveConflicts(
      propertyId,
      event.startDate,
      event.endDate,
      event.uid,
    );

    // Create or get guest
    const guest = await this.getOrCreateGuest(event, platform, userId);

    // Create new booking
    await this.prisma.booking.create({
      data: {
        guestId: guest.id,
        propertyId,
        status: BookingStatus.CONFIRMED,
        checkInDate: event.startDate,
        checkOutDate: event.endDate,
        source: platform,
        externalId: event.uid,
        isSyncedBooking: true,
        notes: `Synced from ${platform}. ${event.description || ''}`,
        createdBy: userId,
      },
    });

    this.logger.log(`Created new booking from ${platform}: ${event.uid}`);
    return { imported: true, conflictResolved };
  }

  /**
   * Resolve conflicts with existing local bookings
   * Airbnb bookings always take priority
   */
  private async resolveConflicts(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date,
    externalId: string,
  ): Promise<boolean> {
    // Find overlapping local (non-synced) bookings
    const conflictingBookings = await this.prisma.booking.findMany({
      where: {
        propertyId,
        isSyncedBooking: false, // Only local bookings
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
    });

    if (conflictingBookings.length === 0) {
      return false;
    }

    // Cancel conflicting local bookings
    for (const booking of conflictingBookings) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          notes: `${booking.notes || ''}\n\nCANCELLED: Conflict with Airbnb booking (${externalId})`,
          updatedAt: new Date(),
        },
      });

      this.logger.warn(
        `Cancelled local booking ${booking.id} due to Airbnb conflict`,
      );
    }

    return true;
  }

  /**
   * Get or create guest for synced booking
   */
  private async getOrCreateGuest(
    event: ParsedEvent,
    platform: string,
    userId: string,
  ) {
    const guestName = `Airbnb Guest - ${event.confirmationCode || event.uid.substring(0, 8)}`;

    // Try to find existing guest by name
    let guest = await this.prisma.guest.findFirst({
      where: {
        name: guestName,
        source: 'AIRBNB',
      },
    });

    if (!guest) {
      // Create new guest
      guest = await this.prisma.guest.create({
        data: {
          name: guestName,
          source: 'AIRBNB',
          notes: `Synced from ${platform}. Confirmation: ${event.confirmationCode || event.uid}`,
          createdBy: userId,
        },
      });
      this.logger.log(`Created new guest: ${guestName}`);
    }

    return guest;
  }

  /**
   * Get or create system user for synced bookings
   */
  private async getOrCreateSystemUser() {
    let systemUser = await this.prisma.user.findFirst({
      where: { email: 'system@nyumbaops.com' },
    });

    if (!systemUser) {
      systemUser = await this.prisma.user.create({
        data: {
          email: 'system@nyumbaops.com',
          name: 'System',
          role: 'OWNER',
        },
      });
    }

    return systemUser;
  }
}

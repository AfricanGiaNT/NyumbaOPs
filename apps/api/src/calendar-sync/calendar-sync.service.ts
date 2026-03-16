import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ICalParserService } from './ical-parser.service';
import { SyncEngineService } from './sync-engine.service';
import { CreateCalendarSyncDto } from './dto/create-calendar-sync.dto';
import { UpdateCalendarSyncDto } from './dto/update-calendar-sync.dto';

@Injectable()
export class CalendarSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly icalParser: ICalParserService,
    private readonly syncEngine: SyncEngineService,
  ) {}

  async create(dto: CreateCalendarSyncDto, userId: string) {
    // Validate iCal URL
    if (!this.icalParser.validateICalUrl(dto.icalUrl)) {
      throw new BadRequestException('Invalid iCal URL. Must be HTTPS and end with .ics');
    }

    // Check if property exists
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Check if calendar sync already exists for this property
    const existing = await this.prisma.calendarSync.findUnique({
      where: { propertyId: dto.propertyId },
    });

    if (existing) {
      throw new BadRequestException('Calendar sync already exists for this property');
    }

    // Create calendar sync
    const calendarSync = await this.prisma.calendarSync.create({
      data: {
        propertyId: dto.propertyId,
        platform: dto.platform,
        icalUrl: dto.icalUrl,
        isEnabled: dto.isEnabled ?? true,
        syncFrequency: dto.syncFrequency ?? 30,
      },
      include: {
        property: true,
      },
    });

    await this.audit.logAction({
      action: 'CREATE',
      resourceType: 'CalendarSync',
      resourceId: calendarSync.id,
      userId,
      details: { propertyId: dto.propertyId, platform: dto.platform },
    });

    return calendarSync;
  }

  async findAll() {
    return this.prisma.calendarSync.findMany({
      include: {
        property: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const calendarSync = await this.prisma.calendarSync.findUnique({
      where: { id },
      include: {
        property: true,
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!calendarSync) {
      throw new NotFoundException('Calendar sync not found');
    }

    return calendarSync;
  }

  async findByProperty(propertyId: string) {
    return this.prisma.calendarSync.findUnique({
      where: { propertyId },
      include: {
        property: true,
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async update(id: string, dto: UpdateCalendarSyncDto, userId: string) {
    // Validate iCal URL if provided
    if (dto.icalUrl && !this.icalParser.validateICalUrl(dto.icalUrl)) {
      throw new BadRequestException('Invalid iCal URL. Must be HTTPS and end with .ics');
    }

    const calendarSync = await this.prisma.calendarSync.update({
      where: { id },
      data: {
        platform: dto.platform,
        icalUrl: dto.icalUrl,
        isEnabled: dto.isEnabled,
        syncFrequency: dto.syncFrequency,
      },
      include: {
        property: true,
      },
    });

    await this.audit.logAction({
      action: 'UPDATE',
      resourceType: 'CalendarSync',
      resourceId: calendarSync.id,
      userId,
      details: { changes: dto },
    });

    return calendarSync;
  }

  async remove(id: string, userId: string) {
    const calendarSync = await this.prisma.calendarSync.delete({
      where: { id },
    });

    await this.audit.logAction({
      action: 'DELETE',
      resourceType: 'CalendarSync',
      resourceId: calendarSync.id,
      userId,
      details: { propertyId: calendarSync.propertyId },
    });

    return calendarSync;
  }

  /**
   * Trigger manual sync for a calendar
   */
  async triggerSync(id: string, userId: string) {
    const calendarSync = await this.prisma.calendarSync.findUnique({
      where: { id },
    });

    if (!calendarSync) {
      throw new NotFoundException('Calendar sync not found');
    }

    // Perform sync
    const result = await this.syncEngine.syncCalendar(id);

    // Log sync result
    await this.prisma.calendarSyncLog.create({
      data: {
        calendarSyncId: id,
        status: result.success ? 'SUCCESS' : 'FAILED',
        eventsImported: result.eventsImported,
        eventsSkipped: result.eventsSkipped,
        errorMessage: result.error,
        syncDuration: result.duration,
      },
    });

    await this.audit.logAction({
      action: 'SYNC',
      resourceType: 'CalendarSync',
      resourceId: id,
      userId,
      details: { 
        manual: true,
        result: {
          success: result.success,
          eventsImported: result.eventsImported,
          conflictsResolved: result.conflictsResolved,
        },
      },
    });

    return result;
  }

  /**
   * Test iCal URL connectivity
   */
  async testConnection(id: string) {
    const calendarSync = await this.prisma.calendarSync.findUnique({
      where: { id },
    });

    if (!calendarSync) {
      throw new NotFoundException('Calendar sync not found');
    }

    try {
      // Try to fetch and parse the iCal feed
      const response = await fetch(calendarSync.icalUrl, {
        headers: {
          'User-Agent': 'NyumbaOps Calendar Sync/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const icalData = await response.text();
      const events = this.icalParser.parseICalData(icalData);
      const futureEvents = this.icalParser.filterFutureEvents(events);

      return {
        success: true,
        message: 'Connection successful',
        totalEvents: events.length,
        futureEvents: futureEvents.length,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.toString(),
      };
    }
  }

  /**
   * Get sync logs for a calendar
   */
  async getSyncLogs(id: string, limit = 50) {
    const calendarSync = await this.prisma.calendarSync.findUnique({
      where: { id },
    });

    if (!calendarSync) {
      throw new NotFoundException('Calendar sync not found');
    }

    return this.prisma.calendarSyncLog.findMany({
      where: { calendarSyncId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

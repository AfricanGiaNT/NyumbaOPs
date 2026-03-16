import { Injectable, Logger } from '@nestjs/common';
import * as ical from 'ical';

export interface ParsedEvent {
  uid: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  confirmationCode?: string;
}

@Injectable()
export class ICalParserService {
  private readonly logger = new Logger(ICalParserService.name);

  /**
   * Parse iCal data and extract booking events
   */
  parseICalData(icalData: string): ParsedEvent[] {
    try {
      const events = ical.parseICS(icalData);
      const parsedEvents: ParsedEvent[] = [];

      for (const key in events) {
        const event = events[key];
        
        // Only process VEVENT components
        if (event.type !== 'VEVENT') {
          continue;
        }

        // Skip events without required fields
        if (!event.uid || !event.start || !event.end) {
          this.logger.warn(`Skipping event without required fields: ${event.uid}`);
          continue;
        }

        // Extract confirmation code from summary (Airbnb format)
        const confirmationCode = this.extractConfirmationCode(event.summary || '');

        parsedEvents.push({
          uid: event.uid,
          summary: event.summary || 'Airbnb Booking',
          startDate: new Date(event.start),
          endDate: new Date(event.end),
          description: event.description,
          confirmationCode,
        });
      }

      this.logger.log(`Parsed ${parsedEvents.length} events from iCal data`);
      return parsedEvents;
    } catch (error) {
      this.logger.error('Failed to parse iCal data', error);
      throw new Error(`iCal parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract confirmation code from event summary
   * Airbnb format typically: "Reserved" or "Airbnb (Confirmation: HM123456)"
   */
  private extractConfirmationCode(summary: string): string | undefined {
    // Try to extract confirmation code from summary
    const match = summary.match(/(?:Confirmation|Code):\s*([A-Z0-9]+)/i);
    if (match) {
      return match[1];
    }

    // If no explicit confirmation code, use a portion of the summary
    // This ensures we always have some identifier
    const cleaned = summary.replace(/[^A-Z0-9]/gi, '').substring(0, 10);
    return cleaned || 'AIRBNB';
  }

  /**
   * Filter events to only include future bookings
   */
  filterFutureEvents(events: ParsedEvent[]): ParsedEvent[] {
    const now = new Date();
    return events.filter(event => event.endDate >= now);
  }

  /**
   * Validate iCal URL format
   */
  validateICalUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Must be HTTPS
      if (urlObj.protocol !== 'https:') {
        return false;
      }

      // Must end with .ics
      if (!urlObj.pathname.endsWith('.ics')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}

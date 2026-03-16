import * as ical from 'ical';

export interface ParsedEvent {
  uid: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  confirmationCode?: string;
}

/**
 * Parse iCal data and extract booking events
 */
export function parseICalData(icalData: string): ParsedEvent[] {
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
        console.warn(`Skipping event without required fields: ${event.uid}`);
        continue;
      }

      // Extract confirmation code from summary (Airbnb format)
      const confirmationCode = extractConfirmationCode(event.summary || '');

      parsedEvents.push({
        uid: event.uid,
        summary: event.summary || 'Airbnb Booking',
        startDate: new Date(event.start),
        endDate: new Date(event.end),
        description: event.description,
        confirmationCode,
      });
    }

    console.log(`Parsed ${parsedEvents.length} events from iCal data`);
    return parsedEvents;
  } catch (error: any) {
    console.error('Failed to parse iCal data', error);
    throw new Error(`iCal parsing failed: ${error.message}`);
  }
}

/**
 * Extract confirmation code from event summary
 */
function extractConfirmationCode(summary: string): string | undefined {
  // Try to extract confirmation code from summary
  const match = summary.match(/(?:Confirmation|Code):\s*([A-Z0-9]+)/i);
  if (match) {
    return match[1];
  }

  // If no explicit confirmation code, use a portion of the summary
  const cleaned = summary.replace(/[^A-Z0-9]/gi, '').substring(0, 10);
  return cleaned || 'AIRBNB';
}

/**
 * Filter events to only include future bookings
 */
export function filterFutureEvents(events: ParsedEvent[]): ParsedEvent[] {
  const now = new Date();
  return events.filter(event => event.endDate >= now);
}

/**
 * Validate iCal URL format
 */
export function validateICalUrl(url: string): boolean {
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

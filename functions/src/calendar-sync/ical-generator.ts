import { db } from '../lib/firebase';

/**
 * Generate iCal feed for a property
 * This allows Airbnb to import our bookings
 */
export async function generateICalFeed(propertyId: string): Promise<string> {
  // Get property details
  const propertyDoc = await db.collection('properties').doc(propertyId).get();
  if (!propertyDoc.exists) {
    throw new Error('Property not found');
  }
  
  const property = propertyDoc.data()!;

  // Get all confirmed bookings for this property
  const bookingsSnapshot = await db.collection('bookings')
    .where('propertyId', '==', propertyId)
    .where('status', 'in', ['CONFIRMED', 'CHECKED_IN'])
    .get();

  const bookings = bookingsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      guestId: data.guestId,
      status: data.status,
    };
  });

  // Generate iCal content
  const icalLines: string[] = [];
  
  // Calendar header
  icalLines.push('BEGIN:VCALENDAR');
  icalLines.push('VERSION:2.0');
  icalLines.push('PRODID:-//NyumbaOps//Calendar Sync//EN');
  icalLines.push('CALSCALE:GREGORIAN');
  icalLines.push('METHOD:PUBLISH');
  icalLines.push(`X-WR-CALNAME:${property.name || 'Property'} - NyumbaOps`);
  icalLines.push('X-WR-TIMEZONE:UTC');
  icalLines.push('X-WR-CALDESC:Bookings for ' + (property.name || 'Property'));

  // Add each booking as an event
  for (const booking of bookings) {
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    
    // Format dates as YYYYMMDD
    const dtStart = formatICalDate(checkIn);
    const dtEnd = formatICalDate(checkOut);
    
    // Generate unique ID
    const uid = `${booking.id}@nyumbaops.com`;
    
    // Get guest name
    let guestName = 'Guest';
    if (booking.guestId) {
      try {
        const guestDoc = await db.collection('guests').doc(booking.guestId).get();
        if (guestDoc.exists) {
          guestName = guestDoc.data()!.name || 'Guest';
        }
      } catch (error) {
        console.error('Error fetching guest:', error);
      }
    }

    // Event details
    icalLines.push('BEGIN:VEVENT');
    icalLines.push(`UID:${uid}`);
    icalLines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    icalLines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    icalLines.push(`DTSTAMP:${formatICalDateTime(new Date())}`);
    icalLines.push(`SUMMARY:Reserved - ${guestName}`);
    icalLines.push(`DESCRIPTION:Booking for ${guestName}. Status: ${booking.status}`);
    icalLines.push('STATUS:CONFIRMED');
    icalLines.push('TRANSP:OPAQUE');
    
    // Add booking ID as custom property
    icalLines.push(`X-NYUMBAOPS-BOOKING-ID:${booking.id}`);
    
    icalLines.push('END:VEVENT');
  }

  // Calendar footer
  icalLines.push('END:VCALENDAR');

  return icalLines.join('\r\n');
}

/**
 * Format date as YYYYMMDD for iCal DATE
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format date as YYYYMMDDTHHmmssZ for iCal DATETIME
 */
function formatICalDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

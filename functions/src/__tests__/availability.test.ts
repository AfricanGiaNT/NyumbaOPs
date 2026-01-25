import { getFirestore } from 'firebase-admin/firestore';
import {
  createTestProperty,
  createTestGuest,
  createTestBooking,
} from './utils/test-helpers';

describe('Availability - ensurePropertyAvailable', () => {
  it('should allow booking when property is available', async () => {
    const propertyId = await createTestProperty();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    // No existing bookings
    await expect(
      ensurePropertyAvailable(propertyId, tomorrow, dayAfter)
    ).resolves.not.toThrow();
  });

  it('should prevent booking when dates overlap with existing booking', async () => {
    const propertyId = await createTestProperty();
    const guestId = await createTestGuest();
    
    const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day3 = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day4 = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create existing booking (day2 to day3)
    await createTestBooking(propertyId, guestId, {
      checkInDate: day2,
      checkOutDate: day3,
      status: 'CONFIRMED',
    });

    // Try to book overlapping dates (day1 to day3)
    await expect(
      ensurePropertyAvailable(propertyId, day1, day3)
    ).rejects.toThrow('Property is not available for these dates');

    // Try to book overlapping dates (day2 to day4)
    await expect(
      ensurePropertyAvailable(propertyId, day2, day4)
    ).rejects.toThrow('Property is not available for these dates');
  });

  it('should allow same-day turnover (check-out day is available for new check-in)', async () => {
    const propertyId = await createTestProperty();
    const guestId = await createTestGuest();
    
    const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day3 = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create existing booking (day1 to day2)
    await createTestBooking(propertyId, guestId, {
      checkInDate: day1,
      checkOutDate: day2,
      status: 'CONFIRMED',
    });

    // Should allow booking from day2 to day3 (same-day turnover)
    await expect(
      ensurePropertyAvailable(propertyId, day2, day3)
    ).resolves.not.toThrow();
  });

  it('should ignore CANCELLED bookings when checking availability', async () => {
    const propertyId = await createTestProperty();
    const guestId = await createTestGuest();
    
    const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create cancelled booking
    await createTestBooking(propertyId, guestId, {
      checkInDate: day1,
      checkOutDate: day2,
      status: 'CANCELLED',
    });

    // Should allow booking on same dates since existing booking is cancelled
    await expect(
      ensurePropertyAvailable(propertyId, day1, day2)
    ).resolves.not.toThrow();
  });

  it('should allow updating existing booking with excludeBookingId', async () => {
    const propertyId = await createTestProperty();
    const guestId = await createTestGuest();
    
    const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day3 = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Create booking
    const bookingId = await createTestBooking(propertyId, guestId, {
      checkInDate: day1,
      checkOutDate: day2,
      status: 'CONFIRMED',
    });

    // Should allow updating same booking dates (excluding itself)
    await expect(
      ensurePropertyAvailable(propertyId, day1, day3, bookingId)
    ).resolves.not.toThrow();
  });

  it('should reject invalid date ranges', async () => {
    const propertyId = await createTestProperty();
    const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Check-out before check-in
    await expect(
      ensurePropertyAvailable(propertyId, day2, day1)
    ).rejects.toThrow('Check-out must be after check-in');
  });

  it('should reject inactive properties', async () => {
    const propertyId = await createTestProperty({ status: 'INACTIVE' });
    const day1 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const day2 = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];

    await expect(
      ensurePropertyAvailable(propertyId, day1, day2)
    ).rejects.toThrow('Property is not active');
  });
});

// Helper function from index.ts for testing
async function ensurePropertyAvailable(
  propertyId: string,
  checkInDate: string,
  checkOutDate: string,
  excludeBookingId?: string
) {
  const db = getFirestore();
  
  const propertyDoc = await db.collection('properties').doc(propertyId).get();
  if (!propertyDoc.exists) {
    throw new Error('Property not found');
  }
  if (propertyDoc.data()?.status !== 'ACTIVE') {
    throw new Error('Property is not active');
  }
  
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  if (!(checkIn < checkOut)) {
    throw new Error('Check-out must be after check-in');
  }

  const snapshot = await db
    .collection('bookings')
    .where('propertyId', '==', propertyId)
    .where('status', 'in', ['PENDING', 'CONFIRMED', 'CHECKED_IN'])
    .get();
    
  const overlaps = snapshot.docs.filter((doc) => {
    if (excludeBookingId && doc.id === excludeBookingId) {
      return false;
    }
    const data = doc.data();
    const bookingCheckIn = new Date(data.checkInDate);
    const bookingCheckOut = new Date(data.checkOutDate);
    return bookingCheckIn < checkOut && bookingCheckOut > checkIn;
  });
  
  if (overlaps.length > 0) {
    throw new Error('Property is not available for these dates');
  }
}

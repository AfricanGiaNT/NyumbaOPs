import { BookingStatus, InquiryStatus, PropertyStatus } from '@prisma/client';
import { InquiriesService } from './inquiries.service';

describe('InquiriesService', () => {
  const inquiry = {
    id: 'inquiry-1', propertyId: 'property-1', guestName: 'Guest',
    guestEmail: 'guest@example.com', guestPhone: '0990000000', numberOfGuests: 2,
    checkInDate: new Date(Date.now() + 2 * 86400000),
    checkOutDate: new Date(Date.now() + 4 * 86400000),
    message: null, status: InquiryStatus.NEW, bookingId: null,
  };

  it('rejects a public request above property capacity', async () => {
    const prisma = { property: { findUnique: jest.fn().mockResolvedValue({ id: 'property-1', status: PropertyStatus.ACTIVE, maxGuests: 2 }) } };
    const service = new InquiriesService(prisma as any);
    await expect(service.create({
      propertyId: 'property-1', guestName: 'Guest', guestEmail: 'guest@example.com', guestPhone: '0990000000',
      checkInDate: '2030-01-01', checkOutDate: '2030-01-03', numberOfGuests: 3,
    })).rejects.toThrow('Guest count exceeds property capacity');
  });

  it('returns the existing booking on repeated conversion', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      inquiry: { findUnique: jest.fn().mockResolvedValue({ ...inquiry, status: InquiryStatus.CONVERTED, bookingId: 'booking-1' }) },
      guest: { create: jest.fn() },
      booking: { create: jest.fn() },
    };
    const prisma = { $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) };
    const result = await new InquiriesService(prisma as any).convert(inquiry.id, 'owner-1');
    expect(result.data.bookingId).toBe('booking-1');
    expect(tx.guest.create).not.toHaveBeenCalled();
    expect(tx.booking.create).not.toHaveBeenCalled();
  });

  it('creates one pending 24-hour hold when staff convert an available inquiry', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      inquiry: {
        findUnique: jest.fn().mockResolvedValue(inquiry),
        update: jest.fn().mockImplementation(({ data }: any) => ({ ...inquiry, ...data })),
      },
      property: { findUnique: jest.fn().mockResolvedValue({ id: 'property-1', status: PropertyStatus.ACTIVE }) },
      booking: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ id: 'booking-1' }) },
      guest: { create: jest.fn().mockResolvedValue({ id: 'guest-1' }) },
    };
    const prisma = { $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) };
    const startedAt = Date.now();
    const result = await new InquiriesService(prisma as any).convert(inquiry.id, 'owner-1');
    const bookingData = tx.booking.create.mock.calls[0][0].data;
    expect(bookingData.status).toBe(BookingStatus.PENDING);
    expect(bookingData.holdExpiresAt.getTime()).toBeGreaterThanOrEqual(startedAt + 24 * 60 * 60_000);
    expect(result.data.bookingId).toBe('booking-1');
  });
});

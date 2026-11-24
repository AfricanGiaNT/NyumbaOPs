import { BookingStatus, InquiryStatus, PropertyStatus } from '@prisma/client';
import { ReservationsService } from './reservations.service';

const dates = { checkInDate: '2030-01-01', checkOutDate: '2030-01-03' };
const request = {
  propertyId: 'property-1',
  guestName: 'Guest',
  guestEmail: 'guest@example.com',
  guestPhone: '0990000000',
  numberOfGuests: 2,
  ...dates,
};
const stored = {
  id: 'request-1',
  propertyId: 'property-1',
  guestName: 'Guest',
  guestEmail: 'guest@example.com',
  guestPhone: '0990000000',
  checkInDate: new Date('2030-01-01'),
  checkOutDate: new Date('2030-01-03'),
  numberOfGuests: 2,
  message: null,
  status: InquiryStatus.PENDING_REVIEW,
  bookingId: null,
};

function createHarness(overlap: number) {
  const tx = {
    $queryRaw: jest.fn(),
    property: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          id: 'property-1',
          name: 'House',
          maxGuests: 3,
          status: PropertyStatus.ACTIVE,
        }),
    },
    inquiry: {
      create: jest
        .fn()
        .mockImplementation(({ data }: any) => ({ ...stored, ...data })),
      update: jest
        .fn()
        .mockImplementation(({ data }: any) => ({ ...stored, ...data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    booking: {
      count: jest.fn().mockResolvedValue(overlap),
      create: jest.fn().mockResolvedValue({ id: 'booking-1' }),
    },
    user: { upsert: jest.fn().mockResolvedValue({ id: 'system-1' }) },
    guest: { create: jest.fn().mockResolvedValue({ id: 'guest-1' }) },
    reservationEmail: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: (work: (client: typeof tx) => unknown) => work(tx),
  };
  const emails = { tryDispatch: jest.fn() };
  return {
    service: new ReservationsService(prisma as any, emails as any),
    tx,
    emails,
  };
}

describe('ReservationsService', () => {
  const previousAdmin = process.env.RESERVATIONS_ADMIN_EMAIL;
  beforeAll(() => {
    process.env.RESERVATIONS_ADMIN_EMAIL = 'owner@example.com';
  });
  afterAll(() => {
    if (previousAdmin === undefined)
      delete process.env.RESERVATIONS_ADMIN_EMAIL;
    else process.env.RESERVATIONS_ADMIN_EMAIL = previousAdmin;
  });

  it('stores an available request with a 24-hour pending hold and both notification jobs', async () => {
    const { service, tx } = createHarness(0);
    const started = Date.now();
    const result = await service.create(request);
    expect(result.data.status).toBe(InquiryStatus.PENDING_REVIEW);
    expect(tx.booking.create).toHaveBeenCalledTimes(1);
    const booking = tx.booking.create.mock.calls[0][0].data;
    expect(booking.status).toBe(BookingStatus.PENDING);
    expect(booking.holdExpiresAt.getTime()).toBeGreaterThanOrEqual(
      started + 24 * 60 * 60_000,
    );
    expect(tx.reservationEmail.create).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('queues an overlapping request without creating a booking', async () => {
    const { service, tx } = createHarness(1);
    const result = await service.create(request);
    expect(result.data.status).toBe(InquiryStatus.QUEUED);
    expect(tx.booking.create).not.toHaveBeenCalled();
    expect(tx.reservationEmail.create).toHaveBeenCalledTimes(2);
  });

  it('does not accept a review hold that already expired', async () => {
    const { service, tx } = createHarness(0);
    (tx.inquiry as any).findUnique = jest.fn().mockResolvedValue(stored);
    (tx.inquiry as any).findUniqueOrThrow = jest.fn().mockResolvedValue({
      ...stored,
      property: { name: 'House', status: PropertyStatus.ACTIVE },
      booking: {
        id: 'booking-1',
        status: BookingStatus.PENDING,
        holdExpiresAt: new Date('2020-01-01'),
      },
    });
    (tx.booking as any).update = jest.fn();
    await expect(service.accept(stored.id, 'owner-1')).rejects.toThrow(
      'Review hold expired',
    );
    expect((tx.booking as any).update).not.toHaveBeenCalled();
  });

  it('requires a separate final confirmation and clears the temporary hold', async () => {
    const { service, tx } = createHarness(0);
    (tx.inquiry as any).findUnique = jest.fn().mockResolvedValue(stored);
    (tx.inquiry as any).findUniqueOrThrow = jest.fn().mockResolvedValue({
      ...stored,
      status: InquiryStatus.AWAITING_CONFIRMATION,
      property: { name: 'House', status: PropertyStatus.ACTIVE },
      booking: {
        id: 'booking-1',
        status: BookingStatus.PENDING,
        holdExpiresAt: new Date('2030-01-01'),
      },
    });
    (tx.booking as any).update = jest.fn();
    const result = await service.confirm(stored.id, 'owner-1');
    expect(result.data.status).toBe(InquiryStatus.CONFIRMED);
    expect((tx.booking as any).update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: BookingStatus.CONFIRMED, holdExpiresAt: null },
      }),
    );
    expect(tx.reservationEmail.create).toHaveBeenCalledTimes(1);
  });

  it('promotes only the oldest fully available queued request', async () => {
    const { service, tx } = createHarness(0);
    const oldest = {
      ...stored,
      id: 'oldest',
      status: InquiryStatus.QUEUED,
      property: { name: 'House' },
    };
    const newer = {
      ...stored,
      id: 'newer',
      status: InquiryStatus.QUEUED,
      property: { name: 'House' },
    };
    tx.inquiry.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([oldest, newer]);
    tx.booking.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    await service.preparePropertyTx(tx as any, 'property-1');
    expect(tx.booking.create).toHaveBeenCalledTimes(1);
    expect(tx.inquiry.update.mock.calls[0][0].where.id).toBe('oldest');
  });

  it('releases an expired hold before promoting a queued guest', async () => {
    const { service, tx } = createHarness(0);
    const expired = {
      ...stored,
      id: 'expired',
      property: { name: 'House' },
      booking: {
        id: 'expired-booking',
        status: BookingStatus.PENDING,
        holdExpiresAt: new Date('2020-01-01'),
      },
    };
    const queued = {
      ...stored,
      id: 'queued',
      status: InquiryStatus.QUEUED,
      property: { name: 'House' },
    };
    tx.inquiry.findMany
      .mockResolvedValueOnce([expired])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([queued]);
    (tx.booking as any).update = jest.fn().mockResolvedValue({});
    await service.preparePropertyTx(tx as any, 'property-1');
    expect((tx.booking as any).update).toHaveBeenCalledWith({
      where: { id: 'expired-booking' },
      data: { status: BookingStatus.CANCELLED },
    });
    expect(
      tx.inquiry.update.mock.calls.some(
        ([call]) =>
          call.where.id === 'expired' &&
          call.data.status === InquiryStatus.EXPIRED,
      ),
    ).toBe(true);
    expect(tx.booking.create).toHaveBeenCalledTimes(1);
  });
});

import { BookingStatus } from '@prisma/client';
import { SyncEngineService } from './sync-engine.service';

it('cancels an overlapping local reservation before importing an external stay', async () => {
  const local = {
    id: 'reservation-booking',
    propertyId: 'property-1',
    status: BookingStatus.PENDING,
    isSyncedBooking: false,
    notes: null,
  };
  const tx = {
    $queryRaw: jest.fn(),
    booking: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([local]),
      count: jest.fn().mockResolvedValue(0),
      update: jest
        .fn()
        .mockResolvedValue({ ...local, status: BookingStatus.CANCELLED }),
      create: jest.fn().mockResolvedValue({ id: 'external-booking' }),
    },
    guest: { findFirst: jest.fn().mockResolvedValue({ id: 'external-guest' }) },
  };
  const prisma = {
    $transaction: (work: (client: typeof tx) => unknown) => work(tx),
  };
  const service = new SyncEngineService(prisma as any, {} as any, {} as any);
  const event = {
    uid: 'airbnb-1',
    startDate: new Date('2030-01-01'),
    endDate: new Date('2030-01-03'),
    description: '',
    confirmationCode: 'ABC123',
  };
  const result = await (service as any).processEvent(
    event,
    'property-1',
    'AIRBNB',
    'system-1',
  );
  expect(result.conflictResolved).toBe(true);
  expect(tx.booking.update).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: local.id },
      data: expect.objectContaining({ status: BookingStatus.CANCELLED }),
    }),
  );
  expect(tx.booking.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        status: BookingStatus.CONFIRMED,
        isSyncedBooking: true,
      }),
    }),
  );
  expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
});

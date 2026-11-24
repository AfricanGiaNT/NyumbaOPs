import { BookingStatus, InquiryStatus } from '@prisma/client';
import { InquiryHoldsScheduler } from './inquiry-holds.scheduler';

it('releases an expired pending hold and marks its inquiry expired', async () => {
  const previous = process.env.DISABLE_BACKGROUND_JOBS;
  delete process.env.DISABLE_BACKGROUND_JOBS;
  try {
  const tx = {
    booking: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    inquiry: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    booking: { findMany: jest.fn().mockResolvedValue([{ id: 'booking-1' }]) },
    $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
  };
  await new InquiryHoldsScheduler(prisma as any).expireHolds();
  expect(tx.booking.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: BookingStatus.CANCELLED } }));
  expect(tx.inquiry.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: InquiryStatus.EXPIRED } }));
  } finally {
    if (previous === undefined) delete process.env.DISABLE_BACKGROUND_JOBS;
    else process.env.DISABLE_BACKGROUND_JOBS = previous;
  }
});

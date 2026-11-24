import { ReservationEmailStatus } from '@prisma/client';
import { ReservationEmailService } from './reservations-email.service';

it('keeps a failed email pending for retry and marks it sent after delivery', async () => {
  const previous = process.env.DISABLE_BACKGROUND_JOBS;
  delete process.env.DISABLE_BACKGROUND_JOBS;
  try {
    const item = {
      id: 'email-1',
      recipient: 'guest@example.com',
      subject: 'Update',
      body: 'Status',
      status: ReservationEmailStatus.PENDING,
      attempts: 0,
    };
    const prisma = {
      reservationEmail: {
        findMany: jest.fn().mockResolvedValue([item]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
    };
    const email = {
      sendReservationEmail: jest
        .fn()
        .mockRejectedValueOnce(new Error('SMTP offline'))
        .mockResolvedValueOnce(undefined),
    };
    const worker = new ReservationEmailService(prisma as any, email as any);
    await worker.dispatchDue();
    expect(prisma.reservationEmail.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nextAttemptAt: expect.any(Date) }),
      }),
    );
    expect(prisma.reservationEmail.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ReservationEmailStatus.SENT }),
      }),
    );
    await worker.dispatchDue();
    expect(prisma.reservationEmail.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ReservationEmailStatus.SENT }),
      }),
    );
  } finally {
    if (previous === undefined) delete process.env.DISABLE_BACKGROUND_JOBS;
    else process.env.DISABLE_BACKGROUND_JOBS = previous;
  }
});

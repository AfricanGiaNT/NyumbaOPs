import { BookingStatus } from '@prisma/client';
import { isValidStatusTransition } from './bookings.utils';

describe('isValidStatusTransition', () => {
  it('allows valid transitions', () => {
    expect(isValidStatusTransition(BookingStatus.PENDING, BookingStatus.CONFIRMED)).toBe(true);
    expect(isValidStatusTransition(BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)).toBe(true);
    expect(isValidStatusTransition(BookingStatus.CHECKED_IN, BookingStatus.COMPLETED)).toBe(true);
  });

  it('blocks invalid transitions', () => {
    expect(isValidStatusTransition(BookingStatus.PENDING, BookingStatus.COMPLETED)).toBe(false);
    expect(isValidStatusTransition(BookingStatus.COMPLETED, BookingStatus.CONFIRMED)).toBe(false);
  });
});

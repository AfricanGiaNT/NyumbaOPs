import { BookingStatus } from '@prisma/client';

const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  CONFIRMED: [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED],
  CHECKED_IN: [BookingStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidStatusTransition(
  current: BookingStatus,
  next: BookingStatus,
): boolean {
  return STATUS_TRANSITIONS[current].includes(next);
}

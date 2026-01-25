import { BookingStatus } from "./types";

const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED"],
  CHECKED_IN: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function isValidStatusTransition(current: BookingStatus, next: BookingStatus) {
  return STATUS_TRANSITIONS[current].includes(next);
}

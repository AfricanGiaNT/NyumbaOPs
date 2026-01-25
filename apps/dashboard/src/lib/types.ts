export type Currency = "MWK" | "GBP";
export type PropertyStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type TransactionType = "REVENUE" | "EXPENSE";
export type CategoryType = "REVENUE" | "EXPENSE";
export type GuestSource = "AIRBNB" | "LOCAL" | "REFERRAL" | "REPEAT";
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PaymentRecordStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PaymentMethod =
  | "CASH"
  | "MOBILE_MONEY"
  | "BANK_TRANSFER"
  | "AIRTEL_MONEY"
  | "TNM_MPAMBA"
  | "CARD";

export type PropertyImage = {
  url: string;
  alt?: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type Property = {
  id: string;
  name: string;
  location?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRate?: number | null;
  currency: Currency;
  status: PropertyStatus;
  images?: PropertyImage[];
  amenities?: string[];
};

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  isSystem: boolean;
};

export type Transaction = {
  id: string;
  propertyId?: string | null;
  type: TransactionType;
  categoryId: string;
  amount: number;
  currency: Currency;
  date: string;
  notes?: string | null;
};

export type Guest = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: GuestSource;
  notes?: string | null;
  rating?: number | null;
};

export type Booking = {
  id: string;
  guestId: string;
  propertyId: string;
  status: BookingStatus;
  checkInDate: string;
  checkOutDate: string;
  actualCheckIn?: string | null;
  actualCheckOut?: string | null;
  checkInNotes?: string | null;
  checkOutNotes?: string | null;
  notes?: string | null;
  currency?: Currency;
  totalAmount?: number | null;
  amountPaid?: number;
  paymentStatus?: PaymentStatus;
  guest?: Guest;
  property?: Property;
};

export type InquiryStatus = "NEW" | "CONTACTED" | "CONVERTED" | "EXPIRED";

export type Inquiry = {
  id: string;
  propertyId: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  message?: string | null;
  status: InquiryStatus;
  bookingId?: string | null;
  expiresAt?: string;
  createdAt?: string;
};

export type Payment = {
  id: string;
  bookingId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  reference?: string | null;
  paychanguCheckoutId?: string | null;
  paymentLink?: string | null;
  paymentLinkExpiresAt?: string | null;
  createdAt?: string;
};

export type CurrencySummary = {
  currency: Currency;
  revenue: number;
  expense: number;
  profit: number;
};

export type AnalyticsSummary = {
  month: string | null;
  totals: CurrencySummary[];
};


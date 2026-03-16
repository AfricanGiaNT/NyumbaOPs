export type Currency = "MWK" | "GBP";
export type PropertyStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type TransactionType = "REVENUE" | "EXPENSE";
export type CategoryType = "REVENUE" | "EXPENSE";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED";
export type GuestSource = "AIRBNB" | "LOCAL" | "REFERRAL" | "REPEAT" | "WEBSITE";
export type PaymentIntentStatus = "PENDING" | "COMPLETED" | "EXPIRED" | "FAILED";

export type PropertyImage = {
  url: string;
  alt?: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type PropertyDoc = {
  name: string;
  location?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRate?: number | null;
  currency: Currency;
  status: PropertyStatus;
  amenities: string[];
  images: PropertyImage[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
};


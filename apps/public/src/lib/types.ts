export type PublicPropertyListResponse = {
  success: boolean;
  data: PublicPropertyListItem[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
};

export type PublicPropertyListItem = {
  id: string;
  name: string;
  location?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRate?: number | null;
  currency: "MWK" | "GBP";
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  amenities: string[];
};

export type AvailabilityResponse = {
  success: boolean;
  data: {
    available: boolean;
    propertyId: string;
    propertyName: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    nightlyRate: number;
    currency: string;
    totalAmount: number;
    maxGuests: number;
  };
};

export type CreateBookingResponse = {
  success: boolean;
  data: {
    bookingId: string;
    guestId: string;
    paymentId: string;
    checkoutUrl: string;
    totalAmount: number;
    currency: string;
    expiresAt: string;
  };
};

export type PublicBookingDetail = {
  success: boolean;
  data: {
    id: string;
    propertyName: string;
    propertyImage: string | null;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfGuests: number;
    nights: number | null;
    totalAmount: number;
    amountPaid: number;
    currency: string;
    paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
    status: string;
    paymentLink: string | null;
    paymentLinkExpiresAt: string | null;
    createdAt: string;
  };
};

export type CancelBookingResponse = {
  success: boolean;
  data: {
    bookingId: string;
    status: string;
    refundAmount: number;
    refundNote: string;
    currency: string;
  };
};

export type BlockedDateRange = {
  checkInDate: string;
  checkOutDate: string;
};

export type BlockedDatesResponse = {
  success: boolean;
  data: {
    propertyId: string;
    blockedRanges: BlockedDateRange[];
  };
};

export type PublicPropertyDetail = {
  success: boolean;
  data: {
    id: string;
    name: string;
    propertyType?: string | null;
    location?: string | null;
    address?: string | null;
    description?: string | null;
    spaceDescription?: string | null;
    guestAccess?: string | null;
    otherDetails?: string | null;
    highlights?: string[];
    bedrooms: number;
    beds?: number | null;
    bathrooms: number;
    maxGuests: number;
    propertySize?: number | null;
    bedTypes?: string[];
    nightlyRate?: number | null;
    currency: "MWK" | "GBP";
    weekendRate?: number | null;
    cleaningFee?: number | null;
    minimumStay?: number | null;
    maximumStay?: number | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    smokingAllowed?: boolean;
    petsAllowed?: boolean;
    eventsAllowed?: boolean;
    quietHours?: string | null;
    additionalRules?: string | null;
    cancellationPolicy?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    googleMapsUrl?: string | null;
    status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
    images: {
      url: string;
      alt?: string | null;
      sortOrder: number;
      isCover: boolean;
    }[];
    amenities: { name: string; description?: string | null }[];
  };
};

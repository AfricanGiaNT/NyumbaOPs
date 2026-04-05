import { Currency, PropertyStatus } from '@prisma/client';

export type PublicAmenityDto = {
  name: string;
  description?: string | null;
};

export type PublicPropertyImageDto = {
  url: string;
  alt?: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type PublicPropertyListItemDto = {
  id: string;
  name: string;
  location?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRate?: number | null;
  currency: Currency;
  status: PropertyStatus;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  amenities: string[];
};

export type PublicPropertyDetailDto = {
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
  currency: Currency;
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
  status: PropertyStatus;
  images: PublicPropertyImageDto[];
  amenities: PublicAmenityDto[];
};

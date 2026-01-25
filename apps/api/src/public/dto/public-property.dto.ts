import { Currency, PropertyStatus } from '@prisma/client';

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
  location?: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRate?: number | null;
  currency: Currency;
  status: PropertyStatus;
  images: PublicPropertyImageDto[];
  amenities: string[];
};

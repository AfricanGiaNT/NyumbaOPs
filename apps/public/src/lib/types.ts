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
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  amenities: string[];
};

export type PublicPropertyDetail = {
  success: boolean;
  data: {
    id: string;
    name: string;
    location?: string | null;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    nightlyRate?: number | null;
    currency: "MWK" | "GBP";
    status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
    images: {
      url: string;
      alt?: string | null;
      sortOrder: number;
      isCover: boolean;
    }[];
    amenities: string[];
  };
};

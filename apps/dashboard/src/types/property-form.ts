import { ImageFile } from "@/components/ImageUpload";

export interface PropertyFormData {
  // ID for edit mode
  id?: string;
  
  // Basic Info
  name: string;
  propertyType: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;

  // Description & Highlights
  description?: string;
  spaceDescription?: string;
  guestAccess?: string;
  otherDetails?: string;
  highlights?: string[];

  // Amenities
  amenities: string[];

  // Images
  images: ImageFile[];

  // Property Details
  bedrooms: number;
  beds: number;
  bathrooms: number;
  maxGuests: number;
  propertySize?: number;
  bedTypes?: string[];

  // Pricing & Availability
  nightlyRate: number;
  currency: string;
  weekendRate?: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  cleaningFee?: number;
  securityDeposit?: number;
  extraGuestFee?: number;
  minimumStay?: number;
  maximumStay?: number;

  // House Rules & Policies
  checkInTime?: string;
  checkOutTime?: string;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  eventsAllowed: boolean;
  quietHours?: string;
  additionalRules?: string;
  cancellationPolicy: string;

  // Status
  status: "active" | "inactive" | "maintenance";
}

export const DEFAULT_FORM_DATA: PropertyFormData = {
  name: "",
  propertyType: "apartment",
  location: "",
  address: "",
  latitude: undefined,
  longitude: undefined,
  googleMapsUrl: "",
  description: "",
  spaceDescription: "",
  guestAccess: "",
  otherDetails: "",
  highlights: [],
  amenities: [],
  images: [],
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  maxGuests: 2,
  propertySize: undefined,
  bedTypes: [],
  nightlyRate: 0,
  currency: "USD",
  weekendRate: undefined,
  weeklyDiscount: undefined,
  monthlyDiscount: undefined,
  cleaningFee: undefined,
  securityDeposit: undefined,
  extraGuestFee: undefined,
  minimumStay: 1,
  maximumStay: undefined,
  checkInTime: "15:00",
  checkOutTime: "11:00",
  smokingAllowed: false,
  petsAllowed: false,
  eventsAllowed: false,
  quietHours: "",
  additionalRules: "",
  cancellationPolicy: "moderate",
  status: "active",
};

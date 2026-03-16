export interface PropertyType {
  id: string;
  label: string;
  icon: string;
}

export const PROPERTY_TYPES: PropertyType[] = [
  { id: "house", label: "House", icon: "🏠" },
  { id: "apartment", label: "Apartment", icon: "🏢" },
  { id: "condo", label: "Condo", icon: "🏘️" },
  { id: "villa", label: "Villa", icon: "🏰" },
  { id: "cottage", label: "Cottage", icon: "🏡" },
  { id: "cabin", label: "Cabin", icon: "🛖" },
  { id: "townhouse", label: "Townhouse", icon: "🏘️" },
  { id: "bungalow", label: "Bungalow", icon: "🏠" },
  { id: "studio", label: "Studio", icon: "🏢" },
  { id: "loft", label: "Loft", icon: "🏭" },
];

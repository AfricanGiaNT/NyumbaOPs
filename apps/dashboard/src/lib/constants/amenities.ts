export interface Amenity {
  id: string;
  label: string;
  icon: string;
  category: string;
}

export const AMENITIES: Amenity[] = [
  { id: "wifi", label: "Wifi", icon: "📶", category: "Essential" },
  { id: "kitchen", label: "Kitchen", icon: "🍳", category: "Essential" },
  { id: "parking", label: "Free parking", icon: "🅿️", category: "Essential" },
  { id: "air_conditioning", label: "Air conditioning", icon: "❄️", category: "Essential" },
  { id: "heating", label: "Heating", icon: "🔥", category: "Essential" },
  { id: "tv", label: "TV", icon: "📺", category: "Features" },
  { id: "workspace", label: "Dedicated workspace", icon: "💼", category: "Features" },
  { id: "washer", label: "Washer", icon: "🧺", category: "Features" },
  { id: "dryer", label: "Dryer", icon: "👕", category: "Features" },
  { id: "iron", label: "Iron", icon: "🔌", category: "Features" },
  { id: "hair_dryer", label: "Hair dryer", icon: "💨", category: "Features" },
  { id: "smoke_alarm", label: "Smoke alarm", icon: "🚨", category: "Safety" },
  { id: "carbon_monoxide_alarm", label: "Carbon monoxide alarm", icon: "⚠️", category: "Safety" },
  { id: "fire_extinguisher", label: "Fire extinguisher", icon: "🧯", category: "Safety" },
  { id: "first_aid_kit", label: "First aid kit", icon: "🩹", category: "Safety" },
  { id: "balcony", label: "Balcony", icon: "🏡", category: "Outdoor" },
  { id: "patio", label: "Patio", icon: "🪑", category: "Outdoor" },
  { id: "garden", label: "Garden", icon: "🌳", category: "Outdoor" },
  { id: "bbq_grill", label: "BBQ grill", icon: "🔥", category: "Outdoor" },
  { id: "pool", label: "Pool", icon: "🏊", category: "Outdoor" },
  { id: "hot_tub", label: "Hot tub", icon: "🛁", category: "Outdoor" },
  { id: "crib", label: "Crib", icon: "👶", category: "Family" },
  { id: "high_chair", label: "High chair", icon: "🪑", category: "Family" },
  { id: "children_books", label: "Children's books and toys", icon: "🧸", category: "Family" },
  { id: "step_free_access", label: "Step-free access", icon: "♿", category: "Accessibility" },
  { id: "wide_doorways", label: "Wide doorways", icon: "🚪", category: "Accessibility" },
  { id: "accessible_bathroom", label: "Accessible bathroom", icon: "🚿", category: "Accessibility" },
];

export const AMENITY_CATEGORIES = [
  "Essential",
  "Features",
  "Safety",
  "Outdoor",
  "Family",
  "Accessibility",
];

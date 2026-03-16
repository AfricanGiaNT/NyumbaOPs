export interface CancellationPolicy {
  id: string;
  label: string;
  description: string;
}

export const CANCELLATION_POLICIES: CancellationPolicy[] = [
  {
    id: "flexible",
    label: "Flexible",
    description: "Full refund up to 24 hours before check-in",
  },
  {
    id: "moderate",
    label: "Moderate",
    description: "Full refund up to 5 days before check-in",
  },
  {
    id: "strict",
    label: "Strict",
    description: "50% refund up to 7 days before check-in",
  },
];

export const BED_TYPES = [
  { id: "king", label: "King" },
  { id: "queen", label: "Queen" },
  { id: "double", label: "Double" },
  { id: "single", label: "Single" },
  { id: "sofa_bed", label: "Sofa bed" },
  { id: "bunk_bed", label: "Bunk bed" },
];

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  { code: "TZS", symbol: "TSh", label: "Tanzanian Shilling" },
  { code: "UGX", symbol: "USh", label: "Ugandan Shilling" },
];

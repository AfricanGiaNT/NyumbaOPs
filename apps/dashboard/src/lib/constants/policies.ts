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
  { code: "MWK", symbol: "MK", label: "Malawi Kwacha" },
];

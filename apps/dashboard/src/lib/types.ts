export type Currency = "MWK" | "USD";
export type PropertyStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export type TransactionType = "REVENUE" | "EXPENSE";
export type CategoryType = "REVENUE" | "EXPENSE";
export type GuestSource = "AIRBNB" | "LOCAL" | "REFERRAL" | "REPEAT";
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";
export type PaymentRecordStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
export type PaymentMethod =
  | "CASH"
  | "MOBILE_MONEY"
  | "BANK_TRANSFER"
  | "AIRTEL_MONEY"
  | "TNM_MPAMBA"
  | "CARD";

export type PropertyImage = {
  url: string;
  alt?: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type Property = {
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
  weeklyDiscount?: number | null;
  monthlyDiscount?: number | null;
  cleaningFee?: number | null;
  securityDeposit?: number | null;
  extraGuestFee?: number | null;
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
  images?: PropertyImage[];
  amenities?: string[];
  slug?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string[];
};

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  isSystem: boolean;
};

export type Transaction = {
  id: string;
  propertyId?: string | null;
  bookingId?: string | null;
  type: TransactionType;
  categoryId: string;
  amount: number;
  currency: Currency;
  date: string;
  notes?: string | null;
  category?: { id: string; name: string; type: CategoryType } | null;
  property?: { id: string; name: string } | null;
};

export type Guest = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: GuestSource;
  notes?: string | null;
  rating?: number | null;
};

export type Booking = {
  id: string;
  guestId: string;
  propertyId: string;
  status: BookingStatus;
  checkInDate: string;
  checkOutDate: string;
  actualCheckIn?: string | null;
  actualCheckOut?: string | null;
  checkInNotes?: string | null;
  checkOutNotes?: string | null;
  notes?: string | null;
  currency?: Currency;
  totalAmount?: number | null;
  amountPaid?: number;
  paymentStatus?: PaymentStatus;
  source?: string;
  isSyncedBooking?: boolean;
  guest?: Guest;
  property?: Property;
};

export type InquiryStatus = "NEW" | "CONTACTED" | "CONVERTED" | "EXPIRED";

export type Inquiry = {
  id: string;
  propertyId: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  message?: string | null;
  status: InquiryStatus;
  bookingId?: string | null;
  expiresAt?: string;
  createdAt?: string;
};

export type Payment = {
  id: string;
  bookingId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentRecordStatus;
  reference?: string | null;
  paychanguCheckoutId?: string | null;
  paymentLink?: string | null;
  paymentLinkExpiresAt?: string | null;
  createdAt?: string;
};

export type CurrencySummary = {
  currency: Currency;
  revenue: number;
  expense: number;
  profit: number;
};

export type AnalyticsSummary = {
  month: string | null;
  totals: CurrencySummary[];
};

export type LoanStatus = "ACTIVE" | "SETTLED";

export type LoanRepayment = {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  notes?: string | null;
  createdAt: string;
};

export type Loan = {
  id: string;
  lenderName: string;
  amount: number;
  amountRepaid: number;
  status: LoanStatus;
  dateTaken: string;
  dueDate?: string | null;
  notes?: string | null;
  createdAt: string;
  repayments?: LoanRepayment[];
};

// ─── Works & Maintenance ────────────────────────────────────────────────────

export type WorkStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type WorkPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type WorkCategory =
  | "PLUMBING"
  | "ELECTRICAL"
  | "PAINTING"
  | "CLEANING"
  | "CARPENTRY"
  | "APPLIANCE"
  | "HVAC"
  | "LANDSCAPING"
  | "GENERAL"
  | "OTHER";

export type Work = {
  id: string;
  propertyId: string;
  title: string;
  description?: string | null;
  status: WorkStatus;
  priority: WorkPriority;
  category: WorkCategory;
  scheduledDate?: string | null;
  completedDate?: string | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  currency: Currency;
  transactionId?: string | null;
  notes?: string | null;
  property?: { id: string; name: string; location?: string | null } | null;
  transaction?: { id: string; amount: number; currency: Currency } | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Inventory ──────────────────────────────────────────────────────────────

export type InventoryCategory =
  | "CLEANING_SUPPLIES"
  | "TOOLS"
  | "BEDDING"
  | "KITCHEN"
  | "TOILETRIES"
  | "FURNITURE"
  | "APPLIANCES"
  | "SAFETY"
  | "GENERAL"
  | "OTHER";

export type StockMovementType = "IN" | "OUT";

export type StockMovement = {
  id: string;
  inventoryItemId: string;
  workId?: string | null;
  type: StockMovementType;
  quantity: number;
  unitCost?: number | null;
  currency: Currency;
  transactionId?: string | null;
  notes?: string | null;
  createdAt: string;
  transaction?: { id: string; amount: number; currency: Currency } | null;
};

export type InventoryItem = {
  id: string;
  propertyId: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity: number;
  minQuantity: number;
  unitCost?: number | null;
  currency: Currency;
  notes?: string | null;
  property?: { id: string; name: string; location?: string | null } | null;
  movements?: StockMovement[];
  createdAt: string;
  updatedAt: string;
};


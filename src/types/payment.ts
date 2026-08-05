export type PaymentType = 'subscription' | 'credits' | 'auto-refresh' | 'premium' | 'okazion';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'canceled';
export type PokEnv = 'production' | 'staging';

export interface CreditPackage {
  id: string;
  credits: number;
  bonusCredits: number;
  priceEur: number;
  labelSq: string;
  badgeSq?: string;
}

export interface AutoRefreshPackage {
  id: string;
  slots: number;
  priceEur: number;
  labelSq: string;
  labelEn?: string;
}

export interface AutoRefreshStatus {
  slots: number;
  used: number;
  planCode: string;
  refreshEveryHours: number;
  packages: AutoRefreshPackage[];
}

export interface PremiumPackage {
  id: string;
  days: number;
  priceBc: number;
  priceEur: number;
  labelSq: string;
  labelEn?: string;
}

export interface PremiumVoucher {
  id: string;
  packageId: string;
  days: number;
  priceEur: number | null;
  priceBc: number | null;
  source: 'card' | 'boost_coins' | 'subscription' | string;
  status: 'unused' | 'applied' | 'canceled' | string;
  listingKind: string | null;
  listingId: string | null;
  appliedAt: string | null;
  createdAt: string;
}

/** Grow/Elite included Premium Listing slots (always 30 days when applied). */
export interface PremiumPlanQuota {
  max: number;
  used: number;
  remaining: number;
  days: number;
}

export type OkazionPackage = PremiumPackage;
export type OkazionVoucher = PremiumVoucher;
export type OkazionPlanQuota = PremiumPlanQuota;

/** Admin view of a credit package (includes management fields). */
export interface AdminCreditPackage {
  id: string;
  credits: number;
  bonusCredits: number;
  priceEur: number;
  labelSq: string;
  badgeSq: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreditPackageInput {
  credits: number;
  bonusCredits: number;
  priceEur: number;
  labelSq: string;
  badgeSq: string;
  active: boolean;
  sortOrder: number;
}

export interface PaymentMetadata {
  contractId?: string | null;
  contractTitle?: string | null;
  months?: number | null;
  creditPackageId?: string | null;
  credits?: number | null;
  subscriptionId?: string | null;
  autoRefreshPackageId?: string | null;
  autoRefreshSlots?: number | null;
  premiumPackageId?: string | null;
  premiumDays?: number | null;
  premiumVoucherId?: string | null;
  okazionPackageId?: string | null;
  okazionDays?: number | null;
  okazionQuantity?: number | null;
  okazionVoucherId?: string | null;
}

export interface Payment {
  id: string;
  type: PaymentType;
  description: string;
  amount: number;
  amountMinor?: number;
  currency: string;
  status: PaymentStatus;
  pokEnv: PokEnv;
  pokOrderId: string | null;
  pokStatus: string | null;
  metadata: PaymentMetadata;
  paidAt: string | null;
  createdAt: string;
}

/** Response when starting a checkout: the order id the POK form needs. */
export interface CreatedOrder {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  credits?: number;
  slots?: number;
  days?: number;
  quantity?: number;
  pokEnv: PokEnv;
}

export interface UserSubscriptionSummary {
  id: string;
  contractId: string | null;
  contractTitle: string;
  planCode: string | null;
  months: number;
  priceEur: number;
  startsAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'canceled';
  glowBadgeEnabled: boolean;
  dailyBoostAccess: boolean;
  boostCreditsGranted: number;
  refreshEveryHours: number | null;
  maxListAllCategories: number;
  maxJobListings: number;
  maxCarListings: number;
  maxApartmentListings: number;
  maxProductListings: number;
  maxPremiumListings: number;
  maxOkazionListings: number;
}

/** Admin view of a payment (includes the payer). */
export interface AdminPayment extends Omit<Payment, 'amountMinor'> {
  payer: { id: string; model: 'IndividualUser' | 'BusinessUser'; email: string; name: string };
  granted: boolean;
}

export interface AdminPaymentsResponse {
  payments: AdminPayment[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  revenueByCurrency: { currency: string; total: number; count: number }[];
}

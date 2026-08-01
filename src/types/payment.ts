export type PaymentType = 'subscription' | 'credits';
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

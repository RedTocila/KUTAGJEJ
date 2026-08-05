import type { ListingCategoryKey } from '@/types/listing-category';
import type { ContractPriceOption } from '@/lib/contract-pricing';

export type ContractSubscriberKind = 'agent' | 'company';
export type ContractPlanCode = 'free' | 'starter' | 'grow' | 'elite';

export interface ContractQuotas {
  maxListAllCategories: number;
  maxJobListings: number;
  maxCarListings: number;
  maxApartmentListings: number;
  maxProductListings: number;
  maxPremiumListings: number;
  maxOkazionListings: number;
}

export interface ContractRoleRef {
  id: string;
  name: string;
}

export interface Contract extends ContractQuotas {
  id: string;
  title: string;
  content: string;
  planCode: ContractPlanCode | null;
  sortOrder: number;
  listingCategoryKey: ListingCategoryKey | null;
  listingCategoryTitle: string | null;
  subscriberKind: ContractSubscriberKind | null;
  refreshEveryHours: number | null;
  glowBadgeEnabled: boolean;
  boostCredits: number | null;
  dailyBoostAccess: boolean;
  /** EUR, per subscription length. */
  price1Month: number | null;
  price3Months: number | null;
  price6Months: number | null;
  price12Months: number | null;
  roles: ContractRoleRef[];
  createdAt?: string;
  updatedAt?: string;
}

/** Public catalog entry (`GET /api/contracts`) — only priced tiers listed in `priceOptions`. */
export interface PublicContract extends ContractQuotas {
  id: string;
  title: string;
  content: string;
  planCode: ContractPlanCode | null;
  sortOrder: number;
  listingCategoryKey: ListingCategoryKey | null;
  listingCategoryTitle: string | null;
  subscriberKind: ContractSubscriberKind | null;
  refreshEveryHours: number | null;
  glowBadgeEnabled: boolean;
  boostCredits: number | null;
  dailyBoostAccess: boolean;
  price1Month: number | null;
  price3Months: number | null;
  price6Months: number | null;
  price12Months: number | null;
  priceOptions: ContractPriceOption[];
}

export const FREE_PLAN_QUOTAS: ContractQuotas = {
  maxListAllCategories: 1,
  maxJobListings: 10,
  maxCarListings: 5,
  maxApartmentListings: 10,
  maxProductListings: 5,
  maxPremiumListings: 0,
  maxOkazionListings: 0,
};

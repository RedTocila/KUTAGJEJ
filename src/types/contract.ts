import type { ListingCategoryKey } from '@/types/listing-category';
import type { ContractPriceOption } from '@/lib/contract-pricing';

export type ContractSubscriberKind = 'agent' | 'company';

export interface ContractRoleRef {
  id: string;
  name: string;
}

export interface Contract {
  id: string;
  title: string;
  content: string;
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
export interface PublicContract {
  id: string;
  title: string;
  content: string;
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

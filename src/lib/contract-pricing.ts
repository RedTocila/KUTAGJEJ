/** Billing slots that can carry a price on a contract. */
export type ContractPriceMonths = 1 | 3 | 6 | 12;

/** Durations offered on the main packages catalog (monthly / 6 months / 12 months). */
export const MAIN_PACKAGE_BILLING_MONTHS = [1, 6, 12] as const;
export type MainPackageBillingMonths = (typeof MAIN_PACKAGE_BILLING_MONTHS)[number];

export function isMainPackageBillingMonths(value: number): value is MainPackageBillingMonths {
  return (MAIN_PACKAGE_BILLING_MONTHS as readonly number[]).includes(value);
}

export interface ContractPriceOption {
  months: ContractPriceMonths;
  /** Short label for end users (Albanian). */
  labelSq: string;
  price: number;
}

export type ContractPricesInput = {
  price1Month?: number | null;
  price3Months?: number | null;
  price6Months?: number | null;
  price12Months?: number | null;
};

/**
 * Only options with a set, valid price — e.g. monthly-only, or monthly + yearly, etc.
 * 1 mo → "Mujore", 12 mo → "Vjetore".
 */
export function getActiveContractPriceOptions(prices: ContractPricesInput): ContractPriceOption[] {
  const out: ContractPriceOption[] = [];
  const p1 = prices.price1Month;
  if (p1 != null && Number.isFinite(Number(p1))) {
    out.push({ months: 1, labelSq: 'Mujore', price: Number(p1) });
  }
  const p3 = prices.price3Months;
  if (p3 != null && Number.isFinite(Number(p3))) {
    out.push({ months: 3, labelSq: '3 muaj', price: Number(p3) });
  }
  const p6 = prices.price6Months;
  if (p6 != null && Number.isFinite(Number(p6))) {
    out.push({ months: 6, labelSq: '6 muaj', price: Number(p6) });
  }
  const p12 = prices.price12Months;
  if (p12 != null && Number.isFinite(Number(p12))) {
    out.push({ months: 12, labelSq: 'Vjetore', price: Number(p12) });
  }
  return out;
}

export function hasAnyContractPrice(prices: ContractPricesInput): boolean {
  return getActiveContractPriceOptions(prices).length > 0;
}

/** Tiered refresh cost — keep in sync with backend/lib/listing-refresh.js */

export const REFRESH_COST_FREE = 1;
export const REFRESH_COST_PREMIUM = 5;
export const REFRESH_COST_OKAZION = 10;

export function refreshCostBc(flags: {
  isOkazion?: boolean;
  isPremium?: boolean;
}): number {
  if (flags.isOkazion) return REFRESH_COST_OKAZION;
  if (flags.isPremium) return REFRESH_COST_PREMIUM;
  return REFRESH_COST_FREE;
}

/** Compact button label: "1BC", "5BC", "10BC". */
export function refreshCostButtonLabel(flags: {
  isOkazion?: boolean;
  isPremium?: boolean;
}): string {
  return `${refreshCostBc(flags)}BC`;
}

/** Accessible label for the bump button. */
export function bumpButtonAriaLabelSq(flags: {
  isOkazion?: boolean;
  isPremium?: boolean;
}): string {
  return `Ngrije në krye · ${refreshCostButtonLabel(flags)}`;
}

/** Albanian tooltip fragment: "kushton X BC" */
export function refreshCostTooltipSq(flags: {
  isOkazion?: boolean;
  isPremium?: boolean;
}): string {
  const cost = refreshCostBc(flags);
  if (flags.isOkazion) {
    return `Vendose njoftimin në krye të OKAZION · kushton ${cost} BC`;
  }
  if (flags.isPremium) {
    return `Vendose njoftimin në krye të Premium · kushton ${cost} BC`;
  }
  return `Vendose njoftimin në krye të listës · kushton ${cost} BC`;
}

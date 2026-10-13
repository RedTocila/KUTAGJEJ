/** Prices shown on the Apple payment sheet for the Albania store (USD). Not the euro catalog. */
const APPLE_SHEET_USD: Record<string, number> = {
  Starter: 10.99,
  Growth: 32.99,
  Pro: 91.99,
  starter: 16.99,
  grow: 71.9,
  elite: 184.99,
  'premium-15': 21.99,
  'premium-30': 32.99,
  'okazion-5': 22.99,
};

/** `USD 10.99`, matching the Apple sheet. */
export function appleSheetUsd(key: string | null | undefined): string | null {
  if (!key) return null;
  const amount = APPLE_SHEET_USD[key];
  if (amount == null) return null;
  return `USD ${amount.toFixed(2)}`;
}

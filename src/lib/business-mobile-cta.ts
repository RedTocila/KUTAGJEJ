/** Primary mobile CTA on business listing detail pages. */
export type BusinessMobileCtaMode = 'contact' | 'reserve' | 'none';

export const BUSINESS_MOBILE_CTA_OPTIONS: Array<{
  value: BusinessMobileCtaMode;
  label: string;
  description: string;
}> = [
  {
    value: 'contact',
    label: 'Kontakto',
    description: 'Butoni “Kontakto” mbi përmbledhje; bëhet sticky kur scrolloni.',
  },
  {
    value: 'reserve',
    label: 'Rezervo',
    description: 'Butoni “Rezervo” hap formularin e rezervimit. Aktivizon rezervimet.',
  },
  {
    value: 'none',
    label: 'Asnjë',
    description: 'Pa buton kryesor në mobile.',
  },
];

export function normalizeBusinessMobileCtaMode(value: unknown): BusinessMobileCtaMode {
  if (value === 'reserve' || value === 'none') return value;
  return 'contact';
}

export function businessMobileCtaLabel(mode: BusinessMobileCtaMode): string {
  return BUSINESS_MOBILE_CTA_OPTIONS.find((option) => option.value === mode)?.label ?? 'Kontakto';
}

export function businessMobileCtaModeFromListing(input: {
  mobileCtaMode?: unknown;
  reservationsEnabled?: boolean;
}): BusinessMobileCtaMode {
  if (input.mobileCtaMode != null) {
    return normalizeBusinessMobileCtaMode(input.mobileCtaMode);
  }
  // Legacy rows before mobile_cta_mode existed.
  return input.reservationsEnabled ? 'contact' : 'contact';
}

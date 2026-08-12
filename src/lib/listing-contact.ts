/** Public listing phone: contact field, then seller profile. */
export function listingDisplayPhone(listing: {
  contactPhone?: string | null;
  seller?: { phone?: string | null } | null;
}): string {
  return (listing.contactPhone ?? listing.seller?.phone ?? '').trim();
}

const ALBANIA_COUNTRY_CODE = '355';

/**
 * Digits for WhatsApp `wa.me` / `tel:+` — international, no `+`, no trunk `0`.
 * Local Albanian numbers (`069 280 8455`, `692808455`) get `355` prepended.
 */
export function phoneDigitsForHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith(ALBANIA_COUNTRY_CODE)) {
    return digits;
  }

  // National format: 0692808455 → 355692808455
  if (digits.startsWith('0')) {
    return `${ALBANIA_COUNTRY_CODE}${digits.slice(1)}`;
  }

  // Mobile without trunk 0: 692808455 → 355692808455
  if (digits.length === 9 && digits.startsWith('6')) {
    return `${ALBANIA_COUNTRY_CODE}${digits}`;
  }

  return digits;
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const compact = phone.replace(/\s/g, '');
  return compact.length >= 6 ? `tel:${compact}` : null;
}

export function whatsappHref(phone: string | null | undefined): string | null {
  const d = phoneDigitsForHref(phone);
  return d ? `https://wa.me/${d}` : null;
}

export function whatsappInquireHref(
  phone: string | null | undefined,
  text?: string | null,
): string | null {
  const base = whatsappHref(phone);
  if (!base) return null;
  const msg = text?.trim();
  return msg ? `${base}?text=${encodeURIComponent(msg)}` : base;
}

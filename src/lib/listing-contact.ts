/** Public listing phone: contact field, then seller profile. */
export function listingDisplayPhone(listing: {
  contactPhone?: string | null;
  seller?: { phone?: string | null } | null;
}): string {
  return (listing.contactPhone ?? listing.seller?.phone ?? '').trim();
}

/** E.164-like digits only for WhatsApp `wa.me` links. */

export function phoneDigitsForHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
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

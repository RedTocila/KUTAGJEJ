import { phoneDigitsForHref, whatsappHref } from '@/lib/listing-contact';

/** Support phone shown in the dashboard contact popup. */
export const SUPPORT_PHONE_DISPLAY = '+355 69 994 4675';

export const SUPPORT_PHONE = SUPPORT_PHONE_DISPLAY;

export function supportCallHref(): string | null {
  const digits = phoneDigitsForHref(SUPPORT_PHONE);
  return digits ? `tel:+${digits}` : null;
}

export function supportWhatsappHref(): string | null {
  return whatsappHref(SUPPORT_PHONE);
}

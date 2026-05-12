/** E.164-like digits only for WhatsApp `wa.me` links. */

export function phoneDigitsForHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

export function whatsappHref(phone: string | null | undefined): string | null {
  const d = phoneDigitsForHref(phone);
  return d ? `https://wa.me/${d}` : null;
}

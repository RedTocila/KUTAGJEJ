import { phoneDigitsForHref, whatsappHref } from '@/lib/listing-contact';

/** Support phone shown in the dashboard contact popup. */
export const SUPPORT_PHONE_DISPLAY = '+355 69 839 3520';

export const SUPPORT_PHONE = SUPPORT_PHONE_DISPLAY;

export function supportCallHref(): string | null {
  const digits = phoneDigitsForHref(SUPPORT_PHONE);
  return digits ? `tel:+${digits}` : null;
}

export function supportWhatsappHref(): string | null {
  return whatsappHref(SUPPORT_PHONE);
}

export type IdentityFieldKind = 'nipt' | 'id';

/** Prefill WhatsApp when a user asks support to change NIPT or ID number. */
export function supportIdentityChangeMessage(
  kind: IdentityFieldKind,
  opts?: { currentValue?: string; email?: string },
): string {
  const fieldLabel = kind === 'nipt' ? 'NIPT-it' : 'numrit të ID-së';
  const lines = [
    `Përshëndetje, jam përdorues i KuTaGjej dhe do të kërkoj ndryshimin e ${fieldLabel}.`,
  ];
  if (opts?.currentValue?.trim()) {
    lines.push(`${kind === 'nipt' ? 'NIPT' : 'ID'} aktual: ${opts.currentValue.trim()}`);
  }
  if (opts?.email?.trim()) {
    lines.push(`Email i llogarisë: ${opts.email.trim()}`);
  }
  lines.push('Ju lutem më ndihmoni ta përditësoj.');
  return lines.join('\n');
}

export function supportIdentityChangeWhatsappHref(
  kind: IdentityFieldKind,
  opts?: { currentValue?: string; email?: string },
): string | null {
  const base = supportWhatsappHref();
  if (!base) return null;
  const text = supportIdentityChangeMessage(kind, opts);
  return `${base}?text=${encodeURIComponent(text)}`;
}

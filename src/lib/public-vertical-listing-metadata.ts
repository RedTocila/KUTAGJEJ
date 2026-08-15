import type { Metadata } from 'next';

import { brandLogoSrc, config } from '@/config';

type SocialOgImage = { url: string; alt: string; type?: string; width?: number; height?: number };

function siteOrigin(): string {
  return config.site.url.replace(/\/$/, '');
}

export function toAbsoluteAssetUrl(raw: string | null | undefined): string | null {
  const url = String(raw || '').trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = siteOrigin();
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

/** Absolute brand logo URL for OG / Twitter (favicon + site identity in link previews). */
export function brandOgImageUrl(): string {
  return `${siteOrigin()}${brandLogoSrc}`;
}

/** Favicon / apple-touch links so WhatsApp shows the KuTaGjej icon next to the domain. */
export function brandIconMetadata(): NonNullable<Metadata['icons']> {
  const logo = brandOgImageUrl();
  return {
    icon: [
      { url: logo, type: 'image/png', sizes: '1024x1024' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: logo,
  };
}

/**
 * Social preview images: first gallery photo as og:image (WhatsApp card),
 * falling back to the KuTaGjej logo when the listing has no photos.
 */
export function listingSocialImages(
  imageUrls: readonly string[] | null | undefined,
  imageUrl?: string | null,
  alt = config.site.name,
): SocialOgImage[] {
  const firstListing =
    (imageUrls ?? []).map((u) => String(u || '').trim()).find(Boolean) ||
    String(imageUrl || '').trim() ||
    '';
  const abs = toAbsoluteAssetUrl(firstListing);
  if (abs) return [{ url: abs, alt }];
  return [{ url: brandOgImageUrl(), alt: config.site.name, type: 'image/png', width: 1024, height: 1024 }];
}

/** Shared SEO helpers for makina/pune/tregu/biznese/profesioniste detail routes. */
export function buildVerticalListingDetailMetadata(opts: {
  title: string;
  descriptionSnippet: string;
  pathHref: string;
  /** Listing gallery URLs (first becomes primary og:image). */
  imageUrls?: readonly string[] | null;
  imageUrl?: string | null;
}): Metadata {
  const canon = opts.pathHref.startsWith('/') ? opts.pathHref : `/${opts.pathHref}`;
  const desc = opts.descriptionSnippet.replace(/\s+/g, ' ').trim().slice(0, 160);
  const url = `${siteOrigin()}${canon}`;
  const images = listingSocialImages(opts.imageUrls, opts.imageUrl, opts.title);
  const primaryImage = images[0]?.url;

  return {
    title: opts.title,
    description: desc || opts.title,
    alternates: { canonical: canon },
    icons: brandIconMetadata(),
    openGraph: {
      title: `${opts.title} | ${config.site.name}`,
      description: desc || opts.title,
      url,
      type: 'website',
      locale: 'sq_AL',
      siteName: config.site.name,
      images,
    },
    twitter: {
      card: primaryImage ? 'summary_large_image' : 'summary',
      title: `${opts.title} | ${config.site.name}`,
      description: desc || opts.title,
      images: primaryImage ? [primaryImage] : undefined,
    },
  };
}

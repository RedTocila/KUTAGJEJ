import type { Metadata } from 'next';

import { brandLogoSrc, config } from '@/config';

type SocialOgImage = { url: string; alt: string };

/** Absolute brand logo URL for OG / Twitter (favicon + site identity in link previews). */
export function brandOgImageUrl(): string {
  return `${config.site.url.replace(/\/$/, '')}${brandLogoSrc}`;
}

/**
 * Primary listing photo(s) for social previews, with KuTaGjej logo always included
 * so chats/crawlers show the listing image and brand favicon/logo together.
 */
export function listingSocialImages(
  imageUrls: readonly string[] | null | undefined,
  imageUrl?: string | null,
  alt = config.site.name,
): SocialOgImage[] {
  const seen = new Set<string>();
  const out: SocialOgImage[] = [];

  const push = (raw: string | null | undefined, imageAlt: string) => {
    const url = String(raw || '').trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ url, alt: imageAlt });
  };

  for (const u of imageUrls ?? []) push(u, alt);
  push(imageUrl, alt);
  // Brand logo / favicon — second image so WhatsApp/iMessage keep the listing photo primary.
  push(brandOgImageUrl(), config.site.name);

  return out;
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
  const url = `${config.site.url.replace(/\/$/, '')}${canon}`;
  const images = listingSocialImages(opts.imageUrls, opts.imageUrl, opts.title);
  const primaryImage = images[0]?.url;

  return {
    title: opts.title,
    description: desc || opts.title,
    alternates: { canonical: canon },
    openGraph: {
      title: `${opts.title} | ${config.site.name}`,
      description: desc || opts.title,
      url,
      type: 'website',
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

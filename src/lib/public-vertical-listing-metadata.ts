import type { Metadata } from 'next';

import { config } from '@/config';

/** Shared SEO helpers for makina/pune/tregu/biznese/profesioniste detail routes. */
export function buildVerticalListingDetailMetadata(opts: {
  title: string;
  descriptionSnippet: string;
  pathHref: string;
}): Metadata {
  const canon = opts.pathHref.startsWith('/') ? opts.pathHref : `/${opts.pathHref}`;
  const desc = opts.descriptionSnippet.replace(/\s+/g, ' ').trim().slice(0, 160);
  const url = `${config.site.url.replace(/\/$/, '')}${canon}`;
  return {
    title: opts.title,
    description: desc || opts.title,
    alternates: { canonical: canon },
    openGraph: {
      title: `${opts.title} | ${config.site.name}`,
      description: desc || opts.title,
      url,
      type: 'website',
    },
  };
}

import type { MetadataRoute } from 'next';

import { config } from '@/config';
import { paths } from '@/paths';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = config.site.url.replace(/\/$/, '');
  const now = new Date();
  return [
    { url: `${base}${paths.home}`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}${paths.public.realEstate}`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}${paths.public.cars}`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}${paths.public.jobs}`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}${paths.public.marketplace}`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}${paths.public.about}`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}${paths.public.contact}`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}${paths.public.terms}`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}${paths.public.privacy}`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}

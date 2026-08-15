import type { MetadataRoute } from 'next';

import { config } from '@/config';

export default function robots(): MetadataRoute.Robots {
  const base = config.site.url.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/user/dashboard', '/auth', '/user/auth'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

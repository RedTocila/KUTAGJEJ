import type { MetadataRoute } from 'next';

import { config } from '@/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/user/dashboard', '/auth', '/user/auth'],
      },
    ],
    sitemap: `${config.site.url}/sitemap.xml`,
    host: config.site.url,
  };
}

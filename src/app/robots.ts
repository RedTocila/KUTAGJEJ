import type { MetadataRoute } from 'next';

import { config } from '@/config';

const DISALLOW = ['/dashboard', '/user/dashboard', '/auth', '/user/auth'] as const;

/** Explicit AI search / assistant crawlers (also covered by `*`, listed for clarity). */
const AI_SEARCH_BOTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'Google-Extended',
  'ClaudeBot',
  'Anthropic-AI',
  'PerplexityBot',
  'Applebot-Extended',
] as const;

export default function robots(): MetadataRoute.Robots {
  const base = config.site.url.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...DISALLOW],
      },
      ...AI_SEARCH_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: [...DISALLOW],
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

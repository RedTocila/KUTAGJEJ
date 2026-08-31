import { config } from '@/config';
import { fetchPublicSeoIndex } from '@/lib/public-seo';

const SITEMAP_PAGE_SIZE = 45_000;

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sitemapEntries(index: Awaited<ReturnType<typeof fetchPublicSeoIndex>>) {
  const base = config.site.url.replace(/\/$/, '');
  const staticPaths = [
    '/',
    '/prona',
    '/makina',
    '/pune',
    '/tregu',
    '/biznese',
    '/profesioniste',
    '/okazion',
    '/anetares',
    '/rreth-nesh',
    '/kontakt',
    '/kushtet',
    '/privatesia',
  ];
  return [
    ...staticPaths.map((path) => ({ url: `${base}${path}`, lastModified: new Date() })),
    ...(index?.landings || []).map((entry) => ({
      url: `${base}${entry.path}`,
      lastModified: new Date(entry.lastModified),
    })),
    ...(index?.listings || []).map((entry) => ({
      url: `${base}${entry.path}`,
      lastModified: new Date(entry.lastModified),
    })),
  ];
}

export const revalidate = 600;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const index = await fetchPublicSeoIndex();
  const page = Number.parseInt((await context.params).id, 10);
  const entries = sitemapEntries(index);
  const start = Number.isFinite(page) && page >= 0 ? page * SITEMAP_PAGE_SIZE : 0;
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries
      .slice(start, start + SITEMAP_PAGE_SIZE)
      .map(
        (entry) => `<url><loc>${xmlEscape(entry.url)}</loc><lastmod>${entry.lastModified.toISOString()}</lastmod></url>`
      ),
    '</urlset>',
  ].join('');
  return new Response(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

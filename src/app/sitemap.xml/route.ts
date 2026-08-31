import { config } from '@/config';
import { fetchPublicSeoIndex } from '@/lib/public-seo';

const SITEMAP_PAGE_SIZE = 45_000;

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const revalidate = 600;

export async function GET(): Promise<Response> {
  const index = await fetchPublicSeoIndex();
  const count = 13 + (index?.landings.length || 0) + (index?.listings.length || 0);
  const pageCount = Math.max(1, Math.ceil(count / SITEMAP_PAGE_SIZE));
  const base = config.site.url.replace(/\/$/, '');
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Array.from(
      { length: pageCount },
      (_, id) => `<sitemap><loc>${xmlEscape(`${base}/sitemap/${id}.xml`)}</loc></sitemap>`
    ),
    '</sitemapindex>',
  ].join('');
  return new Response(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}

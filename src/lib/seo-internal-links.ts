import type { HomeVerticalId } from '@/lib/home-categories';
import { HOME_VERTICALS } from '@/lib/home-categories';
import { seoSlug, type SeoVertical } from '@/lib/public-seo';
import { paths, pathsPublicLocationLanding } from '@/paths';

const VERTICAL_TO_SEO: Record<HomeVerticalId, SeoVertical> = {
  'real-estate': 'real-estate',
  cars: 'cars',
  jobs: 'jobs',
  marketplace: 'marketplace',
  businesses: 'businesses',
  professionals: 'professionals',
};

/** Popular city hubs for footer / SEO internal links (slug matches landing resolver). */
export const SEO_HUB_CITIES = [
  { name: 'Tiranë', slug: 'tirane' },
  { name: 'Durrës', slug: 'durres' },
  { name: 'Vlorë', slug: 'vlore' },
  { name: 'Shkodër', slug: 'shkoder' },
  { name: 'Elbasan', slug: 'elbasan' },
  { name: 'Fier', slug: 'fier' },
] as const;

export function verticalPublicBase(vertical: HomeVerticalId | SeoVertical): string {
  const id = vertical as HomeVerticalId;
  return HOME_VERTICALS.find((v) => v.id === id)?.href || paths.public.realEstate;
}

/** City landing URL from display name (matches `cityForSegment` slug/name rules). */
export function cityLandingHref(
  vertical: HomeVerticalId | SeoVertical,
  cityNameOrSlug: string | null | undefined,
  categorySlug?: string,
  transactionSlug?: string,
): string | null {
  const raw = String(cityNameOrSlug || '').trim();
  if (!raw) return null;
  const slug = seoSlug(raw);
  if (!slug) return null;
  return pathsPublicLocationLanding(verticalPublicBase(vertical), slug, categorySlug, transactionSlug);
}

export function listingInternalLinks(opts: {
  vertical: HomeVerticalId;
  cityName?: string | null;
  categorySlug?: string | null;
  transactionSlug?: string | null;
}): Array<{ href: string; label: string }> {
  const base = verticalPublicBase(opts.vertical);
  const verticalLabel = HOME_VERTICALS.find((v) => v.id === opts.vertical)?.label || 'Kategoria';
  const links: Array<{ href: string; label: string }> = [{ href: base, label: `Të gjitha — ${verticalLabel}` }];

  const cityHref = cityLandingHref(opts.vertical, opts.cityName);
  if (cityHref && opts.cityName) {
    links.push({ href: cityHref, label: `${verticalLabel} në ${opts.cityName}` });
  }

  if (opts.cityName && opts.categorySlug) {
    const catHref = cityLandingHref(opts.vertical, opts.cityName, opts.categorySlug, opts.transactionSlug || undefined);
    if (catHref) {
      links.push({ href: catHref, label: 'Kategoria në këtë qytet' });
    }
  }

  // Cross-vertical city hubs (top markets)
  const citySlug = opts.cityName ? seoSlug(opts.cityName) : '';
  if (citySlug) {
    for (const v of HOME_VERTICALS) {
      if (v.id === opts.vertical) continue;
      if (links.length >= 6) break;
      links.push({
        href: pathsPublicLocationLanding(v.href, citySlug),
        label: `${v.label} në ${opts.cityName}`,
      });
    }
  }

  return links;
}

export function footerCityHubLinks(vertical: HomeVerticalId = 'real-estate'): Array<{ href: string; label: string }> {
  const base = verticalPublicBase(vertical);
  return SEO_HUB_CITIES.map((city) => ({
    href: pathsPublicLocationLanding(base, city.slug),
    label: city.name,
  }));
}

export { VERTICAL_TO_SEO };

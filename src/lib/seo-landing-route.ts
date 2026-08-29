import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { renderSeoLandingPage } from '@/components/public/seo-landing-page';
import {
  loadSeoLandingRoute,
  seoLandingMetadata,
  type SeoVertical,
} from '@/lib/public-seo';

export async function generateSeoRouteMetadata(
  vertical: SeoVertical,
  segments: string[],
  hasQuery = false,
): Promise<Metadata> {
  const route = await loadSeoLandingRoute(vertical, segments);
  if (!route.config) notFound();
  const metadata = seoLandingMetadata(
    route.config,
    route.result?.total ?? 0,
    Boolean(!hasQuery && route.result?.ok && (route.result?.total ?? 0) >= 3),
  );
  return metadata;
}

export async function renderSeoRoute(vertical: SeoVertical, segments: string[]) {
  const route = await loadSeoLandingRoute(vertical, segments);
  if (!route.config) notFound();
  return renderSeoLandingPage(route.config, route.cities);
}

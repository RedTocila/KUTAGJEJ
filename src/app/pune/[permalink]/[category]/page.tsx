import type { Metadata } from 'next';

import { generateSeoRouteMetadata, renderSeoRoute } from '@/lib/seo-landing-route';

type PageProps = {
  params: Promise<{ permalink: string; category: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { permalink, category } = await params;
  return generateSeoRouteMetadata(
    'jobs',
    [permalink, category],
    Object.keys((await searchParams) ?? {}).length > 0,
  );
}

export default async function JobsCategoryLanding({ params }: PageProps) {
  const { permalink, category } = await params;
  return renderSeoRoute('jobs', [permalink, category]);
}

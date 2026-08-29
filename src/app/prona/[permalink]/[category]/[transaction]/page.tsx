import type { Metadata } from 'next';

import { generateSeoRouteMetadata, renderSeoRoute } from '@/lib/seo-landing-route';

type PageProps = {
  params: Promise<{ permalink: string; category: string; transaction: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { permalink, category, transaction } = await params;
  return generateSeoRouteMetadata(
    'real-estate',
    [permalink, category, transaction],
    Object.keys((await searchParams) ?? {}).length > 0,
  );
}

export default async function RealEstateTransactionLanding({ params }: PageProps) {
  const { permalink, category, transaction } = await params;
  return renderSeoRoute('real-estate', [permalink, category, transaction]);
}

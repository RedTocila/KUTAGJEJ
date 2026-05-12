import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { paths, pathsPublicVerticalListingDetail } from '@/paths';

type PageProps = { params: Promise<{ permalink: string }> };

/** Listing detail canon lives under `/makina/`; keep `/automjete/` as a redirect alias. */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { permalink } = await params;
  const canon = pathsPublicVerticalListingDetail(paths.public.cars, permalink);
  return {
    robots: { index: false, follow: true },
    alternates: { canonical: canon },
  };
}

export default async function AutomjeteListingRedirect({ params }: PageProps): Promise<never> {
  const { permalink } = await params;
  redirect(pathsPublicVerticalListingDetail(paths.public.cars, permalink));
}

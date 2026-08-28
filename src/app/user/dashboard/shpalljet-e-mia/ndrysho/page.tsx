'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Stack } from '@mui/material';

import { ContentBlockSkeleton } from '@/components/core/content-skeletons';
import { BusinessOwnerEdit } from '@/components/user/owner-edit/business-owner-edit';
import { CarOwnerEdit } from '@/components/user/owner-edit/car-owner-edit';
import { JobOwnerEdit } from '@/components/user/owner-edit/job-owner-edit';
import { MarketplaceOwnerEdit } from '@/components/user/owner-edit/marketplace-owner-edit';
import { ProfessionalOwnerEdit } from '@/components/user/owner-edit/professional-owner-edit';
import { RealEstateOwnerEdit } from '@/components/user/owner-edit/real-estate-owner-edit';
import { useUser } from '@/hooks/use-user';
import {
  getMyBusinessListing,
  getMyProfessionalListing,
  type BusinessMineListing,
  type ProfessionalMineListing,
} from '@/lib/directory-listings-client';
import {
  getMyCarListing,
  getMyJobListing,
  getMyMarketplaceListing,
  getMyRealEstateListing,
  type CarMineListing,
  type JobMineListing,
  type MarketplaceMineListing,
} from '@/lib/listings-client';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { paths } from '@/paths';

type EditKind = 'real-estate' | 'car' | 'job' | 'marketplace' | 'businesses' | 'professionals';

function parseKind(raw: string | null): EditKind | null {
  if (
    raw === 'real-estate' ||
    raw === 'car' ||
    raw === 'job' ||
    raw === 'marketplace' ||
    raw === 'businesses' ||
    raw === 'professionals'
  ) {
    return raw;
  }
  return null;
}

export default function EditListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const kind = parseKind(searchParams.get('kind'));
  const listingId = String(searchParams.get('id') || '').trim();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reListing, setReListing] = React.useState<RealEstateMineListing | null>(null);
  const [carListing, setCarListing] = React.useState<CarMineListing | null>(null);
  const [jobListing, setJobListing] = React.useState<JobMineListing | null>(null);
  const [mktListing, setMktListing] = React.useState<MarketplaceMineListing | null>(null);
  const [bizListing, setBizListing] = React.useState<BusinessMineListing | null>(null);
  const [proListing, setProListing] = React.useState<ProfessionalMineListing | null>(null);

  const canView =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (!user) return;
    if (!canView) router.replace(paths.user.dashboard);
  }, [user, canView, router]);

  React.useEffect(() => {
    if (!user?.id || !canView) return;
    if (!kind || !listingId) {
      setError('Njoftimi për ndryshim nuk është i vlefshëm.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const fail = (message: string) => {
        setError(message);
      };

      if (kind === 'real-estate') {
        const res = await getMyRealEstateListing(listingId);
        if (cancelled) return;
        if (res.error || !res.listing) fail(res.error ?? 'Njoftimi nuk u gjet.');
        else setReListing(res.listing);
      } else if (kind === 'car') {
        const res = await getMyCarListing(listingId);
        if (cancelled) return;
        if (res.error || !res.listing) fail(res.error ?? 'Njoftimi nuk u gjet.');
        else setCarListing(res.listing);
      } else if (kind === 'job') {
        const res = await getMyJobListing(listingId);
        if (cancelled) return;
        if (res.error || !res.listing) fail(res.error ?? 'Njoftimi nuk u gjet.');
        else setJobListing(res.listing);
      } else if (kind === 'marketplace') {
        const res = await getMyMarketplaceListing(listingId);
        if (cancelled) return;
        if (res.error || !res.listing) fail(res.error ?? 'Njoftimi nuk u gjet.');
        else setMktListing(res.listing);
      } else if (kind === 'businesses') {
        const res = await getMyBusinessListing(listingId);
        if (cancelled) return;
        if (res.error || !res.listing) fail(res.error ?? 'Njoftimi nuk u gjet.');
        else setBizListing(res.listing);
      } else {
        const res = await getMyProfessionalListing(listingId);
        if (cancelled) return;
        if (res.error || !res.listing) fail(res.error ?? 'Njoftimi nuk u gjet.');
        else setProListing(res.listing);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, canView, kind, listingId]);

  if (!user || !canView) return null;

  return (
    <Stack spacing={2}>
      {loading ? (
        <ContentBlockSkeleton rows={5} rowHeight={120} />
      ) : error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : (
        <>
          {kind === 'real-estate' && reListing ? <RealEstateOwnerEdit initial={reListing} /> : null}
          {kind === 'car' && carListing ? <CarOwnerEdit initial={carListing} /> : null}
          {kind === 'job' && jobListing ? <JobOwnerEdit initial={jobListing} /> : null}
          {kind === 'marketplace' && mktListing ? <MarketplaceOwnerEdit initial={mktListing} /> : null}
          {kind === 'businesses' && bizListing ? <BusinessOwnerEdit initial={bizListing} /> : null}
          {kind === 'professionals' && proListing ? <ProfessionalOwnerEdit initial={proListing} /> : null}
        </>
      )}
    </Stack>
  );
}

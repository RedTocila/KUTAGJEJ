'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Stack, Typography } from '@mui/material';
import { ForkKnife as ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';

import { BusinessMenuEditor } from '@/components/businesses/business-menu-editor';
import { ContentBlockSkeleton } from '@/components/core/content-skeletons';
import { PostListingHeader } from '@/components/user/post-listing-header';
import { BusinessAccountRequiredNotice } from '@/components/user/business-account-required-notice';
import { useUser } from '@/hooks/use-user';
import {
  listMyBusinessListings,
  type BusinessMineListing,
} from '@/lib/directory-listings-client';
import { isBusinessPortalAccount } from '@/lib/user-portal-account-label';
import { paths } from '@/paths';

export default function BusinessMenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const listingId = String(searchParams.get('id') || '').trim();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [listing, setListing] = React.useState<BusinessMineListing | null>(null);

  const canEdit = Boolean(user) && isBusinessPortalAccount(user);

  React.useEffect(() => {
    if (!user) return;
    if (!canEdit) router.replace(paths.user.dashboard);
  }, [user, canEdit, router]);

  React.useEffect(() => {
    if (!user?.id || !canEdit) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void listMyBusinessListings().then((res) => {
      if (cancelled) return;
      if (res.error) {
        setError(res.error);
        setListing(null);
        setLoading(false);
        return;
      }
      const listings = res.listings ?? [];
      const found = listingId
        ? listings.find((l) => l.id === listingId) ?? null
        : listings[0] ?? null;
      if (!found) {
        setError(
          listings.length === 0
            ? 'Nuk keni ende një profil biznesi. Krijojeni së pari, pastaj shtoni menunë.'
            : 'Profili i biznesit nuk u gjet.',
        );
      }
      setListing(found);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, canEdit, listingId]);

  if (!user) return null;
  if (!canEdit) {
    return (
      <Stack spacing={2}>
        <BusinessAccountRequiredNotice />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <PostListingHeader
        icon={ForkKnifeIcon}
        title="Menu e biznesit"
        description="Shtoni artikuj manualisht, ose importoni nga foto me AI."
        closeHref={paths.user.myRealEstateListings}
      />

      {loading ? (
        <ContentBlockSkeleton rows={6} rowHeight={72} />
      ) : error && !listing ? (
        <Alert severity="warning">{error}</Alert>
      ) : listing ? (
        <BusinessMenuEditor listing={listing} />
      ) : (
        <Typography color="text.secondary">Nuk ka asgjë për të shfaqur.</Typography>
      )}
    </Stack>
  );
}

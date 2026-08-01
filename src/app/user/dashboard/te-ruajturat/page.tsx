'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { BookmarkSimple as BookmarkIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';

import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { useSavedListings } from '@/contexts/saved-listings-context';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { fetchSavedListings, listingMetricsKey, type ListingMetricKind, type SavedListingItem } from '@/lib/listing-metrics';
import type { PublicCarListing, PublicDirectoryListing, PublicJobListing, PublicMarketplaceListing, PublicRealEstateListing } from '@/lib/public-listings-client';
import { paths } from '@/paths';
import { useUser } from '@/hooks/use-user';

const KIND_TABS: { value: 'all' | ListingMetricKind; label: string }[] = [
  { value: 'all', label: 'Të gjitha' },
  { value: 'real-estate', label: 'Prona' },
  { value: 'car', label: 'Makina' },
  { value: 'job', label: 'Punë' },
  { value: 'marketplace', label: 'Tregu' },
  { value: 'businesses', label: 'Biznese' },
  { value: 'professionals', label: 'Profesionistë' },
];

function SavedListingCard({ item }: { item: SavedListingItem }) {
  const listing = item.listing;
  switch (item.kind) {
    case 'real-estate':
      return <RealEstateCard listing={listing as unknown as PublicRealEstateListing} />;
    case 'car':
      return <CarCard listing={listing as unknown as PublicCarListing} />;
    case 'job':
      return <JobCard listing={listing as unknown as PublicJobListing} />;
    case 'marketplace':
      return <MarketplaceCard listing={listing as unknown as PublicMarketplaceListing} />;
    case 'businesses':
    case 'professionals':
      return <DirectoryListingCard listing={listing as unknown as PublicDirectoryListing} />;
    default:
      return null;
  }
}

export default function UserSavedListingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { refresh: refreshKeys, keys } = useSavedListings();
  const [items, setItems] = React.useState<SavedListingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState(0);

  const canView =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchSavedListings(1, 48);
    if (res.error) {
      setError(res.error);
      setItems([]);
    } else {
      setItems(res.items ?? []);
      await refreshKeys();
    }
    setLoading(false);
  }, [refreshKeys]);

  React.useEffect(() => {
    if (!user) return;
    if (!canView) {
      router.replace(paths.user.dashboard);
      return;
    }
    void load();
  }, [user, canView, router, load]);

  if (!user || !canView) return null;

  const activeKind = KIND_TABS[tab]?.value ?? 'all';
  const visibleItems = items.filter((item) => keys.has(listingMetricsKey(item.kind, item.listingId)));
  const filtered =
    activeKind === 'all' ? visibleItems : visibleItems.filter((item) => item.kind === activeKind);

  const counts = KIND_TABS.map((t) =>
    t.value === 'all' ? visibleItems.length : visibleItems.filter((i) => i.kind === t.value).length,
  );

  const emptyMessage =
    items.length === 0
      ? 'Nuk keni ruajtur asnjë njoftim ende. Prekni ikonën e bookmark-ut në një njoftim për ta shtuar këtu.'
      : visibleItems.length === 0
        ? 'Nuk keni njoftime të ruajtura aktive (mund të jenë hequr nga platforma).'
        : 'Nuk ka njoftime të ruajtura për këtë kategori.';

  return (
    <Stack spacing={{ xs: 2.5, md: 3 }}>
      <UserPageHeader
        icon={<BookmarkIcon size={20} weight="duotone" />}
        title="Të ruajturat"
        description="Njoftimet që keni ruajtur me ikonën e bookmark-ut."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box
        role="tablist"
        aria-label="Filtro sipas kategorisë"
        sx={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          mx: { xs: -0.5, md: 0 },
          px: { xs: 0.5, md: 0 },
        }}
      >
        <Stack direction="row" spacing={1} sx={{ width: 'max-content', pr: { xs: 1, md: 0 } }}>
          {KIND_TABS.map((t, i) => {
            const active = tab === i;
            const count = counts[i];
            return (
              <Box
                key={t.value}
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(i)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.85,
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  bgcolor: active ? primaryMainAlpha(0.12) : 'background.paper',
                  color: active ? 'primary.main' : 'text.primary',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: primaryMainAlpha(0.08),
                  },
                }}
              >
                {t.label}
                {!loading && count > 0 ? (
                  <Box
                    component="span"
                    sx={{
                      minWidth: 20,
                      height: 20,
                      px: 0.5,
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: active ? primaryMainAlpha(0.2) : 'action.hover',
                      color: active ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {count}
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Stack>
      </Box>

      {loading ? (
        <Grid container spacing={2}>
          {[0, 1, 2].map((k) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={k}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'transparent',
          }}
        >
          <CardContent sx={{ py: { xs: 5, md: 6 }, px: 3, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: primaryMainAlpha(0.1),
                color: 'primary.main',
                mb: 2,
              }}
            >
              <BookmarkIcon size={28} weight="duotone" />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
              Asnjë njoftim i ruajtur
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
              {emptyMessage}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((item) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={`${item.kind}-${item.listingId}`}>
              <SavedListingCard item={item} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

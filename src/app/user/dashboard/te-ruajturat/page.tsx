'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { BookmarkSimple as BookmarkIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';

import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { useSavedListings } from '@/contexts/saved-listings-context';
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

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between', gap: 2 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <BookmarkIcon size={28} weight="duotone" />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Të ruajturat
            </Typography>
          </Stack>
          <Typography variant="body1" color="text.secondary">
            Njoftimet që keni ruajtur me ikonën e bookmark-ut në platformë.
          </Typography>
        </Stack>
        <Button variant="outlined" onClick={() => void load()} disabled={loading}>
          Rifresko
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {KIND_TABS.map((t, i) => (
            <Tab
              key={t.value}
              label={
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <span>{t.label}</span>
                  {!loading && counts[i] > 0 ? (
                    <Chip size="small" label={counts[i]} sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700 }} />
                  ) : null}
                </Stack>
              }
            />
          ))}
        </Tabs>
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
        <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {items.length === 0
                ? 'Nuk keni ruajtur asnjë njoftim ende. Prekni ikonën e bookmark-ut në një njoftim për ta shtuar këtu.'
                : visibleItems.length === 0
                  ? 'Nuk keni njoftime të ruajtura aktive (mund të jenë hequr nga platforma).'
                  : 'Nuk ka njoftime të ruajtura për këtë kategori.'}
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

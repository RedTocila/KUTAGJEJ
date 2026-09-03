'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { BookmarkSimple as BookmarkIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';

import { paths } from '@/paths';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import {
  fetchSavedListings,
  getCachedSavedListings,
  listingMetricsKey,
  type ListingMetricKind,
  type SavedListingItem,
} from '@/lib/listing-metrics';
import type {
  PublicCarListing,
  PublicDirectoryListing,
  PublicJobListing,
  PublicMarketplaceListing,
  PublicRealEstateListing,
} from '@/lib/public-listings-client';
import { useSavedListings } from '@/contexts/saved-listings-context';
import { useCopy } from '@/hooks/use-copy';
import { useRegisterTabRefresh } from '@/hooks/use-tab-refresh';
import { useUser } from '@/hooks/use-user';
import { TransientNotification } from '@/components/core/transient-success-alert';
import { CarCard } from '@/components/public/listing-cards/car-card';
import { LISTING_CARD_BROWSE_MEDIA_HEIGHT } from '@/components/public/listing-cards/card-media';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { UserPageHeader } from '@/components/user/layout/user-page-header';

const SAVED_PAGE_SIZE = 24;

function SavedListingCard({ item }: { item: SavedListingItem }) {
  const listing = item.listing;
  switch (item.kind) {
    case 'real-estate':
      return <RealEstateCard listing={listing as unknown as PublicRealEstateListing} variant="browse" />;
    case 'car':
      return <CarCard listing={listing as unknown as PublicCarListing} variant="browse" />;
    case 'job':
      return <JobCard listing={listing as unknown as PublicJobListing} variant="browse" />;
    case 'marketplace':
      return <MarketplaceCard listing={listing as unknown as PublicMarketplaceListing} variant="browse" />;
    case 'businesses':
    case 'professionals':
      return (
        <DirectoryListingCard
          listing={listing as unknown as PublicDirectoryListing}
          variant="browse"
          showActionCounts
        />
      );
    default:
      return null;
  }
}

export function SavedListingsView() {
  const router = useRouter();
  const { user } = useUser();
  const t = useCopy();
  const { hydrateKeys, keys } = useSavedListings();
  const cached = getCachedSavedListings();
  const paintedRef = React.useRef(Boolean(cached));
  const [items, setItems] = React.useState<SavedListingItem[]>(() => cached?.items ?? []);
  const [loading, setLoading] = React.useState(() => !cached);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState(0);
  const [page, setPage] = React.useState(() => cached?.page ?? 1);
  const [totalPages, setTotalPages] = React.useState(() => cached?.totalPages ?? 1);

  React.useEffect(() => {
    if (cached?.keys?.length) hydrateKeys(cached.keys);
    // Cache hydration is first-paint only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kindTabs: { value: 'all' | ListingMetricKind; label: string }[] = [
    { value: 'all', label: t.saved.all },
    { value: 'real-estate', label: t.verticals['real-estate'].label },
    { value: 'car', label: t.verticals.cars.label },
    { value: 'job', label: t.verticals.jobs.label },
    { value: 'marketplace', label: t.verticals.marketplace.label },
    { value: 'businesses', label: t.verticals.businesses.label },
    { value: 'professionals', label: t.verticals.professionals.label },
  ];

  const canView =
    Boolean(user) &&
    (user?.accountType === 'individual' || user?.accountType === 'business' || user?.role === 'business-user');

  const loadPage = React.useCallback(
    async (nextPage: number, append: boolean) => {
      const hasPainted = paintedRef.current;
      if (append) setLoadingMore(true);
      else {
        if (!hasPainted) setLoading(true);
        setError(null);
      }
      const res = await fetchSavedListings(nextPage, SAVED_PAGE_SIZE);
      if (res.error) {
        if (!append && !hasPainted) {
          setError(res.error);
          setItems([]);
        }
      } else {
        paintedRef.current = true;
        setItems((prev) => (append ? [...prev, ...(res.items ?? [])] : (res.items ?? [])));
        setPage(res.page ?? nextPage);
        setTotalPages(res.totalPages ?? 1);
        if (res.keys) hydrateKeys(res.keys);
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [hydrateKeys]
  );

  React.useEffect(() => {
    if (!user) return;
    if (!canView) {
      router.replace(paths.user.dashboard);
      return;
    }
    void loadPage(1, false);
  }, [user, canView, router, loadPage]);

  useRegisterTabRefresh('saved', () => loadPage(1, false));

  if (user && !canView) return null;
  if (!user && items.length === 0) return null;

  const activeKind = kindTabs[tab]?.value ?? 'all';
  const visibleItems = items.filter((item) => keys.has(listingMetricsKey(item.kind, item.listingId)));
  const filtered = activeKind === 'all' ? visibleItems : visibleItems.filter((item) => item.kind === activeKind);

  const counts = kindTabs.map((kindTab) =>
    kindTab.value === 'all' ? visibleItems.length : visibleItems.filter((i) => i.kind === kindTab.value).length
  );

  const emptyMessage =
    items.length === 0 ? t.saved.emptyNone : visibleItems.length === 0 ? t.saved.emptyInactive : t.saved.emptyCategory;

  const canLoadMore = page < totalPages;

  return (
    <Stack spacing={{ xs: 2.5, md: 3 }}>
      <UserPageHeader
        icon={<BookmarkIcon size={20} weight="duotone" />}
        title={t.saved.title}
        description={t.saved.description}
        sx={{
          // Match messages: title only on mobile; keep icon + description on desktop.
          '& .MuiTypography-body2': { display: { xs: 'none', md: 'block' } },
          '& > .MuiBox-root': { display: { xs: 'none', md: 'inline-flex' } },
          '& .MuiTypography-h5': {
            fontSize: { xs: '1.65rem', md: undefined },
            fontWeight: { xs: 700, md: 800 },
          },
        }}
      />

      {error ? <TransientNotification severity="error" message={error} onDismiss={() => setError(null)} /> : null}

      <Box
        role="tablist"
        aria-label={t.saved.filterAria}
        data-no-tab-swipe
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
          {kindTabs.map((kindTab, i) => {
            const active = tab === i;
            const count = counts[i];
            return (
              <Box
                key={kindTab.value}
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
                  border: 'none',
                  bgcolor: active ? primaryMainAlpha(0.12) : '#2a2a2a',
                  color: active ? 'primary.main' : 'text.primary',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': {
                    color: 'primary.main',
                    bgcolor: primaryMainAlpha(0.08),
                  },
                }}
              >
                {kindTab.label}
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
        <Grid container spacing={{ xs: 2, md: 2.5 }}>
          {[0, 1, 2].map((k) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={k}>
              <Skeleton
                variant="rounded"
                height={LISTING_CARD_BROWSE_MEDIA_HEIGHT.xs}
                sx={{ borderRadius: 1.5, mb: 1 }}
              />
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="40%" />
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
              {t.saved.emptyTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
              {emptyMessage}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          <Grid
            container
            spacing={{ xs: 2, md: 2.5 }}
            sx={{
              // Mixed verticals (e.g. property vs cars) share one media height.
              '& .listing-card-media': {
                height: LISTING_CARD_BROWSE_MEDIA_HEIGHT,
                minHeight: 0,
                aspectRatio: 'auto',
              },
            }}
          >
            {filtered.map((item) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={`${item.kind}-${item.listingId}`} sx={{ display: 'flex' }}>
                <Box sx={{ width: '100%', height: '100%' }}>
                  <SavedListingCard item={item} />
                </Box>
              </Grid>
            ))}
          </Grid>
          {canLoadMore ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="outlined" disabled={loadingMore} onClick={() => void loadPage(page + 1, true)}>
                {loadingMore ? '…' : 'Shfaq më shumë'}
              </Button>
            </Box>
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}

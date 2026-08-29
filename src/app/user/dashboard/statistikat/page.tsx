'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { BookmarkSimple as BookmarkIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { ChartLineUp as ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PaperPlaneTilt as ShareIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { StatsPageSkeleton } from '@/components/core/content-skeletons';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { LeadsTopHeaderButton } from '@/components/user/leads-top-header-button';
import { ListingSavesLeadsDialog } from '@/components/user/listing-saves-leads-dialog';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { listMyBusinessListings, listMyProfessionalListings } from '@/lib/directory-listings-client';
import {
  listMyCarListings,
  listMyJobListings,
  listMyMarketplaceListings,
  listMyRealEstateListings,
} from '@/lib/listings-client';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import { paths } from '@/paths';

type StatRow = {
  key: string;
  kind: ListingMetricKind;
  kindLabel: string;
  listingId: string;
  title: string;
  status: string;
  imageUrl: string | null;
  viewCount: number;
  shareCount: number;
  saveCount: number;
};

function firstImageUrl(urls: string[] | null | undefined): string | null {
  const url = urls?.find((u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()));
  return url?.trim() || null;
}

function formatNum(n: number) {
  return new Intl.NumberFormat('en-GB').format(n);
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function rowMatchesSearch(row: StatRow, query: string): boolean {
  if (!query) return true;
  const haystack = normalizeSearch([row.title, row.kindLabel, row.status].join(' '));
  return haystack.includes(query);
}

function TotalCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Box
      sx={{
        p: { xs: 1.25, sm: 2 },
        height: '100%',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction="column"
        spacing={0.75}
        sx={{ alignItems: 'center', textAlign: 'center' }}
      >
        <Box
          sx={{
            width: { xs: 32, sm: 40 },
            height: { xs: 32, sm: 40 },
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: `${tone}22`,
            color: tone,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, width: '100%' }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, display: 'block', lineHeight: 1.2 }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: { xs: '1.15rem', sm: '1.45rem' },
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {formatNum(value)}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function UserStatisticsPage() {
  const { user } = useUser();
  const t = useCopy();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<StatRow[]>([]);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const searchQuery = React.useMemo(() => normalizeSearch(deferredSearch), [deferredSearch]);
  const hasSearch = searchQuery.length > 0;
  const [leadsTarget, setLeadsTarget] = React.useState<{
    kind: ListingMetricKind;
    listingId: string;
    title: string;
  } | null>(null);

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (!user || !canPublish) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [re, cars, jobs, mkt, biz, pro] = await Promise.all([
        listMyRealEstateListings(),
        listMyCarListings(),
        listMyJobListings(),
        listMyMarketplaceListings(),
        listMyBusinessListings(),
        listMyProfessionalListings(),
      ]);
      if (cancelled) return;

      const firstError =
        re.error || cars.error || jobs.error || mkt.error || biz.error || pro.error || null;
      setError(firstError);

      const next: StatRow[] = [];
      for (const l of re.listings ?? []) {
        next.push({
          key: `real-estate:${l.id}`,
          kind: 'real-estate',
          kindLabel: 'Pasuri',
          listingId: l.id,
          title: l.title || 'Pa titull',
          status: l.status,
          imageUrl: firstImageUrl(l.imageUrls),
          viewCount: l.viewCount ?? 0,
          shareCount: l.shareCount ?? 0,
          saveCount: l.saveCount ?? 0,
        });
      }
      for (const l of cars.listings ?? []) {
        next.push({
          key: `car:${l.id}`,
          kind: 'car',
          kindLabel: 'Makina',
          listingId: l.id,
          title: [l.make, l.model, l.variant].filter(Boolean).join(' ') || 'Makinë',
          status: l.status,
          imageUrl: firstImageUrl(l.imageUrls),
          viewCount: l.viewCount ?? 0,
          shareCount: l.shareCount ?? 0,
          saveCount: l.saveCount ?? 0,
        });
      }
      for (const l of jobs.listings ?? []) {
        next.push({
          key: `job:${l.id}`,
          kind: 'job',
          kindLabel: 'Punë',
          listingId: l.id,
          title: l.title || 'Pa titull',
          status: l.status,
          imageUrl: firstImageUrl(l.imageUrls),
          viewCount: l.viewCount ?? 0,
          shareCount: l.shareCount ?? 0,
          saveCount: l.saveCount ?? 0,
        });
      }
      for (const l of mkt.listings ?? []) {
        next.push({
          key: `marketplace:${l.id}`,
          kind: 'marketplace',
          kindLabel: 'Tregu',
          listingId: l.id,
          title: l.title || 'Pa titull',
          status: l.status,
          imageUrl: firstImageUrl(l.imageUrls),
          viewCount: l.viewCount ?? 0,
          shareCount: l.shareCount ?? 0,
          saveCount: l.saveCount ?? 0,
        });
      }
      for (const l of biz.listings ?? []) {
        next.push({
          key: `businesses:${l.id}`,
          kind: 'businesses',
          kindLabel: 'Biznese',
          listingId: l.id,
          title: l.title || 'Pa titull',
          status: l.status,
          imageUrl: firstImageUrl(l.imageUrls),
          viewCount: l.viewCount ?? 0,
          shareCount: l.shareCount ?? 0,
          saveCount: l.saveCount ?? 0,
        });
      }
      for (const l of pro.listings ?? []) {
        next.push({
          key: `professionals:${l.id}`,
          kind: 'professionals',
          kindLabel: 'Profesionistë',
          listingId: l.id,
          title: l.title || 'Pa titull',
          status: l.status,
          imageUrl: firstImageUrl(l.imageUrls),
          viewCount: l.viewCount ?? 0,
          shareCount: l.shareCount ?? 0,
          saveCount: l.saveCount ?? 0,
        });
      }

      next.sort((a, b) => b.viewCount - a.viewCount || b.saveCount - a.saveCount);
      setRows(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, canPublish]);

  const filteredRows = React.useMemo(
    () => (hasSearch ? rows.filter((row) => rowMatchesSearch(row, searchQuery)) : rows),
    [rows, hasSearch, searchQuery],
  );

  if (!user) return null;

  if (!canPublish) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Statistikat e njoftimeve janë të disponueshme për llogaritë që publikojnë njoftime.
      </Alert>
    );
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.views += r.viewCount;
      acc.shares += r.shareCount;
      acc.saves += r.saveCount;
      return acc;
    },
    { views: 0, shares: 0, saves: 0 },
  );

  return (
    <Stack spacing={3}>
      <LeadsTopHeaderButton />
      <UserPageHeader
        icon={<ChartLineUpIcon size={20} weight="duotone" />}
        title={t.nav.statistics}
        description="Si kanë shkuar njoftimet tuaja — shikime, ndarje dhe ruajtje."
      />

      {error ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <StatsPageSkeleton />
      ) : (
        <>
          <Grid container spacing={{ xs: 1, sm: 1.5 }}>
            <Grid size={4}>
              <TotalCard
                icon={<EyeIcon size={20} weight="duotone" />}
                label="Shikime"
                value={totals.views}
                tone="#8b5cf6"
              />
            </Grid>
            <Grid size={4}>
              <TotalCard
                icon={<ShareIcon size={20} weight="bold" />}
                label="Ndarje"
                value={totals.shares}
                tone="#7ac943"
              />
            </Grid>
            <Grid size={4}>
              <TotalCard
                icon={<BookmarkIcon size={20} weight="duotone" />}
                label="Ruajtje"
                value={totals.saves}
                tone="#f5a623"
              />
            </Grid>
          </Grid>

          <Stack spacing={1.5}>
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography sx={{ fontWeight: 850 }}>Sipas njoftimit</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {filteredRows.length}
                {hasSearch ? ` / ${rows.length}` : ''} njoftime
              </Typography>
            </Stack>

            {rows.length > 0 ? (
              <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Kërko njoftimet…"
                aria-label="Kërko njoftimet"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box sx={{ display: 'inline-flex', color: 'text.secondary' }}>
                          <MagnifyingGlassIcon size={18} weight="bold" />
                        </Box>
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Pastro kërkimin"
                          onClick={() => setSearch('')}
                          edge="end"
                        >
                          <XIcon size={16} weight="bold" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    bgcolor: 'transparent',
                  },
                }}
              />
            ) : null}

            {rows.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Ende nuk keni njoftime. Shtoni një njoftim për të filluar statistikat.
                </Typography>
                <Button
                  component={RouterLink}
                  href={paths.user.realEstateListing}
                  variant="contained"
                  sx={{ mt: 2, fontWeight: 800, textTransform: 'none' }}
                >
                  Shto njoftim
                </Button>
              </Box>
            ) : filteredRows.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Nuk u gjet asnjë njoftim për «{deferredSearch.trim()}».
                </Typography>
              </Box>
            ) : (
              <Stack divider={<Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}>
                {filteredRows.map((row) => (
                  <Stack
                    key={row.key}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.25}
                    sx={{
                      alignItems: { sm: 'center' },
                      justifyContent: 'space-between',
                      py: 1.5,
                      gap: 1,
                    }}
                  >
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 1.75,
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'action.hover',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'text.disabled',
                        }}
                      >
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.imageUrl}
                            alt=""
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <ImageIcon size={22} weight="duotone" />
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.92rem' }} noWrap>
                          {row.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
                          {row.kindLabel} · {row.status}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={1.75}
                      sx={{ alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary', pl: { xs: 8, sm: 0 } }}
                    >
                      <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }} title="Shikime">
                        <EyeIcon size={15} />
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                          {formatNum(row.viewCount)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center' }} title="Ndarje">
                        <ShareIcon size={15} weight="bold" />
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                          {formatNum(row.shareCount)}
                        </Typography>
                      </Stack>
                      <Box
                        component="button"
                        type="button"
                        title="Ruajtje · shiko interesuarit"
                        aria-label="Ruajtje · shiko interesuarit"
                        onClick={() =>
                          setLeadsTarget({
                            kind: row.kind,
                            listingId: row.listingId,
                            title: row.title,
                          })
                        }
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.4,
                          m: 0,
                          p: 0,
                          border: 0,
                          bgcolor: 'transparent',
                          cursor: 'pointer',
                          color: 'inherit',
                          WebkitTapHighlightColor: 'transparent',
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        <BookmarkIcon size={15} />
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                          {formatNum(row.saveCount)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </>
      )}

      {leadsTarget ? (
        <ListingSavesLeadsDialog
          open
          onClose={() => setLeadsTarget(null)}
          listingKind={leadsTarget.kind}
          listingId={leadsTarget.listingId}
          listingTitle={leadsTarget.title}
        />
      ) : null}
    </Stack>
  );
}

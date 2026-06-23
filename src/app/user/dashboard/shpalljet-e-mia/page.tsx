'use client';

import * as React from 'react';
import Image from 'next/image';
import RouterLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';
import { Speedometer as SpeedometerIcon } from '@phosphor-icons/react/dist/ssr/Speedometer';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { paths } from '@/paths';
import {
  listMyCarListings,
  listMyJobListings,
  listMyMarketplaceListings,
  listMyRealEstateListings,
  type CarMineListing,
  type JobMineListing,
  type MarketplaceMineListing,
} from '@/lib/listings-client';
import { propertyCategoryLabel } from '@/lib/real-estate-constants';
import { JOB_INDUSTRY_OPTIONS, JOB_TYPE_OPTIONS, WORK_LOCATION_OPTIONS } from '@/lib/job-constants';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import { useUser } from '@/hooks/use-user';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { ListingOwnerMetrics } from '@/components/user/listing-owner-metrics';
import { ListingModerationStatusChip } from '@/components/user/listing-moderation-status-chip';
import { ListingModerationNotice, ListingSubmittedPendingAlert } from '@/components/user/listing-moderation-notice';
import { normalizeListingModerationStatus } from '@/lib/listing-moderation-status';
import type { ListingMetrics } from '@/lib/listing-metrics';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function formatPrice(n: number | null, currency: string | null): string {
  if (n === null || n === undefined) return '—';
  const formatted = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n);
  return currency === 'EUR' ? `${formatted} €` : `${formatted} L`;
}

function findLabel<T extends { value: string; label: string }>(options: readonly T[], value: string | null): string {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
}

const chipSx = { fontWeight: 600, height: 20, fontSize: '0.68rem', '& .MuiChip-label': { px: 0.85 } } as const;

function Row({ icon: Icon, children }: { icon: PhosphorIcon; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', py: 0.15 }}>
      <Box component="span" sx={{ color: 'primary.main', display: 'inline-flex', flexShrink: 0 }}>
        {React.createElement(Icon, { size: 15, weight: 'duotone' })}
      </Box>
      <Typography variant="caption" color="text.primary" sx={{ lineHeight: 1.4, fontSize: '0.78rem' }} noWrap>
        {children}
      </Typography>
    </Stack>
  );
}

function CardImageHeader({ imageUrl, fallbackIcon: FallbackIcon, alt, status }: {
  imageUrl: string | null;
  fallbackIcon: PhosphorIcon;
  alt: string;
  status: ReturnType<typeof normalizeListingModerationStatus>;
}) {
  return (
    <Box sx={{
      position: 'relative',
      height: 130,
      flexShrink: 0,
      borderBottom: '1px solid',
      borderColor: 'divider',
      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
      overflow: 'hidden',
    }}>
      {imageUrl ? (
        <Image src={imageUrl} alt={alt} fill sizes="(max-width: 600px) 100vw, 280px" style={{ objectFit: 'cover' }} />
      ) : (
        <Stack aria-hidden sx={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', color: 'primary.main', opacity: 0.45 }}>
          {React.createElement(FallbackIcon, { size: 40, weight: 'duotone' })}
        </Stack>
      )}
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, transform: 'scale(0.85)', transformOrigin: 'top right' }}>
        <ListingModerationStatusChip status={status} />
      </Box>
    </Box>
  );
}

function BaseCard({ title, chips, children, createdAt, metrics, status, imageUrl, fallbackIcon }: {
  title: string;
  chips?: React.ReactNode;
  children: React.ReactNode;
  createdAt: string;
  metrics?: Partial<ListingMetrics>;
  status?: string | null;
  imageUrl: string | null;
  fallbackIcon: PhosphorIcon;
}) {
  const moderationStatus = normalizeListingModerationStatus(status ?? undefined);
  const isPublic = moderationStatus === 'approved';
  return (
    <Card elevation={0} sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      border: '1px solid', borderColor: isPublic ? 'divider' : 'warning.light', borderRadius: 2, overflow: 'hidden',
      opacity: isPublic ? 1 : 0.92,
      transition: 'box-shadow 0.2s, border-color 0.2s',
      '&:hover': { borderColor: isPublic ? 'primary.light' : 'warning.main', boxShadow: (t) => `0 8px 24px ${t.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)'}` },
    }}>
      <CardImageHeader imageUrl={imageUrl} fallbackIcon={fallbackIcon} alt={title} status={moderationStatus} />
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, display: 'flex', flexDirection: 'column', gap: 0.85, flex: 1 }}>
        <Typography
          component="h2"
          sx={{
            fontWeight: 700,
            fontSize: '0.9rem',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </Typography>
        {chips ? <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>{chips}</Stack> : null}
        {!isPublic ? <ListingModerationNotice status={moderationStatus} /> : null}
        <Divider sx={{ my: 0.15 }} />
        <Stack spacing={0}>{children}</Stack>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
          {format(new Date(createdAt), 'd MMM yyyy')}
        </Typography>
        {metrics ? <ListingOwnerMetrics metrics={metrics} /> : null}
      </CardContent>
    </Card>
  );
}

/** First usable image from a listing's gallery, or null for a fallback panel. */
function coverImage(imageUrls?: string[] | null): string | null {
  if (!Array.isArray(imageUrls)) return null;
  return imageUrls.find((url) => typeof url === 'string' && url.trim().length > 0) ?? null;
}

// ---------------------------------------------------------------------------
// Real-estate card
// ---------------------------------------------------------------------------

function RealEstateCard({ l }: { l: RealEstateMineListing }) {
  const location = [l.cityName, l.zoneName].filter(Boolean).join(' · ') || '—';
  return (
    <BaseCard
      title={l.title}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={coverImage(l.imageUrls)}
      fallbackIcon={BuildingsIcon}
      chips={<>
        <Chip size="small" label={l.transactionType === 'rent' ? 'Me qira' : 'Në shitje'} color={l.transactionType === 'rent' ? 'info' : 'secondary'} variant="outlined" sx={chipSx} />
        <Chip size="small" label={propertyCategoryLabel(l.propertyCategory)} variant="outlined" sx={chipSx} />
      </>}
    >
      <Row icon={TagIcon}><strong>{formatPrice(l.price, l.currency)}</strong></Row>
      <Row icon={RulerIcon}><strong>{l.surfaceM2}</strong> m²{l.bedrooms != null ? ` · ${l.bedrooms} dhoma · ${l.bathrooms ?? 0} banjo` : ''}</Row>
      <Row icon={MapPinIcon}>{location}</Row>
    </BaseCard>
  );
}

// ---------------------------------------------------------------------------
// Car card
// ---------------------------------------------------------------------------

function CarCard({ l }: { l: CarMineListing }) {
  const title = [l.make, l.model, l.variant].filter(Boolean).join(' ');
  return (
    <BaseCard
      title={title}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={coverImage(l.imageUrls)}
      fallbackIcon={CarIcon}
      chips={<>
        <Chip size="small" label={l.year} variant="outlined" sx={chipSx} />
        <Chip size="small" label={l.transmission} variant="outlined" sx={chipSx} />
      </>}
    >
      <Row icon={TagIcon}><strong>{formatPrice(l.price, l.currency)}</strong></Row>
      <Row icon={SpeedometerIcon}><strong>{new Intl.NumberFormat('en-GB').format(l.kilometers)}</strong> km · {l.fuelType}</Row>
      {l.cityName ? <Row icon={MapPinIcon}>{l.cityName}</Row> : null}
    </BaseCard>
  );
}

// ---------------------------------------------------------------------------
// Job card
// ---------------------------------------------------------------------------

function JobCard({ l }: { l: JobMineListing }) {
  const industryLabel = findLabel(JOB_INDUSTRY_OPTIONS, l.industry);
  const jobTypeLabel = findLabel(JOB_TYPE_OPTIONS, l.jobType);
  const workLocLabel = findLabel(WORK_LOCATION_OPTIONS, l.workLocation);
  return (
    <BaseCard
      title={l.title}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={coverImage(l.imageUrls)}
      fallbackIcon={BriefcaseIcon}
      chips={<>
        <Chip size="small" label={jobTypeLabel} variant="outlined" sx={chipSx} />
        <Chip size="small" label={workLocLabel} variant="outlined" color="info" sx={chipSx} />
      </>}
    >
      <Row icon={BriefcaseIcon}>{industryLabel}</Row>
      {l.salary != null ? <Row icon={TagIcon}><strong>{formatPrice(l.salary, l.currency)}</strong> / muaj</Row> : null}
      {l.cityName ? <Row icon={MapPinIcon}>{l.cityName}</Row> : null}
    </BaseCard>
  );
}

// ---------------------------------------------------------------------------
// Marketplace card
// ---------------------------------------------------------------------------

function MarketplaceCard({ l }: { l: MarketplaceMineListing }) {
  const categoryLabel = findLabel(MARKETPLACE_CATEGORY_OPTIONS, l.category);
  const conditionLabel = findLabel(MARKETPLACE_CONDITION_OPTIONS, l.condition);
  return (
    <BaseCard
      title={l.title}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={coverImage(l.imageUrls)}
      fallbackIcon={StorefrontIcon}
      chips={<>
        <Chip size="small" label={categoryLabel} variant="outlined" sx={chipSx} />
        {l.condition ? <Chip size="small" label={conditionLabel} variant="outlined" color="success" sx={chipSx} /> : null}
      </>}
    >
      {l.price != null ? <Row icon={TagIcon}><strong>{formatPrice(l.price, l.currency)}</strong></Row> : <Row icon={TagIcon}>Çmimi me marrëveshje</Row>}
      {l.cityName ? <Row icon={MapPinIcon}>{l.cityName}</Row> : null}
    </BaseCard>
  );
}

// ---------------------------------------------------------------------------
// Generic tab content
// ---------------------------------------------------------------------------

function TabGrid<T>({ loading, error, items, renderCard }: {
  loading: boolean;
  error: string | null;
  items: T[];
  renderCard: (item: T) => React.ReactNode;
}) {
  if (loading) {
    return (
      <Grid container spacing={1.5}>
        {[0, 1, 2, 3].map((k) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={k}>
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    );
  }
  if (error) {
    return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;
  }
  if (items.length === 0) {
    return (
      <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ py: 5, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nuk keni njoftime në këtë kategori ende.
          </Typography>
        </CardContent>
      </Card>
    );
  }
  return (
    <Grid container spacing={1.5}>
      {items.map((item, idx) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={idx}>
          {renderCard(item)}
        </Grid>
      ))}
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserMyListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [tab, setTab] = React.useState(0);
  const [showSubmittedAlert, setShowSubmittedAlert] = React.useState(false);

  const [reListings, setReListings] = React.useState<RealEstateMineListing[]>([]);
  const [carListings, setCarListings] = React.useState<CarMineListing[]>([]);
  const [jobListings, setJobListings] = React.useState<JobMineListing[]>([]);
  const [mktListings, setMktListings] = React.useState<MarketplaceMineListing[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [errors, setErrors] = React.useState<(string | null)[]>([null, null, null, null]);

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
    if (searchParams.get('submitted') === 'pending') {
      setShowSubmittedAlert(true);
      router.replace(paths.user.myRealEstateListings);
    }
  }, [searchParams, router]);

  React.useEffect(() => {
    if (!user?.id || !canView) return;
    let cancelled = false;
    setLoading(true);

    void Promise.all([
      listMyRealEstateListings(),
      listMyCarListings(),
      listMyJobListings(),
      listMyMarketplaceListings(),
    ]).then(([re, cars, jobs, mkt]) => {
      if (cancelled) return;
      setReListings(re.listings ?? []);
      setCarListings(cars.listings ?? []);
      setJobListings(jobs.listings ?? []);
      setMktListings(mkt.listings ?? []);
      setErrors([re.error ?? null, cars.error ?? null, jobs.error ?? null, mkt.error ?? null]);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user?.id, canView]);

  if (!user || !canView) return null;

  const allListings = [...reListings, ...carListings, ...jobListings, ...mktListings];
  const pendingCount = allListings.filter((l) => normalizeListingModerationStatus(l.status) === 'pending').length;

  const tabs = [
    { label: 'Pasuri', icon: <BuildingsIcon size={16} weight="duotone" />, count: reListings.length, pending: reListings.filter((l) => l.status === 'pending').length },
    { label: 'Makina', icon: <CarIcon size={16} weight="duotone" />, count: carListings.length, pending: carListings.filter((l) => l.status === 'pending').length },
    { label: 'Punë', icon: <BriefcaseIcon size={16} weight="duotone" />, count: jobListings.length, pending: jobListings.filter((l) => l.status === 'pending').length },
    { label: 'Tregu', icon: <StorefrontIcon size={16} weight="duotone" />, count: mktListings.length, pending: mktListings.filter((l) => l.status === 'pending').length },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between', gap: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Shpalljet e mia
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Njoftimet që keni postuar në platformë, sipas kategorisë.
          </Typography>
        </Stack>
        <Button variant="contained" component={RouterLink} href={paths.user.realEstateListing}>
          + Posto njoftim
        </Button>
      </Stack>

      {showSubmittedAlert ? <ListingSubmittedPendingAlert /> : null}

      {!loading && pendingCount > 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Keni <strong>{pendingCount}</strong> {pendingCount === 1 ? 'njoftim' : 'njoftime'} në pritje të miratimit nga administratori.
        </Alert>
      ) : null}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {tabs.map((t, i) => (
            <Tab
              key={i}
              label={
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  {t.icon}
                  <span>{t.label}</span>
                  {!loading && t.count > 0 ? (
                    <Chip size="small" label={t.count} sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700, pointerEvents: 'none' }} />
                  ) : null}
                  {!loading && t.pending > 0 ? (
                    <Chip size="small" color="warning" label={`${t.pending} në pritje`} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, pointerEvents: 'none' }} />
                  ) : null}
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Box>

      <Box>
        {tab === 0 && (
          <TabGrid
            loading={loading}
            error={errors[0]}
            items={reListings}
            renderCard={(l) => <RealEstateCard l={l} />}
          />
        )}
        {tab === 1 && (
          <TabGrid
            loading={loading}
            error={errors[1]}
            items={carListings}
            renderCard={(l) => <CarCard l={l} />}
          />
        )}
        {tab === 2 && (
          <TabGrid
            loading={loading}
            error={errors[2]}
            items={jobListings}
            renderCard={(l) => <JobCard l={l} />}
          />
        )}
        {tab === 3 && (
          <TabGrid
            loading={loading}
            error={errors[3]}
            items={mktListings}
            renderCard={(l) => <MarketplaceCard l={l} />}
          />
        )}
      </Box>
    </Stack>
  );
}

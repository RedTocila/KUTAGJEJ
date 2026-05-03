'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { useRouter } from 'next/navigation';
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
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { GasPump as GasPumpIcon } from '@phosphor-icons/react/dist/ssr/GasPump';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
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
import { propertyCategoryLabel, CONDITION_OPTIONS, FURNISHING_OPTIONS } from '@/lib/real-estate-constants';
import { JOB_INDUSTRY_OPTIONS, JOB_TYPE_OPTIONS, WORK_LOCATION_OPTIONS } from '@/lib/job-constants';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import { useUser } from '@/hooks/use-user';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';

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

function Row({ icon: Icon, children }: { icon: PhosphorIcon; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', py: 0.3 }}>
      <Box component="span" sx={{ color: 'primary.main', display: 'inline-flex', mt: 0.15, flexShrink: 0 }}>
        {React.createElement(Icon, { size: 18, weight: 'duotone' })}
      </Box>
      <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.5 }}>
        {children}
      </Typography>
    </Stack>
  );
}

function BaseCard({ title, chips, children, createdAt }: {
  title: string;
  chips?: React.ReactNode;
  children: React.ReactNode;
  createdAt: string;
}) {
  return (
    <Card elevation={0} sx={{
      height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden',
      transition: 'box-shadow 0.2s, border-color 0.2s',
      '&:hover': { borderColor: 'primary.light', boxShadow: (t) => `0 8px 24px ${t.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)'}` },
    }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, lineHeight: 1.35 }}>{title}</Typography>
        {chips ? <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>{chips}</Stack> : null}
        <Divider sx={{ my: 0.25 }} />
        <Stack spacing={0.1}>{children}</Stack>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
          {format(new Date(createdAt), 'd MMM yyyy')}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Real-estate card
// ---------------------------------------------------------------------------

function RealEstateCard({ l }: { l: RealEstateMineListing }) {
  const location = [l.cityName, l.zoneName].filter(Boolean).join(' · ') || '—';
  const condition = CONDITION_OPTIONS.find((o) => o.value === l.condition)?.label ?? null;
  const furnishing = FURNISHING_OPTIONS.find((o) => o.value === l.furnishing)?.label ?? null;
  return (
    <BaseCard
      title={l.title}
      createdAt={l.createdAt}
      chips={<>
        <Chip size="small" label={l.transactionType === 'rent' ? 'Rent' : 'Sale'} color={l.transactionType === 'rent' ? 'info' : 'secondary'} variant="outlined" sx={{ fontWeight: 600 }} />
        <Chip size="small" label={propertyCategoryLabel(l.propertyCategory)} variant="outlined" sx={{ fontWeight: 600 }} />
      </>}
    >
      <Row icon={TagIcon}><strong>{formatPrice(l.price, l.currency)}</strong></Row>
      <Row icon={RulerIcon}><strong>{l.surfaceM2}</strong> m²</Row>
      <Row icon={MapPinIcon}>{location}</Row>
      {l.bedrooms != null ? <Row icon={BuildingsIcon}>{l.bedrooms} dhoma gjumi · {l.bathrooms ?? 0} banjo</Row> : null}
      {condition ? <Row icon={TagIcon}>Gjendja: {condition}</Row> : null}
      {furnishing ? <Row icon={TagIcon}>Mobilim: {furnishing}</Row> : null}
      {l.contactPhone ? <Row icon={PhoneIcon}>{l.contactPhone}</Row> : null}
    </BaseCard>
  );
}

// ---------------------------------------------------------------------------
// Car card
// ---------------------------------------------------------------------------

function CarCard({ l }: { l: CarMineListing }) {
  const title = [l.make, l.model, l.variant].filter(Boolean).join(' ');
  const finish = l.finish.length > 0 ? ` · ${l.finish.join(', ')}` : '';
  return (
    <BaseCard
      title={title}
      createdAt={l.createdAt}
      chips={<>
        <Chip size="small" label={l.year} variant="outlined" sx={{ fontWeight: 600 }} />
        <Chip size="small" label={l.transmission} variant="outlined" sx={{ fontWeight: 600 }} />
      </>}
    >
      <Row icon={TagIcon}><strong>{formatPrice(l.price, l.currency)}</strong></Row>
      <Row icon={SpeedometerIcon}><strong>{new Intl.NumberFormat('en-GB').format(l.kilometers)}</strong> km</Row>
      <Row icon={GasPumpIcon}>{l.fuelType}</Row>
      <Row icon={CarIcon}>{l.color}{finish}</Row>
      {l.cityName ? <Row icon={MapPinIcon}>{l.cityName}</Row> : null}
      {l.contactPhone ? <Row icon={PhoneIcon}>{l.contactPhone}</Row> : null}
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
      chips={<>
        <Chip size="small" label={jobTypeLabel} variant="outlined" sx={{ fontWeight: 600 }} />
        <Chip size="small" label={workLocLabel} variant="outlined" color="info" sx={{ fontWeight: 600 }} />
      </>}
    >
      <Row icon={BriefcaseIcon}>{industryLabel}</Row>
      {l.salary != null ? <Row icon={TagIcon}><strong>{formatPrice(l.salary, l.currency)}</strong> / muaj</Row> : null}
      {l.cityName ? <Row icon={MapPinIcon}>{l.cityName}</Row> : null}
      <Row icon={CalendarBlankIcon}>{l.experience} · {l.education}</Row>
      {l.contactPhone ? <Row icon={PhoneIcon}>{l.contactPhone}</Row> : null}
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
      chips={<>
        <Chip size="small" label={categoryLabel} variant="outlined" sx={{ fontWeight: 600 }} />
        {l.condition ? <Chip size="small" label={conditionLabel} variant="outlined" color="success" sx={{ fontWeight: 600 }} /> : null}
      </>}
    >
      {l.price != null ? <Row icon={TagIcon}><strong>{formatPrice(l.price, l.currency)}</strong></Row> : <Row icon={TagIcon}>Çmimi me marrëveshje</Row>}
      {l.cityName ? <Row icon={MapPinIcon}>{l.cityName}</Row> : null}
      {l.contactPhone ? <Row icon={PhoneIcon}>{l.contactPhone}</Row> : null}
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
      <Grid container spacing={2}>
        {[0, 1, 2].map((k) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={k}>
            <Skeleton variant="rounded" height={260} sx={{ borderRadius: 2 }} />
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
    <Grid container spacing={2}>
      {items.map((item, idx) => (
        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={idx}>
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
  const { user } = useUser();
  const [tab, setTab] = React.useState(0);

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

  const tabs = [
    { label: 'Pasuri', icon: <BuildingsIcon size={16} weight="duotone" />, count: reListings.length },
    { label: 'Automjete', icon: <CarIcon size={16} weight="duotone" />, count: carListings.length },
    { label: 'Punë', icon: <BriefcaseIcon size={16} weight="duotone" />, count: jobListings.length },
    { label: 'Tregu', icon: <StorefrontIcon size={16} weight="duotone" />, count: mktListings.length },
  ];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between', gap: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Shpalljet e mia
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Të gjitha njoftimet e tua të ruajtura, sipas kategorisë.
          </Typography>
        </Stack>
        <Button variant="contained" component={RouterLink} href={paths.user.realEstateListing}>
          + Posto njoftim
        </Button>
      </Stack>

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

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
  Typography,
} from '@mui/material';
import { Armchair as ArmchairIcon } from '@phosphor-icons/react/dist/ssr/Armchair';
import { Bathtub as BathtubIcon } from '@phosphor-icons/react/dist/ssr/Bathtub';
import { Bed as BedIcon } from '@phosphor-icons/react/dist/ssr/Bed';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CurrencyEur as CurrencyEurIcon } from '@phosphor-icons/react/dist/ssr/CurrencyEur';
import { HouseLine as HouseLineIcon } from '@phosphor-icons/react/dist/ssr/HouseLine';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Stack as StackIcon } from '@phosphor-icons/react/dist/ssr/Stack';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';

import { paths } from '@/paths';
import { CONDITION_OPTIONS, FURNISHING_OPTIONS, propertyCategoryLabel } from '@/lib/real-estate-constants';
import { listMyRealEstateListings } from '@/lib/listings-client';
import { useUser } from '@/hooks/use-user';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';

function conditionLabel(slug: string | null): string | null {
  if (!slug) return null;
  const o = CONDITION_OPTIONS.find((c) => c.value === slug);
  return o?.label ?? slug;
}

function furnishingLabel(slug: string | null): string | null {
  if (!slug) return null;
  const o = FURNISHING_OPTIONS.find((c) => c.value === slug);
  return o?.label ?? slug;
}

function formatPrice(n: number, currency: string): string {
  const formatted = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n);
  return currency === 'EUR' ? `${formatted} €` : `${formatted} L`;
}

function DetailRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; weight?: 'bold' | 'duotone' | 'fill' | 'regular' }>;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ py: 0.35, alignItems: 'flex-start' }}>
      <Box
        component="span"
        sx={{
          color: 'primary.main',
          display: 'inline-flex',
          mt: 0.15,
          flexShrink: 0,
          opacity: 0.92,
        }}
      >
        {React.createElement(Icon, { size: 20, weight: 'duotone' })}
      </Box>
      <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.5 }}>
        {children}
      </Typography>
    </Stack>
  );
}

function ListingCard({ listing }: { listing: RealEstateMineListing }) {
  const location =
    listing.cityName || listing.zoneName
      ? [listing.cityName, listing.zoneName].filter(Boolean).join(' · ')
      : '—';

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: (t) => `0 8px 24px ${t.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)'}`,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
          {listing.title}
        </Typography>

        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip
            size="small"
            icon={React.createElement(TagIcon, { size: 14, weight: 'fill' })}
            label={listing.transactionType === 'rent' ? 'Rent' : 'Sale'}
            color={listing.transactionType === 'rent' ? 'info' : 'secondary'}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            size="small"
            icon={React.createElement(BuildingsIcon, { size: 14, weight: 'fill' })}
            label={propertyCategoryLabel(listing.propertyCategory)}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.55,
          }}
        >
          {listing.description}
        </Typography>

        <Divider sx={{ my: 0.5 }} />

        <Stack spacing={0.25}>
          <DetailRow icon={CurrencyEurIcon}>
            <strong>{formatPrice(listing.price, listing.currency)}</strong>
          </DetailRow>
          <DetailRow icon={RulerIcon}>
            <strong>{listing.surfaceM2}</strong> m² surface
          </DetailRow>
          <DetailRow icon={MapPinIcon}>{location}</DetailRow>
          <DetailRow icon={CalendarBlankIcon}>
            Listed {format(new Date(listing.createdAt), 'd MMM yyyy')}
          </DetailRow>
          {listing.bedrooms != null ? (
            <DetailRow icon={BedIcon}>
              {listing.bedrooms} bedroom{listing.bedrooms === 1 ? '' : 's'}
            </DetailRow>
          ) : null}
          {listing.bathrooms != null ? (
            <DetailRow icon={BathtubIcon}>
              {listing.bathrooms} bathroom{listing.bathrooms === 1 ? '' : 's'}
            </DetailRow>
          ) : null}
          {conditionLabel(listing.condition) ? (
            <DetailRow icon={HouseLineIcon}>Condition: {conditionLabel(listing.condition)}</DetailRow>
          ) : null}
          {listing.floor != null ? <DetailRow icon={StackIcon}>Floor: {listing.floor}</DetailRow> : null}
          {listing.totalFloors != null ? (
            <DetailRow icon={BuildingsIcon}>Total floors: {listing.totalFloors}</DetailRow>
          ) : null}
          {listing.parkingFloor != null ? (
            <DetailRow icon={CarIcon}>Parking level: {listing.parkingFloor}</DetailRow>
          ) : null}
          {listing.yearBuilt != null ? (
            <DetailRow icon={CalendarBlankIcon}>Year built: {listing.yearBuilt}</DetailRow>
          ) : null}
          {listing.apartmentTypeSlug ? (
            <DetailRow icon={TagIcon}>Apartment type: {listing.apartmentTypeSlug}</DetailRow>
          ) : null}
          {furnishingLabel(listing.furnishing) ? (
            <DetailRow icon={ArmchairIcon}>Furnishing: {furnishingLabel(listing.furnishing)}</DetailRow>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function UserMyRealEstateListingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [listings, setListings] = React.useState<RealEstateMineListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const canView =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (!user) return;
    if (!canView) {
      router.replace(paths.user.dashboard);
    }
  }, [user, canView, router]);

  React.useEffect(() => {
    if (!user?.id || !canView) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const { listings: rows, error: err } = await listMyRealEstateListings();
      if (cancelled) return;
      if (err) {
        setError(err);
        setListings([]);
      } else {
        setListings(rows ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, canView]);

  if (!user) return null;
  if (!canView) return null;

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          My real-estate listings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
          Listimet e tua të ruajtura — titulli, çmimi, sipërfaqja dhe detaje të tjera me ikona.
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Button variant="contained" component={RouterLink} href={paths.user.realEstateListing}>
          Add another listing
        </Button>
        <Button variant="outlined" component={RouterLink} href={paths.user.dashboard}>
          Back to overview
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Grid container spacing={2}>
          {[0, 1, 2].map((k) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={k}>
              <Skeleton variant="rounded" height={280} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : listings.length === 0 ? (
        <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              You have not saved any listings yet.
            </Typography>
            <Button variant="contained" component={RouterLink} href={paths.user.realEstateListing}>
              Create your first listing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {listings.map((listing) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={listing.id}>
              <ListingCard listing={listing} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  );
}

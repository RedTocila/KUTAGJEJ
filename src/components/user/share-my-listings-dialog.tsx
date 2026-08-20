'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { ListingSharePage } from '@/components/public/listing-share/listing-share-page';
import { ListRowsSkeleton } from '@/components/core/content-skeletons';
import { useLanguage } from '@/hooks/use-language';
import {
  listMyBusinessListings,
  listMyProfessionalListings,
} from '@/lib/directory-listings-client';
import { hardNavigate } from '@/lib/hard-navigate';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import type { ListingSharePayload } from '@/lib/listing-share';
import {
  listMyCarListings,
  listMyJobListings,
  listMyMarketplaceListings,
  listMyRealEstateListings,
} from '@/lib/listings-client';
import {
  listingBusinessPublicHref,
  listingCarPublicHref,
  listingJobPublicHref,
  listingMarketplacePublicHref,
  listingProfessionalPublicHref,
  listingRealEstatePublicHref,
  paths,
} from '@/paths';

type ShareRow = {
  key: string;
  kind: ListingMetricKind;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  payload: ListingSharePayload;
};

const copy = {
  sq: {
    title: 'Zgjidh një shpallje',
    subtitle: 'Ndaj një nga shpalljet e tua për të fituar Boost Coins.',
    empty: 'Nuk keni shpallje të aprovuara për të ndarë.',
    addListing: 'Shto shpallje',
    close: 'Mbyll',
    loadError: 'Nuk u ngarkuan shpalljet. Provo përsëri.',
    kind: {
      'real-estate': 'Prona',
      car: 'Makina',
      job: 'Punë',
      marketplace: 'Tregu',
      businesses: 'Biznese',
      professionals: 'Profesionistë',
    } as Record<ListingMetricKind, string>,
  },
  en: {
    title: 'Choose a listing',
    subtitle: 'Share one of your posts to earn Boost Coins.',
    empty: 'You have no approved listings to share.',
    addListing: 'Add listing',
    close: 'Close',
    loadError: 'Could not load listings. Try again.',
    kind: {
      'real-estate': 'Property',
      car: 'Cars',
      job: 'Jobs',
      marketplace: 'Marketplace',
      businesses: 'Businesses',
      professionals: 'Professionals',
    } as Record<ListingMetricKind, string>,
  },
} as const;

function formatPrice(n: number | null | undefined, currency: string | null | undefined): string | undefined {
  if (n == null) return undefined;
  const formatted = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n);
  return currency === 'EUR' ? `${formatted} €` : `${formatted} L`;
}

function coverImage(urls: string[] | undefined): string | null {
  const first = urls?.find((u) => typeof u === 'string' && u.trim());
  return first?.trim() || null;
}

function kindIcon(kind: ListingMetricKind): PhosphorIcon {
  switch (kind) {
    case 'real-estate':
      return BuildingsIcon;
    case 'car':
      return CarIcon;
    case 'job':
      return BriefcaseIcon;
    case 'marketplace':
      return StorefrontIcon;
    case 'businesses':
      return BuildingOfficeIcon;
    case 'professionals':
      return UsersIcon;
    default:
      return BuildingsIcon;
  }
}

export function ShareMyListingsDialog({
  open,
  onClose,
  onShareComplete,
}: {
  open: boolean;
  onClose: () => void;
  /** Called after the share sheet closes so the parent can refresh streak/share state. */
  onShareComplete?: () => void;
}) {
  const { language } = useLanguage();
  const t = copy[language];
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ShareRow[]>([]);
  const [sharePayload, setSharePayload] = React.useState<ListingSharePayload | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
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

      const next: ShareRow[] = [];
      const pushErrors = [re.error, cars.error, jobs.error, mkt.error, biz.error, pro.error].filter(Boolean);
      if (pushErrors.length === 6) {
        setError(t.loadError);
        setRows([]);
        setLoading(false);
        return;
      }

      for (const l of re.listings ?? []) {
        if (l.status !== 'approved') continue;
        const url = listingRealEstatePublicHref(l);
        const priceLabel = formatPrice(l.price, l.currency);
        next.push({
          key: `real-estate:${l.id}`,
          kind: 'real-estate',
          title: l.title,
          subtitle: [l.cityName, priceLabel].filter(Boolean).join(' · '),
          imageUrl: coverImage(l.imageUrls),
          payload: {
            listingKind: 'real-estate',
            listingId: l.id,
            title: l.title,
            category: t.kind['real-estate'],
            priceLabel,
            imageUrl: coverImage(l.imageUrls),
            location: l.cityName || undefined,
            createdAt: l.createdAt,
            viewCount: l.viewCount,
            saveCount: l.saveCount,
            contactPhone: l.contactPhone?.trim() || undefined,
            url,
          },
        });
      }

      for (const l of cars.listings ?? []) {
        if (l.status !== 'approved') continue;
        const title = [l.make, l.model, l.variant].filter(Boolean).join(' ');
        const url = listingCarPublicHref(l);
        const priceLabel = formatPrice(l.price, l.currency);
        next.push({
          key: `car:${l.id}`,
          kind: 'car',
          title,
          subtitle: [l.cityName, priceLabel].filter(Boolean).join(' · '),
          imageUrl: coverImage(l.imageUrls),
          payload: {
            listingKind: 'car',
            listingId: l.id,
            title,
            category: t.kind.car,
            priceLabel,
            imageUrl: coverImage(l.imageUrls),
            location: l.cityName || undefined,
            createdAt: l.createdAt,
            viewCount: l.viewCount,
            saveCount: l.saveCount,
            contactPhone: l.contactPhone?.trim() || undefined,
            url,
          },
        });
      }

      for (const l of jobs.listings ?? []) {
        if (l.status !== 'approved') continue;
        const url = listingJobPublicHref(l);
        next.push({
          key: `job:${l.id}`,
          kind: 'job',
          title: l.title,
          subtitle: [l.cityName, l.industry].filter(Boolean).join(' · '),
          imageUrl: coverImage(l.imageUrls),
          payload: {
            listingKind: 'job',
            listingId: l.id,
            title: l.title,
            category: t.kind.job,
            imageUrl: coverImage(l.imageUrls),
            location: l.cityName || undefined,
            createdAt: l.createdAt,
            viewCount: l.viewCount,
            saveCount: l.saveCount,
            contactPhone: l.contactPhone?.trim() || undefined,
            url,
          },
        });
      }

      for (const l of mkt.listings ?? []) {
        if (l.status !== 'approved') continue;
        const url = listingMarketplacePublicHref(l);
        const priceLabel = formatPrice(l.price, l.currency);
        next.push({
          key: `marketplace:${l.id}`,
          kind: 'marketplace',
          title: l.title,
          subtitle: [l.cityName, priceLabel].filter(Boolean).join(' · '),
          imageUrl: coverImage(l.imageUrls),
          payload: {
            listingKind: 'marketplace',
            listingId: l.id,
            title: l.title,
            category: t.kind.marketplace,
            priceLabel,
            imageUrl: coverImage(l.imageUrls),
            location: l.cityName || undefined,
            createdAt: l.createdAt,
            viewCount: l.viewCount,
            saveCount: l.saveCount,
            contactPhone: l.contactPhone?.trim() || undefined,
            url,
          },
        });
      }

      for (const l of biz.listings ?? []) {
        if (l.status !== 'approved') continue;
        const url = listingBusinessPublicHref(l);
        next.push({
          key: `businesses:${l.id}`,
          kind: 'businesses',
          title: l.title,
          subtitle: [l.cityName, l.category].filter(Boolean).join(' · '),
          imageUrl: coverImage(l.imageUrls),
          payload: {
            listingKind: 'businesses',
            listingId: l.id,
            title: l.title,
            category: t.kind.businesses,
            imageUrl: coverImage(l.imageUrls),
            location: l.cityName || undefined,
            createdAt: l.createdAt,
            viewCount: l.viewCount,
            saveCount: l.saveCount,
            contactPhone: l.contactPhone?.trim() || undefined,
            url,
          },
        });
      }

      for (const l of pro.listings ?? []) {
        if (l.status !== 'approved') continue;
        const url = listingProfessionalPublicHref(l);
        const priceLabel = formatPrice(l.price, l.currency);
        next.push({
          key: `professionals:${l.id}`,
          kind: 'professionals',
          title: l.title,
          subtitle: [l.cityName, priceLabel].filter(Boolean).join(' · '),
          imageUrl: coverImage(l.imageUrls),
          payload: {
            listingKind: 'professionals',
            listingId: l.id,
            title: l.title,
            category: t.kind.professionals,
            priceLabel,
            imageUrl: coverImage(l.imageUrls),
            location: l.cityName || undefined,
            createdAt: l.createdAt,
            viewCount: l.viewCount,
            saveCount: l.saveCount,
            contactPhone: l.contactPhone?.trim() || undefined,
            url,
          },
        });
      }

      next.sort((a, b) => {
        const aAt = a.payload.createdAt ? new Date(a.payload.createdAt).getTime() : 0;
        const bAt = b.payload.createdAt ? new Date(b.payload.createdAt).getTime() : 0;
        return bAt - aAt;
      });

      setRows(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, t.kind, t.loadError]);

  const handlePick = (row: ShareRow) => {
    setSharePayload(row.payload);
    setShareOpen(true);
    onClose();
  };

  const handleShareClose = () => {
    setShareOpen(false);
    setSharePayload(null);
    onShareComplete?.();
  };

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '75dvh',
              backgroundImage: 'none',
              pb: 'env(safe-area-inset-bottom, 0px)',
            },
          },
        }}
      >
        <Box
          sx={{ px: 2, pt: 1, pb: 1.5 }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 999,
              bgcolor: 'action.disabled',
              mx: 'auto',
              mb: 1.25,
            }}
          />

          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.25, gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.25 }}>{t.title}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.35 }}>
                {t.subtitle}
              </Typography>
            </Box>
            <IconButton aria-label={t.close} onClick={onClose} size="small" edge="end">
              <XIcon size={18} weight="bold" />
            </IconButton>
          </Stack>

          {error ? (
            <Alert severity="warning" sx={{ mb: 1, borderRadius: 2, py: 0.5 }}>
              {error}
            </Alert>
          ) : null}

          {loading ? (
            <ListRowsSkeleton count={5} rowHeight={64} />
          ) : rows.length === 0 ? (
            <Stack spacing={1.5} sx={{ py: 2.5, alignItems: 'stretch' }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.4 }}>
                {t.empty}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  onClose();
                  hardNavigate(paths.user.myRealEstateListings);
                }}
                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 999 }}
              >
                {t.addListing}
              </Button>
            </Stack>
          ) : (
            <Stack spacing={0} sx={{ maxHeight: '58dvh', overflowY: 'auto', mx: -0.5, px: 0.5 }}>
              {rows.map((row, index) => {
                const Icon = kindIcon(row.kind);
                return (
                  <Box key={row.key}>
                    {index > 0 ? (
                      <Box
                        sx={{
                          height: '1px',
                          bgcolor: 'divider',
                          opacity: 0.55,
                          ml: 7,
                          mr: 0.5,
                        }}
                      />
                    ) : null}
                    <Box
                      component="button"
                      type="button"
                      onClick={() => handlePick(row)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        width: '100%',
                        px: 0.5,
                        py: 1.15,
                        border: 0,
                        borderRadius: 1.5,
                        bgcolor: 'transparent',
                        color: 'text.primary',
                        cursor: 'pointer',
                        font: 'inherit',
                        textAlign: 'left',
                        '&:hover': { bgcolor: 'action.hover' },
                        '&:active': { bgcolor: 'action.selected' },
                      }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          width: 48,
                          height: 48,
                          borderRadius: 1.5,
                          overflow: 'hidden',
                          flexShrink: 0,
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          border: '1px solid',
                          borderColor: 'divider',
                          display: 'grid',
                          placeItems: 'center',
                          color: 'primary.main',
                        }}
                      >
                        {row.imageUrl ? (
                          <Image
                            src={row.imageUrl}
                            alt=""
                            fill
                            sizes="48px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <Icon size={22} weight="duotone" />
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            lineHeight: 1.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: 'block',
                            mt: 0.2,
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.kind[row.kind]}
                          {row.subtitle ? ` · ${row.subtitle}` : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </Drawer>

      <ListingSharePage open={shareOpen} onClose={handleShareClose} payload={sharePayload} />
    </>
  );
}

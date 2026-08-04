'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import {
  listMyBusinessListings,
  listMyProfessionalListings,
} from '@/lib/directory-listings-client';
import { listCategoriesPublic } from '@/lib/listings-client';
import { hardNavigate } from '@/lib/hard-navigate';
import {
  AI_SEARCH_BLUE,
} from '@/lib/home-categories';
import { paths } from '@/paths';
import type { ListingCategory, ListingCategoryKey } from '@/types/listing-category';
import { useCopy } from '@/hooks/use-copy';
import type { AppMessages } from '@/lib/i18n/messages';

function fallbackOptions(t: AppMessages): { key: ListingCategoryKey; title: string; hint: string }[] {
  return [
    { key: 'real-estate', title: t.picker.realEstate, hint: t.picker.realEstateHint },
    { key: 'cars', title: t.picker.cars, hint: t.picker.carsHint },
    { key: 'job-listings', title: t.picker.jobs, hint: t.picker.jobsHint },
    { key: 'marketplace', title: t.picker.marketplace, hint: t.picker.marketplaceHint },
    { key: 'businesses', title: t.picker.businesses, hint: t.picker.businessesHint },
    { key: 'professionals', title: t.picker.professionals, hint: t.picker.professionalsHint },
  ];
}

function categoryIcon(key: ListingCategoryKey): PhosphorIcon {
  switch (key) {
    case 'real-estate':
      return BuildingsIcon;
    case 'job-listings':
      return BriefcaseIcon;
    case 'cars':
      return CarIcon;
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

export function AddListingPickerDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** When set, called instead of navigating to the post-listing page. */
  onPick?: (key: ListingCategoryKey) => void;
}) {
  const t = useCopy();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<ListingCategory[]>([]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const res = await listCategoriesPublic();
      if (cancelled) return;
      if (res.error) setError(res.error);
      setCategories(res.categories ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const localizedFallback = fallbackOptions(t);
  const fallbackByKey = Object.fromEntries(
    localizedFallback.map((o) => [o.key, { title: o.title, hint: o.hint }]),
  ) as Partial<Record<ListingCategoryKey, { title: string; hint: string }>>;
  const options =
    categories.length > 0
      ? categories.map((c) => ({
          key: c.key,
          title: fallbackByKey[c.key]?.title ?? c.title,
          hint: fallbackByKey[c.key]?.hint ?? '',
        }))
      : localizedFallback;

  const handlePick = (key: ListingCategoryKey) => {
    if (onPick) {
      onPick(key);
      return;
    }
    void (async () => {
      if (key === 'businesses') {
        const res = await listMyBusinessListings();
        if ((res.listings?.length ?? 0) > 0) {
          onClose();
          hardNavigate(paths.user.businessesListing);
          return;
        }
      }
      if (key === 'professionals') {
        const res = await listMyProfessionalListings();
        if ((res.listings?.length ?? 0) > 0) {
          onClose();
          hardNavigate(paths.user.professionalsListing);
          return;
        }
      }
      onClose();
      hardNavigate(`${paths.user.realEstateListing}?category=${encodeURIComponent(key)}`);
    })();
  };

  const handleAiImport = () => {
    onClose();
    hardNavigate(paths.user.aiImport);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '70dvh',
            backgroundImage: 'none',
            pb: 'env(safe-area-inset-bottom, 0px)',
          },
        },
      }}
    >
      <Box sx={{ px: 2, pt: 1, pb: 1.5 }}>
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

        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>{t.picker.title}</Typography>
          <IconButton aria-label={t.common.close} onClick={onClose} size="small" edge="end">
            <XIcon size={18} weight="bold" />
          </IconButton>
        </Stack>

        {error && categories.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 1, borderRadius: 2, py: 0.5 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <Stack spacing={0}>
            <Box
              component="button"
              type="button"
              onClick={handleAiImport}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                width: '100%',
                px: 0.5,
                py: 1.2,
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
                  width: 34,
                  height: 34,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  bgcolor: `${AI_SEARCH_BLUE}14`,
                  color: AI_SEARCH_BLUE,
                }}
              >
                <SparkleIcon size={18} weight="duotone" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.25 }}>
                  {t.picker.aiImport}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    lineHeight: 1.3,
                    color: '#9CA3AF',
                  }}
                >
                  {t.picker.aiImportHint}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                height: '1px',
                bgcolor: 'divider',
                opacity: 0.55,
                ml: 6.5,
                mr: 0.5,
              }}
            />

            {options.map((opt, index) => {
              const Icon = categoryIcon(opt.key);
              return (
                <Box key={opt.key}>
                  {index > 0 ? (
                    <Box
                      sx={{
                        height: '1px',
                        bgcolor: 'divider',
                        opacity: 0.55,
                        ml: 6.5,
                        mr: 0.5,
                      }}
                    />
                  ) : null}
                  <Box
                    component="button"
                    type="button"
                    onClick={() => handlePick(opt.key)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      width: '100%',
                      px: 0.5,
                      py: 1.2,
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
                        width: 34,
                        height: 34,
                        borderRadius: 1.5,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        bgcolor: (theme) => `${theme.palette.primary.main}14`,
                        color: 'primary.main',
                      }}
                    >
                      <Icon size={18} weight="duotone" />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.25 }}>
                        {opt.title}
                      </Typography>
                      {opt.hint ? (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            lineHeight: 1.3,
                            color: '#9CA3AF',
                          }}
                        >
                          {opt.hint}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}

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
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
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
import { AI_SEARCH_BLUE, OKAZION_ACCENT, OKAZION_ACCENT_SOFT } from '@/lib/home-categories';
import { paths } from '@/paths';
import type { ListingCategory, ListingCategoryKey } from '@/types/listing-category';
import { useCopy } from '@/hooks/use-copy';
import type { AppMessages } from '@/lib/i18n/messages';

export type AddListingPickOptions = { okazion?: boolean };

/** OKAZION is for sellable ads only — not directory profiles. */
const OKAZION_CATEGORY_KEYS = new Set<ListingCategoryKey>([
  'real-estate',
  'cars',
  'job-listings',
  'marketplace',
]);

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

function navigateToPostCategory(key: ListingCategoryKey, okazion: boolean) {
  const q = new URLSearchParams({ category: key });
  if (okazion) q.set('okazion', '1');
  hardNavigate(`${paths.user.realEstateListing}?${q.toString()}`);
}

export function AddListingPickerDialog({
  open,
  onClose,
  onPick,
  initialOkazion = false,
}: {
  open: boolean;
  onClose: () => void;
  /** When set, called instead of navigating to the post-listing page. */
  onPick?: (key: ListingCategoryKey, opts?: AddListingPickOptions) => void;
  /** Deep-link: open already in “pick category for OKAZION” mode. */
  initialOkazion?: boolean;
}) {
  const t = useCopy();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<ListingCategory[]>([]);
  const [hasBusinessListing, setHasBusinessListing] = React.useState(false);
  const [hasProfessionalListing, setHasProfessionalListing] = React.useState(false);
  const [pickingOkazion, setPickingOkazion] = React.useState(initialOkazion);

  React.useEffect(() => {
    if (!open) return;
    setPickingOkazion(Boolean(initialOkazion));
  }, [open, initialOkazion]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const [catRes, bizRes, proRes] = await Promise.all([
        listCategoriesPublic(),
        listMyBusinessListings(),
        listMyProfessionalListings(),
      ]);
      if (cancelled) return;
      if (catRes.error) setError(catRes.error);
      setCategories(catRes.categories ?? []);
      // Directory profiles: one per account — hide add options when one already exists.
      setHasBusinessListing((bizRes.listings?.length ?? 0) > 0);
      setHasProfessionalListing((proRes.listings?.length ?? 0) > 0);
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
  const allOptions =
    categories.length > 0
      ? categories.map((c) => ({
          key: c.key,
          title: fallbackByKey[c.key]?.title ?? c.title,
          hint: fallbackByKey[c.key]?.hint ?? '',
        }))
      : localizedFallback;
  const availableOptions = allOptions.filter((o) => {
    if (o.key === 'businesses' && hasBusinessListing) return false;
    if (o.key === 'professionals' && hasProfessionalListing) return false;
    return true;
  });
  const options = pickingOkazion
    ? availableOptions.filter((o) => OKAZION_CATEGORY_KEYS.has(o.key))
    : availableOptions;

  const handleCloseRequest = () => {
    // Back out of OKAZION category pick before dismissing the sheet.
    if (pickingOkazion && !initialOkazion) {
      setPickingOkazion(false);
      return;
    }
    onClose();
  };

  const handlePick = (key: ListingCategoryKey) => {
    if (pickingOkazion && !OKAZION_CATEGORY_KEYS.has(key)) return;
    if (onPick) {
      onPick(key, pickingOkazion ? { okazion: true } : undefined);
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
      navigateToPostCategory(key, pickingOkazion);
    })();
  };

  const handleAiImport = () => {
    onClose();
    hardNavigate(paths.user.aiImport);
  };

  const handleOkazion = () => {
    setPickingOkazion(true);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={handleCloseRequest}
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
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1rem',
              color: pickingOkazion ? OKAZION_ACCENT : 'text.primary',
            }}
          >
            {pickingOkazion ? t.picker.okazionTitle : t.picker.title}
          </Typography>
          <IconButton aria-label={t.common.close} onClick={handleCloseRequest} size="small" edge="end">
            <XIcon size={18} weight="bold" />
          </IconButton>
        </Stack>

        {/* Category list is best-effort; localized fallbacks always keep the picker usable. */}
        {error && categories.length === 0 && localizedFallback.length === 0 ? (
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
            {!pickingOkazion ? (
              <>
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

                <Box
                  component="button"
                  type="button"
                  onClick={handleOkazion}
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
                      bgcolor: OKAZION_ACCENT_SOFT,
                      color: OKAZION_ACCENT,
                    }}
                  >
                    <SealPercentIcon size={18} weight="fill" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.25, color: OKAZION_ACCENT }}>
                      {t.picker.okazion}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        lineHeight: 1.3,
                        color: '#9CA3AF',
                      }}
                    >
                      {t.picker.okazionHint}
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
              </>
            ) : null}

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
                        bgcolor: (theme) =>
                          pickingOkazion
                            ? OKAZION_ACCENT_SOFT
                            : `${theme.palette.primary.main}14`,
                        color: pickingOkazion ? OKAZION_ACCENT : 'primary.main',
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

'use client';

import * as React from 'react';
import {
  Alert,
  Box,
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
import { CrownSimple as CrownSimpleIcon } from '@phosphor-icons/react/dist/ssr/CrownSimple';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import {
  listMyBusinessListings,
  listMyProfessionalListings,
} from '@/lib/directory-listings-client';
import { hasUnlimitedDirectoryListings } from '@/lib/directory-listing-limits';
import {
  fetchCategoryQuotas,
  isCategoryQuotaAvailable,
  type CategoryQuotaSnapshot,
} from '@/lib/listing-category-quota-client';
import { listCategoriesPublic } from '@/lib/listings-client';
import { hardNavigate } from '@/lib/hard-navigate';
import { AI_SEARCH_BLUE, AI_SEARCH_BLUE_SOFT, OKAZION_ACCENT, OKAZION_ACCENT_SOFT } from '@/lib/home-categories';
import { paths } from '@/paths';
import type { ListingCategory, ListingCategoryKey } from '@/types/listing-category';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import type { AppMessages } from '@/lib/i18n/messages';

export type AddListingPickOptions = { okazion?: boolean; premium?: boolean };

/** OKAZION is for sellable ads only — not directory profiles. */
const OKAZION_CATEGORY_KEYS = new Set<ListingCategoryKey>([
  'real-estate',
  'cars',
  'job-listings',
  'marketplace',
]);
/** Premium promotes the same post (including businesses / professionals). */
const PREMIUM_CATEGORY_KEYS = new Set<ListingCategoryKey>([
  'real-estate',
  'cars',
  'job-listings',
  'marketplace',
  'businesses',
  'professionals',
]);

/** Preferred order when browsing all listing types. */
const ALL_LISTINGS_ORDER: ListingCategoryKey[] = [
  'real-estate',
  'cars',
  'job-listings',
  'businesses',
  'professionals',
  'marketplace',
];

function fallbackOptions(t: AppMessages): { key: ListingCategoryKey; title: string; hint: string }[] {
  return [
    { key: 'real-estate', title: t.picker.realEstate, hint: t.picker.realEstateHint },
    { key: 'cars', title: t.picker.cars, hint: t.picker.carsHint },
    { key: 'job-listings', title: t.picker.jobs, hint: t.picker.jobsHint },
    { key: 'businesses', title: t.picker.businesses, hint: t.picker.businessesHint },
    { key: 'professionals', title: t.picker.professionals, hint: t.picker.professionalsHint },
    { key: 'marketplace', title: t.picker.marketplace, hint: t.picker.marketplaceHint },
  ];
}

function sortAllListingsOptions<T extends { key: ListingCategoryKey }>(items: T[]): T[] {
  const rank = new Map(ALL_LISTINGS_ORDER.map((k, i) => [k, i]));
  return [...items].sort((a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99));
}

const pickerHintColor = '#9CA3AF';

function PickerRowLabel({
  title,
  hint,
  titleColor,
  titleWeight = 700,
}: {
  title: string;
  hint?: string;
  titleColor?: string;
  titleWeight?: number;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontWeight: titleWeight,
          fontSize: '0.95rem',
          lineHeight: 1.25,
          color: titleColor ?? 'text.primary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </Typography>
      {hint ? (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            lineHeight: 1.3,
            color: pickerHintColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
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
  initialOkazion = false,
  initialPremium = false,
}: {
  open: boolean;
  onClose: () => void;
  /** When set, called instead of navigating to the post-listing page. */
  onPick?: (key: ListingCategoryKey, opts?: AddListingPickOptions) => void;
  /** Deep-link: open already in “pick category for OKAZION” mode. */
  initialOkazion?: boolean;
  /** Deep-link: open already in “pick category for Premium” mode. */
  initialPremium?: boolean;
}) {
  const t = useCopy();
  const { user } = useUser();
  const unlimitedDirectory = hasUnlimitedDirectoryListings(user?.email);
  const [error, setError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<ListingCategory[]>([]);
  const [hasBusinessListing, setHasBusinessListing] = React.useState(false);
  const [hasProfessionalListing, setHasProfessionalListing] = React.useState(false);
  const [categoryQuotas, setCategoryQuotas] = React.useState<CategoryQuotaSnapshot | null>(null);
  const [pickingOkazion, setPickingOkazion] = React.useState(initialOkazion);
  const [pickingPremium, setPickingPremium] = React.useState(false);
  const [pickingAllListings, setPickingAllListings] = React.useState(false);

  useLockBodyScroll(open);

  React.useEffect(() => {
    if (!open) return;
    setPickingOkazion(Boolean(initialOkazion));
    setPickingPremium(Boolean(initialPremium));
    setPickingAllListings(false);
  }, [open, initialOkazion, initialPremium]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    void (async () => {
      const [catRes, bizRes, proRes, quotaRes] = await Promise.all([
        listCategoriesPublic(),
        listMyBusinessListings(),
        listMyProfessionalListings(),
        fetchCategoryQuotas(),
      ]);
      if (cancelled) return;
      if (catRes.error) setError(catRes.error);
      setCategories(catRes.categories ?? []);
      // Directory profiles: one per account — hide add options when one already exists
      // (unless this account is allowlisted for unlimited directory listings).
      setHasBusinessListing(!unlimitedDirectory && (bizRes.listings?.length ?? 0) > 0);
      setHasProfessionalListing(!unlimitedDirectory && (proRes.listings?.length ?? 0) > 0);
      setCategoryQuotas(quotaRes.snapshot ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, unlimitedDirectory]);

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
    : pickingPremium
      ? availableOptions.filter((o) => PREMIUM_CATEGORY_KEYS.has(o.key))
      : pickingAllListings
        ? sortAllListingsOptions(availableOptions)
        : [];

  const handleCloseRequest = () => {
    // Back out of category pick before dismissing the sheet.
    if (
      (pickingOkazion || pickingPremium || pickingAllListings) &&
      !initialOkazion &&
      !initialPremium
    ) {
      setPickingOkazion(false);
      setPickingPremium(false);
      setPickingAllListings(false);
      return;
    }
    onClose();
  };

  const handlePick = (key: ListingCategoryKey) => {
    if (pickingOkazion && !OKAZION_CATEGORY_KEYS.has(key)) return;
    if (pickingPremium && !PREMIUM_CATEGORY_KEYS.has(key)) return;
    if (!isCategoryQuotaAvailable(categoryQuotas, key)) return;
    if (onPick) {
      onPick(key, pickingOkazion ? { okazion: true } : pickingPremium ? { premium: true } : undefined);
      return;
    }
    void (async () => {
      if (key === 'businesses' && !unlimitedDirectory) {
        const res = await listMyBusinessListings();
        if ((res.listings?.length ?? 0) > 0) {
          onClose();
          hardNavigate(paths.user.businessesListing);
          return;
        }
      }
      if (key === 'professionals' && !unlimitedDirectory) {
        const res = await listMyProfessionalListings();
        if ((res.listings?.length ?? 0) > 0) {
          onClose();
          hardNavigate(paths.user.professionalsListing);
          return;
        }
      }
      onClose();
      const q = new URLSearchParams({ category: key });
      if (pickingOkazion) q.set('okazion', '1');
      if (pickingPremium) q.set('premium', '1');
      hardNavigate(`${paths.user.realEstateListing}?${q.toString()}`);
    })();
  };

  const handleAiImport = () => {
    onClose();
    hardNavigate(paths.user.aiImport);
  };

  const handleOkazion = () => {
    setPickingOkazion(true);
    setPickingPremium(false);
    setPickingAllListings(false);
  };

  const handlePremium = () => {
    setPickingPremium(true);
    setPickingOkazion(false);
    setPickingAllListings(false);
  };

  const handleAllListings = () => {
    setPickingAllListings(true);
    setPickingOkazion(false);
    setPickingPremium(false);
  };

  const showRootActions = !pickingOkazion && !pickingPremium && !pickingAllListings;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={handleCloseRequest}
      disableScrollLock
      slotProps={{
        backdrop: {
          sx: {
            // Ensure backdrop eats all pointer/touch events under the sheet.
            pointerEvents: 'auto',
            touchAction: 'none',
          },
        },
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '70dvh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            backgroundImage: 'none',
            pb: 'env(safe-area-inset-bottom, 0px)',
            // Above mobile bottom nav (appBar) so nav cannot be clicked while open.
            zIndex: (theme) => theme.zIndex.modal + 1,
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
            {pickingOkazion
              ? t.picker.okazionTitle
              : pickingPremium
                ? t.picker.premiumTitle
                : pickingAllListings
                  ? t.picker.allListingsTitle
                  : t.picker.title}
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

        <Stack spacing={0}>
            {!showRootActions ? null : (
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
                      bgcolor: AI_SEARCH_BLUE_SOFT,
                      color: AI_SEARCH_BLUE,
                    }}
                  >
                    <SparkleIcon size={18} weight="duotone" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <PickerRowLabel title={t.picker.aiImport} hint={t.picker.aiImportHint} titleColor={AI_SEARCH_BLUE} />
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
                    <SealPercentIcon size={18} weight="regular" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <PickerRowLabel title={t.picker.postAsOkazion} hint={t.picker.okazionHint} titleColor={OKAZION_ACCENT} />
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
                  onClick={handlePremium}
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
                      bgcolor: (theme) => `${theme.palette.warning.main}1f`,
                      color: 'warning.main',
                    }}
                  >
                    <CrownSimpleIcon size={18} weight="regular" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <PickerRowLabel title={t.picker.postAsPremium} hint={t.picker.premiumHint} titleColor="warning.main" />
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
                  onClick={handleAllListings}
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
                      bgcolor: (theme) => `${theme.palette.primary.main}2E`,
                      color: 'primary.main',
                    }}
                  >
                    <SquaresFourIcon size={18} weight="duotone" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <PickerRowLabel
                      title={t.picker.allListings}
                      hint={t.picker.allListingsHint}
                      titleWeight={600}
                    />
                  </Box>
                </Box>
              </>
            )}

            {options.map((opt, index) => {
              const Icon = categoryIcon(opt.key);
              const quotaAvailable = isCategoryQuotaAvailable(categoryQuotas, opt.key);
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
                    disabled={!quotaAvailable}
                    aria-label={quotaAvailable ? opt.title : `${opt.title} — ${t.picker.quotaUnavailable}`}
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
                      cursor: quotaAvailable ? 'pointer' : 'not-allowed',
                      opacity: quotaAvailable ? 1 : 0.5,
                      font: 'inherit',
                      textAlign: 'left',
                      '&:hover': quotaAvailable ? { bgcolor: 'action.hover' } : undefined,
                      '&:active': quotaAvailable ? { bgcolor: 'action.selected' } : undefined,
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
                            : pickingPremium
                              ? `${theme.palette.warning.main}1f`
                            : `${theme.palette.primary.main}2E`,
                        color: pickingOkazion ? OKAZION_ACCENT : pickingPremium ? 'warning.main' : 'primary.main',
                      }}
                    >
                      <Icon size={18} weight="duotone" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <PickerRowLabel
                        title={opt.title}
                        hint={quotaAvailable ? opt.hint : t.picker.quotaUnavailable}
                        titleWeight={600}
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Stack>
      </Box>
    </Drawer>
  );
}

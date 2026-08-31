'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  DialogContentText,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { BuildingOffice as BuildingOfficeIcon } from '@phosphor-icons/react/dist/ssr/BuildingOffice';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Circle as CircleIcon } from '@phosphor-icons/react/dist/ssr/Circle';
import { ListBullets as ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Speedometer as SpeedometerIcon } from '@phosphor-icons/react/dist/ssr/Speedometer';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { format } from 'date-fns';

import type { ListingCategoryKey } from '@/types/listing-category';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { paths } from '@/paths';
import { BUSINESS_CATEGORY_OPTIONS } from '@/lib/business-constants';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { hasUnlimitedDirectoryListings } from '@/lib/directory-listing-limits';
import { type BusinessMineListing, type ProfessionalMineListing } from '@/lib/directory-listings-client';
import { hardNavigate } from '@/lib/hard-navigate';
import { JOB_INDUSTRY_OPTIONS, JOB_TYPE_OPTIONS, WORK_LOCATION_OPTIONS } from '@/lib/job-constants';
import { isJobListingActive } from '@/lib/job-listing-expiry';
import type { BusinessAnnouncement } from '@/lib/listing-announcement-client';
import type { ListingMetricKind, ListingMetrics } from '@/lib/listing-metrics';
import { normalizeListingModerationStatus } from '@/lib/listing-moderation-status';
import { fetchListingAutoRefresh } from '@/lib/listing-refresh-client';
import {
  deleteMyListings,
  listMyListings,
  type CarMineListing,
  type DeleteMyListingItem,
  type JobMineListing,
  type MarketplaceMineListing,
} from '@/lib/listings-client';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import { PROFESSIONAL_CATEGORY_OPTIONS } from '@/lib/professional-constants';
import { propertyCategoryLabel } from '@/lib/real-estate-constants';
import { listingCardImageUrl, storageImageOriginalUrl } from '@/lib/storage-image';
import { useCopy } from '@/hooks/use-copy';
import { useSharedSecondTick } from '@/hooks/use-shared-second-tick';
import { useUser } from '@/hooks/use-user';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { TransientNotification } from '@/components/core/transient-success-alert';
import { JobListingFallback } from '@/components/jobs/job-listing-fallback';
import { BusinessPromoBanner } from '@/components/public/listing-cards/business-promo-banner';
import { AddListingPickerDialog } from '@/components/user/add-listing-picker-dialog';
import { UserPageHeader } from '@/components/user/layout/user-page-header';
import { ListingModerationNotice, ListingSubmittedPendingAlert } from '@/components/user/listing-moderation-notice';
import { ListingModerationStatusChip } from '@/components/user/listing-moderation-status-chip';
import { ListingOwnerMetrics, ListingOwnerTopActions } from '@/components/user/listing-owner-metrics';

function autoRefreshKey(kind: string, listingId: string) {
  return `${kind}:${listingId}`;
}

function refreshCooldownKey(kind: string, listingId: string) {
  return `${kind}:${listingId}`;
}

function listingSelectionKey(kind: ListingMetricKind, listingId: string) {
  return `${kind}:${listingId}`;
}

function parseListingSelectionKey(key: string): DeleteMyListingItem | null {
  const idx = key.indexOf(':');
  if (idx <= 0) return null;
  const kind = key.slice(0, idx) as ListingMetricKind;
  const id = key.slice(idx + 1);
  if (!id) return null;
  return { kind, id };
}

type MyListingsSelectionApi = {
  selectionMode: boolean;
  isSelected: (key: string) => boolean;
  toggleSelected: (key: string) => void;
  requestDelete: (items: DeleteMyListingItem[]) => void;
};

const MyListingsSelectionContext = React.createContext<MyListingsSelectionApi | null>(null);

function useMyListingsSelection() {
  return React.useContext(MyListingsSelectionContext);
}

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

function CardImageHeader({
  imageUrl,
  fallbackContent,
  fallbackIcon: FallbackIcon,
  alt,
  status,
  isPremium = false,
  isOkazion = false,
  isExpired = false,
  bottomOverlay,
  topRightActions,
  selectionMode = false,
  selected = false,
}: {
  imageUrl: string | null;
  fallbackContent?: React.ReactNode;
  fallbackIcon: PhosphorIcon;
  alt: string;
  status: ReturnType<typeof normalizeListingModerationStatus>;
  isPremium?: boolean;
  isOkazion?: boolean;
  isExpired?: boolean;
  bottomOverlay?: React.ReactNode;
  topRightActions?: React.ReactNode;
  selectionMode?: boolean;
  selected?: boolean;
}) {
  const thumbUrl = React.useMemo(() => listingCardImageUrl(imageUrl), [imageUrl]);
  const originalUrl = React.useMemo(() => storageImageOriginalUrl(imageUrl), [imageUrl]);
  const [displaySrc, setDisplaySrc] = React.useState<string | null>(thumbUrl);
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setDisplaySrc(thumbUrl);
    setImageFailed(false);
  }, [thumbUrl]);

  const topLeftLabel = (() => {
    if (selectionMode) return null;
    if (isExpired) {
      return (
        <Chip
          size="small"
          label="Skaduar"
          color="error"
          sx={{ fontWeight: 800, height: 24, fontSize: '0.7rem', '& .MuiChip-label': { px: 1 } }}
        />
      );
    }
    if (isOkazion) {
      return (
        <Chip
          size="small"
          label="OKAZION"
          color="error"
          sx={{ fontWeight: 800, height: 24, fontSize: '0.7rem', '& .MuiChip-label': { px: 1 } }}
        />
      );
    }
    if (isPremium) {
      return (
        <Chip
          size="small"
          label="Premium"
          color="warning"
          sx={{ fontWeight: 800, height: 24, fontSize: '0.7rem', '& .MuiChip-label': { px: 1 } }}
        />
      );
    }
    if (status !== 'approved') return <ListingModerationStatusChip status={status} />;
    return null;
  })();

  const showImage = Boolean(displaySrc) && !imageFailed;

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 7',
        minHeight: 120,
        flexShrink: 0,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
        overflow: 'hidden',
      }}
    >
      {showImage ? (
        <Image
          src={displaySrc!}
          alt={alt}
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
          quality={75}
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          onError={() => {
            if (displaySrc && originalUrl && displaySrc !== originalUrl) {
              setDisplaySrc(originalUrl);
              return;
            }
            setImageFailed(true);
          }}
        />
      ) : fallbackContent ? (
        fallbackContent
      ) : (
        <Stack
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            opacity: 0.4,
          }}
        >
          {React.createElement(FallbackIcon, { size: 44, weight: 'duotone' })}
        </Stack>
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 38%, transparent 58%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      {selectionMode ? (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.22)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            color: selected ? 'primary.main' : 'common.white',
          }}
        >
          {selected ? <CheckCircleIcon size={18} weight="fill" /> : <CircleIcon size={18} weight="bold" />}
        </Box>
      ) : null}
      {topLeftLabel ? <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>{topLeftLabel}</Box> : null}
      {!selectionMode && topRightActions ? (
        <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>{topRightActions}</Box>
      ) : null}
      {bottomOverlay ? (
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2 }}>{bottomOverlay}</Box>
      ) : null}
    </Box>
  );
}

function BaseCard({
  title,
  price,
  location,
  children,
  createdAt,
  metrics,
  status,
  imageUrl,
  fallbackContent,
  fallbackIcon,
  listingId,
  kind,
  autoRefreshEnabled = false,
  onAutoRefreshChange,
  isPremium = false,
  premiumUntil = null,
  isOkazion = false,
  okazionUntil = null,
  isExpired = false,
  onPremiumApplied,
  onOkazionApplied,
  onRefreshed,
  announcement = null,
  onAnnouncementSaved,
  mediaBottomOverlay,
  refreshEveryHours,
  lastRefreshedAt,
}: {
  title: string;
  price?: React.ReactNode;
  location?: string | null;
  children?: React.ReactNode;
  createdAt: string;
  metrics?: Partial<ListingMetrics>;
  status?: string | null;
  imageUrl: string | null;
  fallbackContent?: React.ReactNode;
  fallbackIcon: PhosphorIcon;
  listingId?: string;
  kind?: ListingMetricKind;
  autoRefreshEnabled?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  isPremium?: boolean;
  premiumUntil?: string | null;
  isExpired?: boolean;
  onPremiumApplied?: (result: { premiumUntil: string }) => void;
  isOkazion?: boolean;
  okazionUntil?: string | null;
  onOkazionApplied?: (result: { okazionUntil: string }) => void;
  onRefreshed?: (result: { refreshedAt: string; boostCredits: number }) => void;
  announcement?: BusinessAnnouncement | null;
  onAnnouncementSaved?: (result: {
    announcement: BusinessAnnouncement | null;
    refreshedAt?: string | null;
    boostCredits?: number;
  }) => void;
  mediaBottomOverlay?: React.ReactNode;
  refreshEveryHours?: number;
  lastRefreshedAt?: string | null;
}) {
  const moderationStatus = normalizeListingModerationStatus(status ?? undefined);
  const isPublic = moderationStatus === 'approved';
  const selection = useMyListingsSelection();
  const selectionKey = listingId && kind ? listingSelectionKey(kind, listingId) : null;
  const selectionMode = Boolean(selection?.selectionMode && selectionKey);
  const selected = Boolean(selectionKey && selection?.isSelected(selectionKey));

  return (
    <Card
      elevation={0}
      role={selectionMode ? 'button' : undefined}
      aria-pressed={selectionMode ? selected : undefined}
      aria-label={selectionMode ? (selected ? 'Hiq zgjedhjen' : 'Zgjidh njoftimin') : undefined}
      onClick={selectionMode && selectionKey ? () => selection?.toggleSelected(selectionKey) : undefined}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        opacity: isPublic ? 1 : 0.94,
        boxShadow: selected ? (t) => `0 0 0 1px ${t.palette.primary.main}` : 'none',
        cursor: selectionMode ? 'pointer' : undefined,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          borderColor: selected ? 'primary.main' : isPublic ? 'primary.main' : 'warning.main',
          boxShadow: (t) =>
            selected
              ? `0 0 0 1px ${t.palette.primary.main}`
              : `0 8px 22px ${t.palette.mode === 'dark' ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.07)'}`,
        },
      }}
    >
      <CardImageHeader
        imageUrl={imageUrl}
        fallbackContent={fallbackContent}
        fallbackIcon={fallbackIcon}
        alt={title}
        status={moderationStatus}
        isPremium={isPremium}
        isOkazion={isOkazion}
        isExpired={isExpired}
        bottomOverlay={mediaBottomOverlay}
        selectionMode={selectionMode}
        selected={selected}
        topRightActions={
          listingId && kind ? (
            <ListingOwnerTopActions
              listingId={listingId}
              kind={kind}
              onDeleteRequest={(id, deleteKind) => {
                selection?.requestDelete([{ kind: deleteKind, id }]);
              }}
            />
          ) : undefined
        }
      />
      <CardContent
        sx={{
          p: 1.6,
          '&:last-child': { pb: 1.6 },
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          flex: 1,
          minWidth: 0,
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            component="h2"
            sx={{
              fontWeight: 700,
              fontSize: '0.95rem',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: '0.68rem', flexShrink: 0, pt: 0.2, whiteSpace: 'nowrap' }}
          >
            {format(new Date(createdAt), 'd MMM yyyy')}
          </Typography>
        </Stack>
        {!isPublic ? <ListingModerationNotice status={moderationStatus} /> : null}
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', minWidth: 0 }}
        >
          <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
            {price}
            {children}
          </Stack>
          {location ? (
            <Box sx={{ minWidth: 0, maxWidth: '48%', flexShrink: 0, pt: 0.15 }}>
              <Row icon={MapPinIcon}>{location}</Row>
            </Box>
          ) : null}
        </Stack>
        <Box sx={{ flex: 1 }} />
        {metrics && !selectionMode ? (
          <ListingOwnerMetrics
            metrics={metrics}
            listingId={listingId}
            kind={kind}
            canRefresh={isPublic}
            autoRefreshEnabled={autoRefreshEnabled}
            onAutoRefreshChange={onAutoRefreshChange}
            isPremium={isPremium}
            premiumUntil={premiumUntil}
            isOkazion={isOkazion}
            okazionUntil={okazionUntil}
            onOkazionApplied={onOkazionApplied}
            onPremiumApplied={onPremiumApplied}
            onRefreshed={onRefreshed}
            announcement={announcement}
            onAnnouncementSaved={onAnnouncementSaved}
            lastRefreshedAt={lastRefreshedAt}
            refreshEveryHours={refreshEveryHours}
            hideStats
          />
        ) : null}
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

function markListingPremium<T extends { id: string; isPremium?: boolean; premiumUntil?: string | null }>(
  items: T[],
  listingId: string,
  premiumUntil: string
): T[] {
  return items.map((item) => (item.id === listingId ? { ...item, isPremium: true, premiumUntil } : item));
}

function markListingOkazion<T extends { id: string; isOkazion?: boolean; okazionUntil?: string | null }>(
  items: T[],
  listingId: string,
  okazionUntil: string
): T[] {
  return items.map((item) => (item.id === listingId ? { ...item, isOkazion: true, okazionUntil } : item));
}

function markListingBumped<T extends { id: string; bumpedAt?: string | null }>(
  items: T[],
  listingId: string,
  bumpedAt: string
): T[] {
  return items.map((item) => (item.id === listingId ? { ...item, bumpedAt } : item));
}

function applyDirectoryAnnouncement<
  T extends {
    id: string;
    announcementTitle?: string | null;
    announcementSubtitle?: string | null;
    announcementBannerUrl?: string | null;
    announcementAt?: string | null;
  },
>(items: T[], listingId: string, announcement: BusinessAnnouncement | null, _refreshedAt?: string | null): T[] {
  return items.map((item) => {
    if (item.id !== listingId) return item;
    return {
      ...item,
      announcementTitle: announcement?.title ?? null,
      announcementSubtitle: announcement?.subtitle ?? null,
      announcementBannerUrl: announcement?.bannerUrl ?? null,
      announcementAt: announcement?.announcedAt ?? null,
    };
  });
}

function applyBusinessAnnouncement(
  items: BusinessMineListing[],
  listingId: string,
  announcement: BusinessAnnouncement | null,
  refreshedAt?: string | null
): BusinessMineListing[] {
  return applyDirectoryAnnouncement(items, listingId, announcement, refreshedAt);
}

function RealEstateCard({
  l,
  autoRefreshEnabled,
  onAutoRefreshChange,
  onPremiumApplied,
  onOkazionApplied,
  onRefreshed,
  refreshEveryHours,
  lastRefreshedAt,
}: {
  l: RealEstateMineListing;
  autoRefreshEnabled?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  onPremiumApplied?: (result: { premiumUntil: string }) => void;
  onOkazionApplied?: (result: { okazionUntil: string }) => void;
  onRefreshed?: (result: { refreshedAt: string; boostCredits: number }) => void;
  refreshEveryHours?: number;
  lastRefreshedAt?: string | null;
}) {
  const location = [l.cityName, l.zoneName].filter(Boolean).join(' · ') || '—';
  return (
    <BaseCard
      title={l.title}
      price={
        <Row icon={TagIcon}>
          <strong>{formatPrice(l.price, l.currency)}</strong>
        </Row>
      }
      location={location}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={coverImage(l.imageUrls)}
      fallbackIcon={BuildingsIcon}
      listingId={l.id}
      kind="real-estate"
      autoRefreshEnabled={autoRefreshEnabled}
      onAutoRefreshChange={onAutoRefreshChange}
      isPremium={Boolean(l.isPremium)}
      premiumUntil={l.premiumUntil ?? null}
      isOkazion={Boolean(l.isOkazion)}
      okazionUntil={l.okazionUntil ?? null}
      onPremiumApplied={onPremiumApplied}
      onOkazionApplied={onOkazionApplied}
      onRefreshed={onRefreshed}
      lastRefreshedAt={lastRefreshedAt}
      refreshEveryHours={refreshEveryHours}
    >
      {l.surfaceM2 != null && Number(l.surfaceM2) > 0 ? (
        <Row icon={RulerIcon}>
          <strong>{l.surfaceM2}</strong> m²
          {l.bedrooms != null ? ` · ${l.bedrooms} dhoma · ${l.bathrooms ?? 0} banjo` : ''}
        </Row>
      ) : l.bedrooms != null ? (
        <Row icon={RulerIcon}>
          {l.bedrooms} dhoma · {l.bathrooms ?? 0} banjo
        </Row>
      ) : null}
    </BaseCard>
  );
}

// ---------------------------------------------------------------------------
// Car card
// ---------------------------------------------------------------------------

function CarCard({
  l,
  autoRefreshEnabled,
  onAutoRefreshChange,
  onPremiumApplied,
  onOkazionApplied,
  onRefreshed,
  refreshEveryHours,
  lastRefreshedAt,
}: {
  l: CarMineListing;
  autoRefreshEnabled?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  onPremiumApplied?: (result: { premiumUntil: string }) => void;
  onOkazionApplied?: (result: { okazionUntil: string }) => void;
  onRefreshed?: (result: { refreshedAt: string; boostCredits: number }) => void;
  refreshEveryHours?: number;
  lastRefreshedAt?: string | null;
}) {
  const title = [l.make, l.model, l.variant].filter(Boolean).join(' ');
  return (
    <BaseCard
      title={title}
      price={
        <Row icon={TagIcon}>
          <strong>{formatPrice(l.price, l.currency)}</strong>
        </Row>
      }
      location={l.cityName}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={coverImage(l.imageUrls)}
      fallbackIcon={CarIcon}
      listingId={l.id}
      kind="car"
      autoRefreshEnabled={autoRefreshEnabled}
      onAutoRefreshChange={onAutoRefreshChange}
      isPremium={Boolean(l.isPremium)}
      premiumUntil={l.premiumUntil ?? null}
      isOkazion={Boolean(l.isOkazion)}
      okazionUntil={l.okazionUntil ?? null}
      onPremiumApplied={onPremiumApplied}
      onOkazionApplied={onOkazionApplied}
      onRefreshed={onRefreshed}
      lastRefreshedAt={lastRefreshedAt}
      refreshEveryHours={refreshEveryHours}
    >
      {l.kilometers != null || l.fuelType ? (
        <Row icon={SpeedometerIcon}>
          {l.kilometers != null ? (
            <>
              <strong>{new Intl.NumberFormat('en-GB').format(l.kilometers)}</strong> km
            </>
          ) : null}
          {l.kilometers != null && l.fuelType ? ' · ' : null}
          {l.fuelType || null}
        </Row>
      ) : null}
    </BaseCard>
  );
}

// ---------------------------------------------------------------------------
// Job card
// ---------------------------------------------------------------------------

function JobCard({
  l,
  autoRefreshEnabled,
  onAutoRefreshChange,
  onPremiumApplied,
  onOkazionApplied,
  onRefreshed,
  refreshEveryHours,
  lastRefreshedAt,
}: {
  l: JobMineListing;
  autoRefreshEnabled?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  onPremiumApplied?: (result: { premiumUntil: string }) => void;
  onOkazionApplied?: (result: { okazionUntil: string }) => void;
  onRefreshed?: (result: { refreshedAt: string; boostCredits: number }) => void;
  refreshEveryHours?: number;
  lastRefreshedAt?: string | null;
}) {
  const [initialNowMs] = React.useState(() => Date.now());
  const nowMs = useSharedSecondTick();
  const industryLabel = findLabel(JOB_INDUSTRY_OPTIONS, l.industry);
  const imageUrl = coverImage(l.imageUrls);
  const showMockup = l.coverMode === 'mockup' || (!l.coverMode && !imageUrl);
  const isExpired =
    normalizeListingModerationStatus(l.status) === 'approved' &&
    !isJobListingActive(l.createdAt, new Date(nowMs || initialNowMs), l.bumpedAt);
  return (
    <BaseCard
      title={l.title}
      price={
        l.salary != null ? (
          <Row icon={TagIcon}>
            <strong>{formatPrice(l.salary, l.currency)}</strong> / muaj
          </Row>
        ) : undefined
      }
      location={l.cityName}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={showMockup ? null : imageUrl}
      fallbackContent={
        showMockup ? (
          <JobListingFallback
            position={l.title}
            salary={l.salary != null ? `${formatPrice(l.salary, l.currency)} / muaj` : undefined}
            location={l.cityName}
            seed={l.id}
          />
        ) : undefined
      }
      fallbackIcon={BriefcaseIcon}
      listingId={l.id}
      kind="job"
      autoRefreshEnabled={autoRefreshEnabled}
      onAutoRefreshChange={onAutoRefreshChange}
      isPremium={Boolean(l.isPremium)}
      premiumUntil={l.premiumUntil ?? null}
      isOkazion={Boolean(l.isOkazion)}
      okazionUntil={l.okazionUntil ?? null}
      isExpired={isExpired}
      onPremiumApplied={onPremiumApplied}
      onOkazionApplied={onOkazionApplied}
      onRefreshed={onRefreshed}
      lastRefreshedAt={lastRefreshedAt}
      refreshEveryHours={refreshEveryHours}
    >
      <Row icon={BriefcaseIcon}>{industryLabel}</Row>
    </BaseCard>
  );
}

// ---------------------------------------------------------------------------
// Marketplace card
// ---------------------------------------------------------------------------

function MarketplaceCard({
  l,
  autoRefreshEnabled,
  onAutoRefreshChange,
  onPremiumApplied,
  onOkazionApplied,
  onRefreshed,
  refreshEveryHours,
  lastRefreshedAt,
}: {
  l: MarketplaceMineListing;
  autoRefreshEnabled?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  onPremiumApplied?: (result: { premiumUntil: string }) => void;
  onOkazionApplied?: (result: { okazionUntil: string }) => void;
  onRefreshed?: (result: { refreshedAt: string; boostCredits: number }) => void;
  refreshEveryHours?: number;
  lastRefreshedAt?: string | null;
}) {
  return (
    <BaseCard
      title={l.title}
      price={
        l.price != null ? (
          <Row icon={TagIcon}>
            <strong>{formatPrice(l.price, l.currency)}</strong>
          </Row>
        ) : (
          <Row icon={TagIcon}>Çmimi me marrëveshje</Row>
        )
      }
      location={l.cityName}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={coverImage(l.imageUrls)}
      fallbackIcon={StorefrontIcon}
      listingId={l.id}
      kind="marketplace"
      autoRefreshEnabled={autoRefreshEnabled}
      onAutoRefreshChange={onAutoRefreshChange}
      isPremium={Boolean(l.isPremium)}
      premiumUntil={l.premiumUntil ?? null}
      isOkazion={Boolean(l.isOkazion)}
      okazionUntil={l.okazionUntil ?? null}
      onPremiumApplied={onPremiumApplied}
      onOkazionApplied={onOkazionApplied}
      onRefreshed={onRefreshed}
      lastRefreshedAt={lastRefreshedAt}
      refreshEveryHours={refreshEveryHours}
    ></BaseCard>
  );
}

function BusinessCard({
  l,
  autoRefreshEnabled,
  onAutoRefreshChange,
  onPremiumApplied,
  onRefreshed,
  onAnnouncementSaved,
  refreshEveryHours,
  lastRefreshedAt,
}: {
  l: BusinessMineListing;
  autoRefreshEnabled?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  onPremiumApplied?: (result: { premiumUntil: string }) => void;
  onRefreshed?: (result: { refreshedAt: string; boostCredits: number }) => void;
  onAnnouncementSaved?: (result: {
    announcement: BusinessAnnouncement | null;
    refreshedAt?: string | null;
    boostCredits?: number;
  }) => void;
  refreshEveryHours?: number;
  lastRefreshedAt?: string | null;
}) {
  const announcement: BusinessAnnouncement | null = l.announcementTitle?.trim()
    ? {
        title: l.announcementTitle,
        subtitle: l.announcementSubtitle ?? null,
        bannerUrl: l.announcementBannerUrl ?? null,
        announcedAt: l.announcementAt ?? null,
      }
    : null;

  return (
    <BaseCard
      title={l.title}
      location={l.cityName}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={coverImage(l.imageUrls)}
      fallbackIcon={BuildingOfficeIcon}
      listingId={l.id}
      kind="businesses"
      autoRefreshEnabled={autoRefreshEnabled}
      onAutoRefreshChange={onAutoRefreshChange}
      isPremium={Boolean(l.isPremium)}
      premiumUntil={l.premiumUntil ?? null}
      onPremiumApplied={onPremiumApplied}
      onRefreshed={onRefreshed}
      lastRefreshedAt={lastRefreshedAt}
      refreshEveryHours={refreshEveryHours}
      announcement={announcement}
      onAnnouncementSaved={onAnnouncementSaved}
      mediaBottomOverlay={
        announcement?.title ? (
          <BusinessPromoBanner
            title={announcement.title}
            subtitle={announcement.subtitle}
            bannerUrl={announcement.bannerUrl}
            variant="card"
            overlay
          />
        ) : undefined
      }
    >
      {l.servicesHighlight ? <Row icon={TagIcon}>{l.servicesHighlight}</Row> : null}
    </BaseCard>
  );
}

function ProfessionalCard({
  l,
  autoRefreshEnabled,
  onAutoRefreshChange,
  onPremiumApplied,
  onRefreshed,
  onAnnouncementSaved,
  refreshEveryHours,
  lastRefreshedAt,
}: {
  l: ProfessionalMineListing;
  autoRefreshEnabled?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  onPremiumApplied?: (result: { premiumUntil: string }) => void;
  onRefreshed?: (result: { refreshedAt: string; boostCredits: number }) => void;
  onAnnouncementSaved?: (result: {
    announcement: BusinessAnnouncement | null;
    refreshedAt?: string | null;
    boostCredits?: number;
  }) => void;
  refreshEveryHours?: number;
  lastRefreshedAt?: string | null;
}) {
  const announcement: BusinessAnnouncement | null = l.announcementTitle?.trim()
    ? {
        title: l.announcementTitle,
        subtitle: l.announcementSubtitle ?? null,
        bannerUrl: l.announcementBannerUrl ?? null,
        announcedAt: l.announcementAt ?? null,
      }
    : null;

  return (
    <BaseCard
      title={l.title}
      location={l.cityName}
      createdAt={l.createdAt}
      metrics={l}
      status={l.status}
      imageUrl={coverImage(l.imageUrls)}
      fallbackIcon={UsersIcon}
      listingId={l.id}
      kind="professionals"
      autoRefreshEnabled={autoRefreshEnabled}
      onAutoRefreshChange={onAutoRefreshChange}
      isPremium={Boolean(l.isPremium)}
      premiumUntil={l.premiumUntil ?? null}
      onPremiumApplied={onPremiumApplied}
      onRefreshed={onRefreshed}
      lastRefreshedAt={lastRefreshedAt}
      refreshEveryHours={refreshEveryHours}
      announcement={announcement}
      onAnnouncementSaved={onAnnouncementSaved}
      mediaBottomOverlay={
        announcement?.title ? (
          <BusinessPromoBanner
            title={announcement.title}
            subtitle={announcement.subtitle}
            bannerUrl={announcement.bannerUrl}
            variant="card"
            overlay
          />
        ) : undefined
      }
    >
      {l.servicesHighlight ? <Row icon={TagIcon}>{l.servicesHighlight}</Row> : null}
    </BaseCard>
  );
}

// ---------------------------------------------------------------------------
// Generic tab content
// ---------------------------------------------------------------------------

const MINE_PAGE_SIZE = 24;

function TabGrid<T>({
  loading,
  error,
  items,
  renderCard,
  emptyLabel,
  getKey,
}: {
  loading: boolean;
  error: string | null;
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  emptyLabel?: string;
  getKey?: (item: T, index: number) => string | number;
}) {
  const [visibleCount, setVisibleCount] = React.useState(MINE_PAGE_SIZE);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setVisibleCount(MINE_PAGE_SIZE);
  }, [items]);

  React.useEffect(() => {
    if (visibleCount >= items.length) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((n) => Math.min(items.length, n + MINE_PAGE_SIZE));
        }
      },
      { rootMargin: '400px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length, visibleCount]);

  if (loading) {
    return (
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((k) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={k}>
            <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2.5 }} />
          </Grid>
        ))}
      </Grid>
    );
  }
  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        {error}
      </Alert>
    );
  }
  if (items.length === 0) {
    return (
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
            <ListBulletsIcon size={28} weight="duotone" />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.75 }}>
            Asnjë njoftim
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
            {emptyLabel ?? 'Nuk keni njoftime në këtë kategori ende.'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const visible = items.slice(0, visibleCount);

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {visible.map((item, idx) => (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={getKey?.(item, idx) ?? (item as { id?: string }).id ?? idx}>
            {renderCard(item)}
          </Grid>
        ))}
      </Grid>
      {visibleCount < items.length ? <Box ref={sentinelRef} sx={{ height: 1 }} aria-hidden /> : null}
    </Stack>
  );
}

type CategoryTabKey = 'all' | 'real-estate' | 'car' | 'job' | 'marketplace' | 'businesses' | 'professionals';

type UnifiedMineItem =
  | { key: string; kind: 'real-estate'; createdAt: string; sortAt: string; listing: RealEstateMineListing }
  | { key: string; kind: 'car'; createdAt: string; sortAt: string; listing: CarMineListing }
  | { key: string; kind: 'job'; createdAt: string; sortAt: string; listing: JobMineListing }
  | { key: string; kind: 'marketplace'; createdAt: string; sortAt: string; listing: MarketplaceMineListing }
  | { key: string; kind: 'businesses'; createdAt: string; sortAt: string; listing: BusinessMineListing }
  | { key: string; kind: 'professionals'; createdAt: string; sortAt: string; listing: ProfessionalMineListing };

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function matchesSearch(query: string, parts: Array<string | number | null | undefined>): boolean {
  if (!query) return true;
  const haystack = normalizeSearch(parts.filter((p) => p != null && String(p).trim() !== '').join(' '));
  return haystack.includes(query);
}

function realEstateMatches(l: RealEstateMineListing, query: string): boolean {
  return matchesSearch(query, [
    l.title,
    l.cityName,
    l.zoneName,
    propertyCategoryLabel(l.propertyCategory),
    l.transactionType === 'rent' ? 'Qera' : 'Shitje',
    l.price,
    l.currency,
  ]);
}

function carMatches(l: CarMineListing, query: string): boolean {
  return matchesSearch(query, [
    l.vehicleType,
    l.make,
    l.model,
    l.variant,
    l.year,
    l.fuelType,
    l.transmission,
    l.cityName,
    l.price,
    l.currency,
  ]);
}

function jobMatches(l: JobMineListing, query: string): boolean {
  return matchesSearch(query, [
    l.title,
    l.cityName,
    findLabel(JOB_INDUSTRY_OPTIONS, l.industry),
    findLabel(JOB_TYPE_OPTIONS, l.jobType),
    findLabel(WORK_LOCATION_OPTIONS, l.workLocation),
  ]);
}

function marketplaceMatches(l: MarketplaceMineListing, query: string): boolean {
  return matchesSearch(query, [
    l.title,
    l.cityName,
    findLabel(MARKETPLACE_CATEGORY_OPTIONS, l.category),
    findLabel(MARKETPLACE_CONDITION_OPTIONS, l.condition),
    l.price,
    l.currency,
  ]);
}

function businessMatches(l: BusinessMineListing, query: string): boolean {
  return matchesSearch(query, [
    l.title,
    l.cityName,
    findLabel(BUSINESS_CATEGORY_OPTIONS, l.category),
    l.servicesHighlight,
    'biznes',
  ]);
}

function professionalMatches(l: ProfessionalMineListing, query: string): boolean {
  return matchesSearch(query, [
    l.title,
    l.cityName,
    findLabel(PROFESSIONAL_CATEGORY_OPTIONS, l.category),
    l.servicesHighlight,
    'profesionist',
  ]);
}

function unifiedMatches(item: UnifiedMineItem, query: string): boolean {
  switch (item.kind) {
    case 'real-estate':
      return realEstateMatches(item.listing, query);
    case 'car':
      return carMatches(item.listing, query);
    case 'job':
      return jobMatches(item.listing, query);
    case 'marketplace':
      return marketplaceMatches(item.listing, query);
    case 'businesses':
      return businessMatches(item.listing, query);
    case 'professionals':
      return professionalMatches(item.listing, query);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserMyListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const t = useCopy();
  const [tab, setTab] = React.useState(0);
  const [showSubmittedAlert, setShowSubmittedAlert] = React.useState(false);
  const [addListingOpen, setAddListingOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const searchQuery = React.useMemo(() => normalizeSearch(deferredSearch), [deferredSearch]);
  const hasSearch = searchQuery.length > 0;

  const [reListings, setReListings] = React.useState<RealEstateMineListing[]>([]);
  const [carListings, setCarListings] = React.useState<CarMineListing[]>([]);
  const [jobListings, setJobListings] = React.useState<JobMineListing[]>([]);
  const [mktListings, setMktListings] = React.useState<MarketplaceMineListing[]>([]);
  const [bizListings, setBizListings] = React.useState<BusinessMineListing[]>([]);
  const [proListings, setProListings] = React.useState<ProfessionalMineListing[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [errors, setErrors] = React.useState<(string | null)[]>([null, null, null, null, null, null]);
  const [autoRefreshKeys, setAutoRefreshKeys] = React.useState<Set<string>>(() => new Set());
  const [refreshCooldownByKey, setRefreshCooldownByKey] = React.useState<Record<string, string>>({});
  const [refreshEveryHours, setRefreshEveryHours] = React.useState(48);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(() => new Set());
  const [pendingDeleteItems, setPendingDeleteItems] = React.useState<DeleteMyListingItem[] | null>(null);
  const [deletingListings, setDeletingListings] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const canView =
    Boolean(user) &&
    (user?.accountType === 'individual' || user?.accountType === 'business' || user?.role === 'business-user');

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

    void listMyListings().then((mine) => {
      if (cancelled) return;
      const err = mine.error ?? null;
      setReListings(mine.realEstate ?? []);
      setCarListings(mine.cars ?? []);
      setJobListings(mine.jobs ?? []);
      setMktListings(mine.marketplace ?? []);
      setBizListings(mine.businesses ?? []);
      setProListings(mine.professionals ?? []);
      setErrors([err, err, err, err, err, err]);
      setLoading(false);
    });

    void fetchListingAutoRefresh().then((auto) => {
      if (cancelled) return;
      setAutoRefreshKeys(new Set((auto.enrolled ?? []).map((e) => autoRefreshKey(e.kind, e.listingId))));
      const cooldownMap: Record<string, string> = {};
      for (const cooldown of auto.cooldowns ?? []) {
        if (!cooldown.lastRefreshedAt) continue;
        cooldownMap[refreshCooldownKey(cooldown.kind, cooldown.listingId)] = cooldown.lastRefreshedAt;
      }
      setRefreshCooldownByKey(cooldownMap);
      setRefreshEveryHours(
        auto.refreshEveryHours === 0 ? 0 : Number(auto.refreshEveryHours) > 0 ? Number(auto.refreshEveryHours) : 48
      );
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, canView]);

  const setAutoForListing = React.useCallback((kind: string, listingId: string, enabled: boolean) => {
    setAutoRefreshKeys((prev) => {
      const next = new Set(prev);
      const key = autoRefreshKey(kind, listingId);
      if (enabled) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const enterSelectionMode = React.useCallback((seedKey?: string) => {
    setSelectionMode(true);
    setSelectedKeys(() => (seedKey ? new Set([seedKey]) : new Set()));
    setActionError(null);
  }, []);

  const exitSelectionMode = React.useCallback(() => {
    setSelectionMode(false);
    setSelectedKeys(new Set());
  }, []);

  const toggleSelected = React.useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isSelected = React.useCallback((key: string) => selectedKeys.has(key), [selectedKeys]);

  const requestDelete = React.useCallback((items: DeleteMyListingItem[]) => {
    const unique = [
      ...new Map(
        items.filter((item) => item.kind && item.id).map((item) => [`${item.kind}:${item.id}`, item] as const)
      ).values(),
    ];
    if (!unique.length) return;
    setPendingDeleteItems(unique);
    setActionError(null);
  }, []);

  const removeListingsLocally = React.useCallback((items: DeleteMyListingItem[]) => {
    const byKind = new Map<ListingMetricKind, Set<string>>();
    for (const item of items) {
      const set = byKind.get(item.kind) ?? new Set<string>();
      set.add(item.id);
      byKind.set(item.kind, set);
    }
    const filterOut = <T extends { id: string }>(list: T[], kind: ListingMetricKind) => {
      const ids = byKind.get(kind);
      if (!ids?.size) return list;
      return list.filter((row) => !ids.has(row.id));
    };
    setReListings((prev) => filterOut(prev, 'real-estate'));
    setCarListings((prev) => filterOut(prev, 'car'));
    setJobListings((prev) => filterOut(prev, 'job'));
    setMktListings((prev) => filterOut(prev, 'marketplace'));
    setBizListings((prev) => filterOut(prev, 'businesses'));
    setProListings((prev) => filterOut(prev, 'professionals'));
    setAutoRefreshKeys((prev) => {
      const next = new Set(prev);
      for (const item of items) next.delete(autoRefreshKey(item.kind, item.id));
      return next;
    });
    setRefreshCooldownByKey((prev) => {
      const next = { ...prev };
      for (const item of items) delete next[refreshCooldownKey(item.kind, item.id)];
      return next;
    });
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const item of items) next.delete(listingSelectionKey(item.kind, item.id));
      return next;
    });
  }, []);

  const confirmDeleteListings = React.useCallback(async () => {
    if (!pendingDeleteItems?.length || deletingListings) return;
    setDeletingListings(true);
    setActionError(null);
    const res = await deleteMyListings(pendingDeleteItems);
    setDeletingListings(false);
    if (res.error && (!res.deleted || res.deleted.length === 0)) {
      setActionError(res.error);
      return;
    }
    if (res.deleted?.length) removeListingsLocally(res.deleted);
    if (res.failed?.length && res.deleted?.length) {
      setActionError(res.error ?? `Disa njoftime nuk u fshinë (${res.failed.length}).`);
    } else if (res.failed?.length) {
      setActionError(res.failed[0]?.message ?? res.error ?? 'Njoftimet nuk u fshinë.');
      return;
    }
    setPendingDeleteItems(null);
    exitSelectionMode();
  }, [pendingDeleteItems, deletingListings, removeListingsLocally, exitSelectionMode]);

  const selectionApi = React.useMemo<MyListingsSelectionApi>(
    () => ({
      selectionMode,
      isSelected,
      toggleSelected,
      requestDelete,
    }),
    [selectionMode, isSelected, toggleSelected, requestDelete]
  );

  const selectedCount = selectedKeys.size;
  const totalListingsCount =
    reListings.length +
    carListings.length +
    jobListings.length +
    mktListings.length +
    bizListings.length +
    proListings.length;

  const unifiedItems = React.useMemo<UnifiedMineItem[]>(() => {
    const sortAtOf = (listing: { createdAt: string; updatedAt?: string | null }) =>
      listing.updatedAt || listing.createdAt;
    const items: UnifiedMineItem[] = [
      ...reListings.map((listing) => ({
        key: `real-estate:${listing.id}`,
        kind: 'real-estate' as const,
        createdAt: listing.createdAt,
        sortAt: sortAtOf(listing),
        listing,
      })),
      ...carListings.map((listing) => ({
        key: `car:${listing.id}`,
        kind: 'car' as const,
        createdAt: listing.createdAt,
        sortAt: sortAtOf(listing),
        listing,
      })),
      ...jobListings.map((listing) => ({
        key: `job:${listing.id}`,
        kind: 'job' as const,
        createdAt: listing.createdAt,
        sortAt: sortAtOf(listing),
        listing,
      })),
      ...mktListings.map((listing) => ({
        key: `marketplace:${listing.id}`,
        kind: 'marketplace' as const,
        createdAt: listing.createdAt,
        sortAt: sortAtOf(listing),
        listing,
      })),
      ...bizListings.map((listing) => ({
        key: `businesses:${listing.id}`,
        kind: 'businesses' as const,
        createdAt: listing.createdAt,
        sortAt: sortAtOf(listing),
        listing,
      })),
      ...proListings.map((listing) => ({
        key: `professionals:${listing.id}`,
        kind: 'professionals' as const,
        createdAt: listing.createdAt,
        sortAt: sortAtOf(listing),
        listing,
      })),
    ];
    items.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime());
    return items;
  }, [reListings, carListings, jobListings, mktListings, bizListings, proListings]);

  const filteredRe = React.useMemo(
    () => (hasSearch ? reListings.filter((l) => realEstateMatches(l, searchQuery)) : reListings),
    [reListings, hasSearch, searchQuery]
  );
  const filteredCars = React.useMemo(
    () => (hasSearch ? carListings.filter((l) => carMatches(l, searchQuery)) : carListings),
    [carListings, hasSearch, searchQuery]
  );
  const filteredJobs = React.useMemo(
    () => (hasSearch ? jobListings.filter((l) => jobMatches(l, searchQuery)) : jobListings),
    [jobListings, hasSearch, searchQuery]
  );
  const filteredMkt = React.useMemo(
    () => (hasSearch ? mktListings.filter((l) => marketplaceMatches(l, searchQuery)) : mktListings),
    [mktListings, hasSearch, searchQuery]
  );
  const filteredBiz = React.useMemo(
    () => (hasSearch ? bizListings.filter((l) => businessMatches(l, searchQuery)) : bizListings),
    [bizListings, hasSearch, searchQuery]
  );
  const filteredPro = React.useMemo(
    () => (hasSearch ? proListings.filter((l) => professionalMatches(l, searchQuery)) : proListings),
    [proListings, hasSearch, searchQuery]
  );
  const filteredUnified = React.useMemo(
    () => (hasSearch ? unifiedItems.filter((item) => unifiedMatches(item, searchQuery)) : unifiedItems),
    [unifiedItems, hasSearch, searchQuery]
  );

  const handleAddListingPick = React.useCallback(
    (key: ListingCategoryKey, opts?: { okazion?: boolean; premium?: boolean }) => {
      const unlimitedDirectory = hasUnlimitedDirectoryListings(user?.email);
      if (key === 'businesses' && bizListings.length > 0 && !unlimitedDirectory) {
        setAddListingOpen(false);
        hardNavigate(paths.user.businessesListing);
        return;
      }
      if (key === 'professionals' && proListings.length > 0 && !unlimitedDirectory) {
        setAddListingOpen(false);
        hardNavigate(paths.user.professionalsListing);
        return;
      }
      setAddListingOpen(false);
      const q = new URLSearchParams({ category: key });
      if (opts?.okazion) q.set('okazion', '1');
      if (opts?.premium) q.set('premium', '1');
      hardNavigate(`${paths.user.realEstateListing}?${q.toString()}`);
    },
    [bizListings.length, proListings.length, user?.email]
  );

  if (!user || !canView) return null;

  const pendingCount = [
    ...reListings,
    ...carListings,
    ...jobListings,
    ...mktListings,
    ...bizListings,
    ...proListings,
  ].filter((l) => normalizeListingModerationStatus(l.status) === 'pending').length;

  const searchEmptyLabel = hasSearch ? `Nuk u gjet asnjë njoftim për «${deferredSearch.trim()}».` : undefined;

  const tabs: {
    key: CategoryTabKey;
    label: string;
    icon: React.ReactNode;
    count: number;
    pending: number;
  }[] = [
    {
      key: 'all',
      label: 'Të gjitha kategoritë',
      icon: <SquaresFourIcon size={16} weight="duotone" />,
      count: filteredUnified.length,
      pending: pendingCount,
    },
    {
      key: 'real-estate',
      label: 'Pasuri',
      icon: <BuildingsIcon size={16} weight="duotone" />,
      count: filteredRe.length,
      pending: filteredRe.filter((l) => normalizeListingModerationStatus(l.status) === 'pending').length,
    },
    {
      key: 'car',
      label: 'Makina',
      icon: <CarIcon size={16} weight="duotone" />,
      count: filteredCars.length,
      pending: filteredCars.filter((l) => normalizeListingModerationStatus(l.status) === 'pending').length,
    },
    {
      key: 'job',
      label: 'Punë',
      icon: <BriefcaseIcon size={16} weight="duotone" />,
      count: filteredJobs.length,
      pending: filteredJobs.filter((l) => normalizeListingModerationStatus(l.status) === 'pending').length,
    },
    {
      key: 'marketplace',
      label: 'Tregu',
      icon: <StorefrontIcon size={16} weight="duotone" />,
      count: filteredMkt.length,
      pending: filteredMkt.filter((l) => normalizeListingModerationStatus(l.status) === 'pending').length,
    },
    {
      key: 'businesses',
      label: 'Biznese',
      icon: <BuildingOfficeIcon size={16} weight="duotone" />,
      count: filteredBiz.length,
      pending: filteredBiz.filter((l) => normalizeListingModerationStatus(l.status) === 'pending').length,
    },
    {
      key: 'professionals',
      label: 'Profesionistë',
      icon: <UsersIcon size={16} weight="duotone" />,
      count: filteredPro.length,
      pending: filteredPro.filter((l) => normalizeListingModerationStatus(l.status) === 'pending').length,
    },
  ];

  const activeKey = tabs[tab]?.key ?? 'all';
  const allError = errors.find(Boolean) ?? null;

  const renderUnifiedCard = (item: UnifiedMineItem) => {
    switch (item.kind) {
      case 'real-estate':
        return (
          <RealEstateCard
            l={item.listing}
            autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('real-estate', item.listing.id))}
            onAutoRefreshChange={(enabled) => setAutoForListing('real-estate', item.listing.id, enabled)}
            onPremiumApplied={({ premiumUntil }) => {
              setReListings((prev) => markListingPremium(prev, item.listing.id, premiumUntil));
            }}
            onOkazionApplied={({ okazionUntil }) => {
              setReListings((prev) => markListingOkazion(prev, item.listing.id, okazionUntil));
            }}
            lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('real-estate', item.listing.id)] ?? null}
            refreshEveryHours={refreshEveryHours}
            onRefreshed={({ refreshedAt }) => {
              setRefreshCooldownByKey((prev) => ({
                ...prev,
                [refreshCooldownKey('real-estate', item.listing.id)]: refreshedAt,
              }));
            }}
          />
        );
      case 'car':
        return (
          <CarCard
            l={item.listing}
            autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('car', item.listing.id))}
            onAutoRefreshChange={(enabled) => setAutoForListing('car', item.listing.id, enabled)}
            onPremiumApplied={({ premiumUntil }) => {
              setCarListings((prev) => markListingPremium(prev, item.listing.id, premiumUntil));
            }}
            onOkazionApplied={({ okazionUntil }) => {
              setCarListings((prev) => markListingOkazion(prev, item.listing.id, okazionUntil));
            }}
            lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('car', item.listing.id)] ?? null}
            refreshEveryHours={refreshEveryHours}
            onRefreshed={({ refreshedAt }) => {
              setRefreshCooldownByKey((prev) => ({
                ...prev,
                [refreshCooldownKey('car', item.listing.id)]: refreshedAt,
              }));
            }}
          />
        );
      case 'job':
        return (
          <JobCard
            l={item.listing}
            autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('job', item.listing.id))}
            onAutoRefreshChange={(enabled) => setAutoForListing('job', item.listing.id, enabled)}
            onPremiumApplied={({ premiumUntil }) => {
              setJobListings((prev) => markListingPremium(prev, item.listing.id, premiumUntil));
            }}
            onOkazionApplied={({ okazionUntil }) => {
              setJobListings((prev) => markListingOkazion(prev, item.listing.id, okazionUntil));
            }}
            lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('job', item.listing.id)] ?? null}
            refreshEveryHours={refreshEveryHours}
            onRefreshed={({ refreshedAt }) => {
              setJobListings((prev) => markListingBumped(prev, item.listing.id, refreshedAt));
              setRefreshCooldownByKey((prev) => ({
                ...prev,
                [refreshCooldownKey('job', item.listing.id)]: refreshedAt,
              }));
            }}
          />
        );
      case 'marketplace':
        return (
          <MarketplaceCard
            l={item.listing}
            autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('marketplace', item.listing.id))}
            onAutoRefreshChange={(enabled) => setAutoForListing('marketplace', item.listing.id, enabled)}
            onPremiumApplied={({ premiumUntil }) => {
              setMktListings((prev) => markListingPremium(prev, item.listing.id, premiumUntil));
            }}
            onOkazionApplied={({ okazionUntil }) => {
              setMktListings((prev) => markListingOkazion(prev, item.listing.id, okazionUntil));
            }}
            lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('marketplace', item.listing.id)] ?? null}
            refreshEveryHours={refreshEveryHours}
            onRefreshed={({ refreshedAt }) => {
              setRefreshCooldownByKey((prev) => ({
                ...prev,
                [refreshCooldownKey('marketplace', item.listing.id)]: refreshedAt,
              }));
            }}
          />
        );
      case 'businesses':
        return (
          <BusinessCard
            l={item.listing}
            autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('businesses', item.listing.id))}
            onAutoRefreshChange={(enabled) => setAutoForListing('businesses', item.listing.id, enabled)}
            onPremiumApplied={({ premiumUntil }) => {
              setBizListings((prev) => markListingPremium(prev, item.listing.id, premiumUntil));
            }}
            lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('businesses', item.listing.id)] ?? null}
            refreshEveryHours={refreshEveryHours}
            onRefreshed={({ refreshedAt }) => {
              setRefreshCooldownByKey((prev) => ({
                ...prev,
                [refreshCooldownKey('businesses', item.listing.id)]: refreshedAt,
              }));
            }}
            onAnnouncementSaved={({ announcement, refreshedAt }) => {
              if (refreshedAt) {
                setRefreshCooldownByKey((prev) => ({
                  ...prev,
                  [refreshCooldownKey('businesses', item.listing.id)]: refreshedAt,
                }));
              }
              setBizListings((prev) => applyBusinessAnnouncement(prev, item.listing.id, announcement, refreshedAt));
            }}
          />
        );
      case 'professionals':
        return (
          <ProfessionalCard
            l={item.listing}
            autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('professionals', item.listing.id))}
            onAutoRefreshChange={(enabled) => setAutoForListing('professionals', item.listing.id, enabled)}
            onPremiumApplied={({ premiumUntil }) => {
              setProListings((prev) => markListingPremium(prev, item.listing.id, premiumUntil));
            }}
            lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('professionals', item.listing.id)] ?? null}
            refreshEveryHours={refreshEveryHours}
            onRefreshed={({ refreshedAt }) => {
              setRefreshCooldownByKey((prev) => ({
                ...prev,
                [refreshCooldownKey('professionals', item.listing.id)]: refreshedAt,
              }));
            }}
            onAnnouncementSaved={({ announcement, refreshedAt }) => {
              if (refreshedAt) {
                setRefreshCooldownByKey((prev) => ({
                  ...prev,
                  [refreshCooldownKey('professionals', item.listing.id)]: refreshedAt,
                }));
              }
              setProListings((prev) => applyDirectoryAnnouncement(prev, item.listing.id, announcement, refreshedAt));
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <MyListingsSelectionContext.Provider value={selectionApi}>
      <Stack spacing={{ xs: 2.5, md: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <UserPageHeader
            icon={<ListBulletsIcon size={20} weight="duotone" />}
            title={t.nav.myListings}
            description="Menaxhoni njoftimet tuaja sipas kategorisë."
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, mt: 0.15 }}>
            {!loading && totalListingsCount > 0 && !selectionMode ? (
              <IconButton
                color="inherit"
                aria-label={t.myListings.selectModeAria}
                onClick={() => enterSelectionMode()}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.secondary',
                  '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                }}
              >
                <CheckCircleIcon size={20} weight="bold" />
              </IconButton>
            ) : null}
            <IconButton
              color="primary"
              aria-label="Posto njoftim"
              onClick={() => setAddListingOpen(true)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.25,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <PlusIcon size={20} weight="bold" />
            </IconButton>
          </Stack>
        </Stack>

        {showSubmittedAlert ? <ListingSubmittedPendingAlert /> : null}

        {actionError ? (
          <TransientNotification
            severity="error"
            message={actionError}
            onDismiss={() => setActionError(null)}
            sx={{ borderRadius: 2 }}
          />
        ) : null}

        {!loading && pendingCount > 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Keni <strong>{pendingCount}</strong> {pendingCount === 1 ? 'njoftim' : 'njoftime'} që nuk shfaqen ende
            publikisht.
          </Alert>
        ) : null}

        {selectionMode ? (
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 40, gap: 1 }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary', minWidth: 0 }}>
              {t.myListings.selectedCount(selectedCount)}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Button
                type="button"
                size="small"
                color="error"
                disabled={selectedCount === 0 || deletingListings}
                startIcon={<TrashIcon size={14} weight="bold" />}
                onClick={() => {
                  const items = [...selectedKeys]
                    .map(parseListingSelectionKey)
                    .filter((item): item is DeleteMyListingItem => Boolean(item));
                  requestDelete(items);
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  minWidth: 0,
                  px: 0.75,
                }}
              >
                {t.myListings.deleteListings(selectedCount || 1)}
              </Button>
              <Button
                type="button"
                size="small"
                onClick={exitSelectionMode}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  minWidth: 0,
                  px: 0.5,
                  color: 'text.secondary',
                }}
              >
                {t.common.cancel}
              </Button>
            </Stack>
          </Stack>
        ) : null}

        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Kërko njoftimet e tua…"
          aria-label="Kërko njoftimet e tua"
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
                  <IconButton size="small" aria-label="Pastro kërkimin" onClick={() => setSearch('')} edge="end">
                    <XIcon size={16} weight="bold" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2.5,
              bgcolor: 'background.paper',
            },
          }}
        />

        <Box
          role="tablist"
          aria-label="Filtro sipas kategorisë"
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
            {tabs.map((tabItem, i) => {
              const active = tab === i;
              return (
                <Box
                  key={tabItem.key}
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
                    border: '1px solid',
                    borderColor: active ? 'primary.main' : 'divider',
                    bgcolor: active ? primaryMainAlpha(0.12) : 'background.paper',
                    color: active ? 'primary.main' : 'text.primary',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    lineHeight: 1.2,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      bgcolor: primaryMainAlpha(0.08),
                    },
                  }}
                >
                  <Box component="span" sx={{ display: 'inline-flex', color: 'inherit' }}>
                    {tabItem.icon}
                  </Box>
                  {tabItem.label}
                  {!loading && tabItem.count > 0 ? (
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
                      {tabItem.count}
                    </Box>
                  ) : null}
                  {!loading && tabItem.pending > 0 && tabItem.key !== 'all' ? (
                    <Box
                      component="span"
                      sx={{
                        height: 20,
                        px: 0.7,
                        borderRadius: 999,
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(245, 166, 35, 0.18)' : 'rgba(245, 166, 35, 0.14)',
                        color: 'warning.main',
                      }}
                    >
                      {tabItem.pending} në pritje
                    </Box>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Box>
          {activeKey === 'all' ? (
            <TabGrid
              loading={loading}
              error={allError}
              items={filteredUnified}
              getKey={(item) => item.key}
              emptyLabel={searchEmptyLabel ?? 'Nuk keni postuar asnjë njoftim ende. Prekni butonin + për të filluar.'}
              renderCard={renderUnifiedCard}
            />
          ) : null}
          {activeKey === 'real-estate' ? (
            <TabGrid
              loading={loading}
              error={errors[0]}
              items={filteredRe}
              emptyLabel={searchEmptyLabel}
              renderCard={(l) => (
                <RealEstateCard
                  l={l}
                  autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('real-estate', l.id))}
                  onAutoRefreshChange={(enabled) => setAutoForListing('real-estate', l.id, enabled)}
                  onPremiumApplied={({ premiumUntil }) => {
                    setReListings((prev) => markListingPremium(prev, l.id, premiumUntil));
                  }}
                  onOkazionApplied={({ okazionUntil }) => {
                    setReListings((prev) => markListingOkazion(prev, l.id, okazionUntil));
                  }}
                  lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('real-estate', l.id)] ?? null}
                  refreshEveryHours={refreshEveryHours}
                  onRefreshed={({ refreshedAt }) => {
                    setRefreshCooldownByKey((prev) => ({
                      ...prev,
                      [refreshCooldownKey('real-estate', l.id)]: refreshedAt,
                    }));
                  }}
                />
              )}
            />
          ) : null}
          {activeKey === 'car' ? (
            <TabGrid
              loading={loading}
              error={errors[1]}
              items={filteredCars}
              emptyLabel={searchEmptyLabel}
              renderCard={(l) => (
                <CarCard
                  l={l}
                  autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('car', l.id))}
                  onAutoRefreshChange={(enabled) => setAutoForListing('car', l.id, enabled)}
                  onPremiumApplied={({ premiumUntil }) => {
                    setCarListings((prev) => markListingPremium(prev, l.id, premiumUntil));
                  }}
                  onOkazionApplied={({ okazionUntil }) => {
                    setCarListings((prev) => markListingOkazion(prev, l.id, okazionUntil));
                  }}
                  lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('car', l.id)] ?? null}
                  refreshEveryHours={refreshEveryHours}
                  onRefreshed={({ refreshedAt }) => {
                    setRefreshCooldownByKey((prev) => ({
                      ...prev,
                      [refreshCooldownKey('car', l.id)]: refreshedAt,
                    }));
                  }}
                />
              )}
            />
          ) : null}
          {activeKey === 'job' ? (
            <TabGrid
              loading={loading}
              error={errors[2]}
              items={filteredJobs}
              emptyLabel={searchEmptyLabel}
              renderCard={(l) => (
                <JobCard
                  l={l}
                  autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('job', l.id))}
                  onAutoRefreshChange={(enabled) => setAutoForListing('job', l.id, enabled)}
                  onPremiumApplied={({ premiumUntil }) => {
                    setJobListings((prev) => markListingPremium(prev, l.id, premiumUntil));
                  }}
                  onOkazionApplied={({ okazionUntil }) => {
                    setJobListings((prev) => markListingOkazion(prev, l.id, okazionUntil));
                  }}
                  lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('job', l.id)] ?? null}
                  refreshEveryHours={refreshEveryHours}
                  onRefreshed={({ refreshedAt }) => {
                    setJobListings((prev) => markListingBumped(prev, l.id, refreshedAt));
                    setRefreshCooldownByKey((prev) => ({
                      ...prev,
                      [refreshCooldownKey('job', l.id)]: refreshedAt,
                    }));
                  }}
                />
              )}
            />
          ) : null}
          {activeKey === 'marketplace' ? (
            <TabGrid
              loading={loading}
              error={errors[3]}
              items={filteredMkt}
              emptyLabel={searchEmptyLabel}
              renderCard={(l) => (
                <MarketplaceCard
                  l={l}
                  autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('marketplace', l.id))}
                  onAutoRefreshChange={(enabled) => setAutoForListing('marketplace', l.id, enabled)}
                  onPremiumApplied={({ premiumUntil }) => {
                    setMktListings((prev) => markListingPremium(prev, l.id, premiumUntil));
                  }}
                  onOkazionApplied={({ okazionUntil }) => {
                    setMktListings((prev) => markListingOkazion(prev, l.id, okazionUntil));
                  }}
                  lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('marketplace', l.id)] ?? null}
                  refreshEveryHours={refreshEveryHours}
                  onRefreshed={({ refreshedAt }) => {
                    setRefreshCooldownByKey((prev) => ({
                      ...prev,
                      [refreshCooldownKey('marketplace', l.id)]: refreshedAt,
                    }));
                  }}
                />
              )}
            />
          ) : null}
          {activeKey === 'businesses' ? (
            <TabGrid
              loading={loading}
              error={errors[4]}
              items={filteredBiz}
              emptyLabel={searchEmptyLabel ?? 'Nuk keni profil biznesi ende. Mund të krijoni vetëm një profil biznesi.'}
              renderCard={(l) => (
                <BusinessCard
                  l={l}
                  autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('businesses', l.id))}
                  onAutoRefreshChange={(enabled) => setAutoForListing('businesses', l.id, enabled)}
                  onPremiumApplied={({ premiumUntil }) => {
                    setBizListings((prev) => markListingPremium(prev, l.id, premiumUntil));
                  }}
                  lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('businesses', l.id)] ?? null}
                  refreshEveryHours={refreshEveryHours}
                  onRefreshed={({ refreshedAt }) => {
                    setRefreshCooldownByKey((prev) => ({
                      ...prev,
                      [refreshCooldownKey('businesses', l.id)]: refreshedAt,
                    }));
                  }}
                  onAnnouncementSaved={({ announcement, refreshedAt }) => {
                    if (refreshedAt) {
                      setRefreshCooldownByKey((prev) => ({
                        ...prev,
                        [refreshCooldownKey('businesses', l.id)]: refreshedAt,
                      }));
                    }
                    setBizListings((prev) => applyBusinessAnnouncement(prev, l.id, announcement, refreshedAt));
                  }}
                />
              )}
            />
          ) : null}
          {activeKey === 'professionals' ? (
            <TabGrid
              loading={loading}
              error={errors[5]}
              items={filteredPro}
              emptyLabel={
                searchEmptyLabel ??
                'Nuk keni profil profesionisti ende. Mund të krijoni vetëm një profil profesionisti.'
              }
              renderCard={(l) => (
                <ProfessionalCard
                  l={l}
                  autoRefreshEnabled={autoRefreshKeys.has(autoRefreshKey('professionals', l.id))}
                  onAutoRefreshChange={(enabled) => setAutoForListing('professionals', l.id, enabled)}
                  onPremiumApplied={({ premiumUntil }) => {
                    setProListings((prev) => markListingPremium(prev, l.id, premiumUntil));
                  }}
                  lastRefreshedAt={refreshCooldownByKey[refreshCooldownKey('professionals', l.id)] ?? null}
                  refreshEveryHours={refreshEveryHours}
                  onRefreshed={({ refreshedAt }) => {
                    setRefreshCooldownByKey((prev) => ({
                      ...prev,
                      [refreshCooldownKey('professionals', l.id)]: refreshedAt,
                    }));
                  }}
                  onAnnouncementSaved={({ announcement, refreshedAt }) => {
                    if (refreshedAt) {
                      setRefreshCooldownByKey((prev) => ({
                        ...prev,
                        [refreshCooldownKey('professionals', l.id)]: refreshedAt,
                      }));
                    }
                    setProListings((prev) => applyDirectoryAnnouncement(prev, l.id, announcement, refreshedAt));
                  }}
                />
              )}
            />
          ) : null}
        </Box>

        <AddListingPickerDialog
          open={addListingOpen}
          onClose={() => setAddListingOpen(false)}
          onPick={handleAddListingPick}
        />

        <ProductDialog
          open={Boolean(pendingDeleteItems?.length)}
          onClose={deletingListings ? undefined : () => setPendingDeleteItems(null)}
          maxWidth="xs"
          fullWidth
        >
          <ProductDialogTitle onClose={deletingListings ? undefined : () => setPendingDeleteItems(null)}>
            {(pendingDeleteItems?.length ?? 0) > 1
              ? t.myListings.deleteConfirmManyTitle(pendingDeleteItems!.length)
              : t.myListings.deleteConfirmTitle}
          </ProductDialogTitle>
          <ProductDialogContent>
            <DialogContentText sx={{ m: 0, color: 'text.secondary' }}>
              {(pendingDeleteItems?.length ?? 0) > 1
                ? t.myListings.deleteConfirmManyBody
                : t.myListings.deleteConfirmBody}
            </DialogContentText>
          </ProductDialogContent>
          <ProductDialogActions>
            <Button
              onClick={() => setPendingDeleteItems(null)}
              disabled={deletingListings}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {t.common.cancel}
            </Button>
            <Button
              color="error"
              variant="contained"
              disabled={deletingListings}
              onClick={() => void confirmDeleteListings()}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              {deletingListings ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                t.myListings.deleteListings(pendingDeleteItems?.length ?? 1)
              )}
            </Button>
          </ProductDialogActions>
        </ProductDialog>
      </Stack>
    </MyListingsSelectionContext.Provider>
  );
}

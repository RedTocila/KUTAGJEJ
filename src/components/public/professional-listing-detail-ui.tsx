'use client';

import * as React from 'react';
import Image from 'next/image';
import { Box, Button, Grid, IconButton, Stack, Typography } from '@mui/material';
import type { ProfessionalPortfolioItem } from '@/lib/professional-listing-detail-content';
import { ProductDialog } from '@/components/core/product-dialog';
import { formatRatingDisplay } from '@/lib/format-rating';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { emitListingPhotoView } from '@/lib/listing-hot-lead';
import type { ListingMetricKind } from '@/lib/listing-metrics';
import { productPanelSx } from '@/styles/product-sx';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { StarHalf as StarHalfIcon } from '@phosphor-icons/react/dist/ssr/StarHalf';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

const FONT_CAPTION = '0.75rem';
const FONT_BODY = '0.875rem';

/** Google-style 5 stars — full, half, or empty from a 0–5 rating (e.g. 4.7). */
export function ProfessionalFiveStarRating({
  value,
  size = 14,
  'aria-label': ariaLabel,
}: {
  value: number | string;
  size?: number;
  'aria-label'?: string;
}) {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  const clamped = Math.min(5, Math.max(0, Number.isFinite(numeric) ? numeric : 0));

  return (
    <Stack
      direction="row"
      spacing={0.15}
      component="span"
      role="img"
      aria-label={ariaLabel ?? `${formatRatingDisplay(clamped)} nga 5 yje`}
      sx={{ alignItems: 'center', lineHeight: 0 }}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const diff = clamped - index;
        if (diff >= 0.875) {
          return (
            <StarIcon
              key={index}
              size={size}
              weight="fill"
              color="var(--mui-palette-warning-main)"
              aria-hidden
            />
          );
        }
        if (diff >= 0.125) {
          return (
            <StarHalfIcon
              key={index}
              size={size}
              weight="fill"
              color="var(--mui-palette-warning-main)"
              aria-hidden
            />
          );
        }
        return (
          <StarIcon
            key={index}
            size={size}
            weight="regular"
            color="var(--mui-palette-text-disabled)"
            aria-hidden
          />
        );
      })}
    </Stack>
  );
}

/** Numeric score + stars + review count (header next to location). */
export function ProfessionalRatingSummary({
  rating,
  reviewCount,
  starSize = 14,
  showReviewLabel = false,
}: {
  rating: string;
  reviewCount: number;
  starSize?: number;
  /** When true, shows `(N vlerësime)` instead of `(N)`. */
  showReviewLabel?: boolean;
}) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
      <Typography sx={{ fontWeight: 800, fontSize: starSize >= 16 ? FONT_BODY : FONT_CAPTION, lineHeight: 1 }}>
        {rating}
      </Typography>
      <ProfessionalFiveStarRating value={rating} size={starSize} />
      <Typography
        sx={{
          fontSize: showReviewLabel ? '0.85rem' : '0.625rem',
          color: 'text.secondary',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {showReviewLabel ? `(${reviewCount} vlerësime)` : `(${reviewCount})`}
      </Typography>
    </Stack>
  );
}

/** Shield with check — inline (e.g. inside a primary pill on job detail). */
export function ListingVerifiedShieldBadge({
  size = 16,
  color = 'var(--mui-palette-primary-main)',
  'aria-label': ariaLabel = 'I verifikuar',
  decorative = false,
}: {
  size?: number;
  color?: string;
  'aria-label'?: string;
  /** When true, parent supplies the accessible name (e.g. boxed professional badge). */
  decorative?: boolean;
}) {
  return (
    <Box
      component="span"
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative ? true : undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        lineHeight: 0,
        verticalAlign: 'middle',
      }}
    >
      <ShieldCheckIcon size={size} weight="fill" color={color} aria-hidden />
    </Box>
  );
}

/** Shared verified shield for listing detail headers — green scalloped seal + check. */
export function ListingVerifiedBadge({
  size = 20,
  color = 'var(--mui-palette-primary-main)',
  'aria-label': ariaLabel = 'I verifikuar',
}: {
  size?: number;
  color?: string;
  'aria-label'?: string;
}) {
  return (
    <Box
      component="span"
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        lineHeight: 0,
        verticalAlign: 'middle',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        style={{ display: 'block' }}
      >
        <path d={VERIFIED_SCALLOPED_SEAL_PATH} fill={color} />
        {/* Check mark */}
        <path
          d="M20.5 33.2 L28.2 40.6 L44.2 23.8"
          stroke="#0a0a0a"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </Box>
  );
}

/** Same scalloped seal silhouette as the premium trust badge. */
const VERIFIED_SCALLOPED_SEAL_PATH =
  'M62.49 32.00 L61.92 34.09 L60.34 35.98 L58.20 37.57 L56.39 38.99 L55.89 39.76 L55.80 40.66 L56.45 42.89 L57.25 45.42 L57.42 47.89 L56.65 49.91 L54.95 51.25 L52.52 51.82 L49.90 51.88 L47.58 51.94 L46.74 52.29 L46.16 52.99 L45.39 55.19 L44.52 57.66 L43.23 59.80 L41.41 60.96 L39.25 61.06 L36.96 60.11 L34.79 58.57 L32.88 57.29 L32.00 57.10 L31.12 57.30 L29.20 58.64 L27.04 60.15 L24.77 61.00 L22.59 60.96 L20.78 59.77 L19.49 57.64 L18.63 55.16 L17.86 52.97 L17.27 52.28 L16.42 51.94 L14.10 51.88 L11.49 51.81 L9.06 51.25 L7.37 49.90 L6.61 47.87 L6.81 45.39 L7.58 42.87 L8.21 40.66 L8.11 39.76 L7.61 38.99 L5.80 37.57 L3.67 35.98 L2.08 34.09 L1.50 32.00 L2.08 29.91 L3.67 28.02 L5.80 26.43 L7.63 25.01 L8.11 24.24 L8.20 23.34 L7.55 21.11 L6.76 18.58 L6.58 16.11 L7.35 14.09 L9.05 12.75 L11.48 12.18 L14.10 12.12 L16.41 12.05 L17.26 11.71 L17.84 11.01 L18.62 8.83 L19.48 6.34 L20.77 4.20 L22.59 3.04 L24.75 2.94 L27.04 3.89 L29.21 5.43 L31.12 6.70 L32.00 6.88 L32.88 6.69 L34.80 5.40 L36.96 3.88 L39.25 2.94 L41.41 3.04 L43.23 4.22 L44.51 6.35 L45.36 8.85 L46.14 11.03 L46.73 11.72 L47.58 12.06 L49.90 12.12 L52.51 12.19 L54.94 12.75 L56.64 14.10 L57.40 16.13 L57.19 18.61 L56.42 21.13 L55.78 23.35 L55.87 24.24 L56.37 25.01 L58.20 26.43 L60.33 28.02 L61.92 29.91 Z';

export function ProfessionalVerifiedBadge() {
  return <ListingVerifiedBadge aria-label="Profesionist i verifikuar" />;
}

export function BusinessVerifiedBadge() {
  return <ListingVerifiedBadge aria-label="Biznes i verifikuar" size={22} />;
}

export function JobVerifiedBadge({
  size = 20,
  color,
}: {
  size?: number;
  color?: string;
} = {}) {
  return <ListingVerifiedBadge aria-label="Punë e verifikuar" size={size} color={color} />;
}

/** Compact rating chip — panel: score + review count; compact: card overlay pill (matches share/save). */
export function ProfessionalRatingBadge({
  rating,
  reviewCount,
  compact = false,
}: {
  rating: string;
  reviewCount: number;
  /** Single-line pill sized like listing card share/save chips. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Box
        role="img"
        aria-label={`${rating} nga 5 yje, ${reviewCount} vlerësime`}
        sx={{
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 0.5,
          flexShrink: 0,
          height: 32,
          px: 1,
          py: 0.5,
          borderRadius: 999,
          bgcolor: 'rgb(var(--mui-palette-background-paperChannel) / 0.92)',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          lineHeight: 0,
        }}
      >
        <StarIcon
          size={17}
          weight="fill"
          color="var(--mui-palette-warning-main)"
          aria-hidden
        />
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            lineHeight: 1,
            color: 'inherit',
          }}
        >
          {rating}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.35,
        flexShrink: 0,
        minWidth: 72,
        px: 1.25,
        py: 0.85,
        borderRadius: 2.5,
        bgcolor: 'rgba(0, 0, 0, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        textAlign: 'center',
      }}
    >
      <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <StarIcon size={14} weight="fill" color="var(--mui-palette-warning-main)" aria-hidden />
        <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY, lineHeight: 1, color: '#fff' }}>
          {rating}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontSize: '0.625rem',
          fontWeight: 600,
          lineHeight: 1.15,
          color: 'rgba(255, 255, 255, 0.55)',
          whiteSpace: 'nowrap',
        }}
      >
        ({reviewCount} vlerësime)
      </Typography>
    </Box>
  );
}

export function ProfessionalReviewsSectionHeader({
  rating,
  reviewCount,
}: {
  rating: string;
  reviewCount: number;
}) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
      <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Vlerësimet</Typography>
      <ProfessionalRatingSummary
        rating={rating}
        reviewCount={reviewCount}
        starSize={16}
        showReviewLabel
      />
    </Stack>
  );
}

/** Meta tile — matches job/car detail stat containers (icon chip + label/value). */
export function ProfessionalMetaStat({
  icon: Icon,
  label,
  value,
  iconSize = 17,
}: {
  icon: typeof BriefcaseIcon;
  label: string;
  value: string;
  iconSize?: number;
}) {
  return (
    <Box
      sx={{
        ...productPanelSx,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        px: { xs: 0.85, sm: 1.15 },
        py: 1.15,
        borderRadius: 2.5,
        minWidth: 0,
        height: '100%',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1.5,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          bgcolor: primaryMainAlpha(0.14),
          color: 'primary.main',
        }}
      >
        <Icon size={iconSize} weight="duotone" color="currentColor" aria-hidden />
      </Box>
      <Box sx={{ minWidth: 0, width: '100%' }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: '0.78rem', sm: '0.85rem' },
            lineHeight: 1.2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {value}
        </Typography>
        <Typography
          sx={{
            mt: 0.25,
            fontSize: { xs: '0.65rem', sm: '0.7rem' },
            color: 'text.secondary',
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

const PORTFOLIO_INITIAL_VISIBLE = 6;

function ProfessionalPortfolioCard({
  item,
  onOpen,
}: {
  item: ProfessionalPortfolioItem;
  onOpen: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      aria-label={`Shiko: ${item.title}`}
      sx={{
        display: 'block',
        width: '100%',
        p: 0,
        m: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        transition: 'border-color 0.15s ease, transform 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      <Box sx={{ position: 'relative', height: { xs: 112, sm: 140 } }}>
        <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width: 600px) 50vw, 220px" style={{ objectFit: 'cover' }} />
      </Box>
      <Stack spacing={0.25} sx={{ p: { xs: 1, sm: 1.25 } }}>
        <Typography
          sx={{ fontWeight: 800, fontSize: { xs: FONT_CAPTION, sm: '0.85rem' }, lineHeight: 1.25 }}
          noWrap
        >
          {item.title}
        </Typography>
        {item.location ? (
          <Typography sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' }, color: 'text.secondary' }} noWrap>
            {item.location}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}

/** Grid of titled works — click opens a lightbox with image + title. */
export function ProfessionalPortfolioSection({
  items,
  headerAction,
  listingId,
  listingKind = 'professionals',
}: {
  items: ProfessionalPortfolioItem[];
  headerAction?: React.ReactNode;
  listingId?: string;
  listingKind?: ListingMetricKind;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const visible = showAll ? items : items.slice(0, PORTFOLIO_INITIAL_VISIBLE);
  const hasMore = items.length > PORTFOLIO_INITIAL_VISIBLE;
  const active = activeIndex != null ? items[activeIndex] : null;

  const openItem = React.useCallback(
    (index: number) => {
      setActiveIndex(index);
      if (listingId) {
        // Cover gallery uses index 0; portfolio photos continue from 1.
        emitListingPhotoView(listingKind, listingId, index + 1);
      }
    },
    [listingId, listingKind],
  );

  if (items.length === 0 && !headerAction) return null;

  return (
    <>
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Punët e mia</Typography>
          {headerAction}
        </Stack>
        <Grid container spacing={1.5}>
          {visible.map((item, index) => (
            <Grid key={item.id} size={{ xs: 6, sm: 4 }}>
              <ProfessionalPortfolioCard
                item={item}
                onOpen={() => openItem(index)}
              />
            </Grid>
          ))}
        </Grid>
        {hasMore && !showAll ? (
          <Button
            size="small"
            variant="text"
            onClick={() => setShowAll(true)}
            sx={{
              alignSelf: 'center',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: FONT_CAPTION,
              py: 0.25,
              minWidth: 0,
            }}
          >
            Më shumë
          </Button>
        ) : null}
      </Stack>

      <ProductDialog
        open={Boolean(active)}
        onClose={() => setActiveIndex(null)}
        maxWidth="sm"
        fullWidth
      >
        {active ? (
          <>
            <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', bgcolor: 'grey.900' }}>
              <Image
                src={active.imageUrl}
                alt={active.title}
                fill
                sizes="(max-width: 600px) 100vw, 560px"
                style={{ objectFit: 'contain' }}
                priority
              />
              <IconButton
                aria-label="Mbyll"
                onClick={() => setActiveIndex(null)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.72)' },
                }}
              >
                <XIcon size={18} weight="bold" />
              </IconButton>
            </Box>
            <Stack spacing={0.35} sx={{ px: 2.25, py: 1.75 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.3 }}>
                {active.title}
              </Typography>
              {active.location ? (
                <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.secondary', fontWeight: 600 }}>
                  {active.location}
                </Typography>
              ) : null}
            </Stack>
          </>
        ) : null}
      </ProductDialog>
    </>
  );
}

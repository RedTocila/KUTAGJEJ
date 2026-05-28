'use client';

import * as React from 'react';
import Image from 'next/image';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import type { ProfessionalPortfolioItem } from '@/lib/professional-listing-detail-content';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { StarHalf as StarHalfIcon } from '@phosphor-icons/react/dist/ssr/StarHalf';

const FONT_CAPTION = '0.75rem';
const FONT_BODY = '0.875rem';

/** Vertical separator between meta stat columns (Specializimi / përgjigje / çmim). */
export function professionalMetaStatCellSx(index: number, total: number): SxProps<Theme> {
  return {
    py: 1.5,
    px: { xs: 1, sm: 1.25 },
    minWidth: 0,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(index < total - 1
      ? {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '12%',
            bottom: '12%',
            right: 0,
            width: '1px',
            pointerEvents: 'none',
            background: (theme) =>
              `linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.primary.main, 0.42)} 50%, transparent 100%)`,
          },
        }
      : {}),
  };
}

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
      aria-label={ariaLabel ?? `${clamped.toFixed(1)} nga 5 yje`}
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
              color="var(--mui-palette-primary-main)"
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
              color="var(--mui-palette-primary-main)"
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

/** Stars + numeric score + review count (header next to location). */
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
      <ProfessionalFiveStarRating value={rating} size={starSize} />
      <Typography sx={{ fontWeight: 800, fontSize: starSize >= 16 ? FONT_BODY : FONT_CAPTION, lineHeight: 1 }}>
        {rating}
      </Typography>
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
      sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, lineHeight: 0 }}
    >
      <ShieldCheckIcon size={size} weight="fill" color={color} aria-hidden />
    </Box>
  );
}

/** Shared verified shield for listing detail headers. */
export function ListingVerifiedBadge({
  size = 20,
  color,
  'aria-label': ariaLabel = 'I verifikuar',
}: {
  size?: number;
  color?: string;
  'aria-label'?: string;
}) {
  return <ListingVerifiedShieldBadge size={size} color={color} aria-label={ariaLabel} />;
}

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

/** Compact rating chip — matches profile header mockup (dark box, score + count). */
export function ProfessionalRatingBadge({
  rating,
  reviewCount,
}: {
  rating: string;
  reviewCount: number;
}) {
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
        <StarIcon size={14} weight="fill" color="var(--mui-palette-primary-main)" aria-hidden />
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

export function ProfessionalMetaStat({
  icon: Icon,
  label,
  value,
  iconSize = 18,
}: {
  icon: React.ComponentType<{ size?: number; weight?: string; color?: string; 'aria-hidden'?: boolean }>;
  label: string;
  value: string;
  iconSize?: number;
}) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0, width: '100%', alignItems: 'center', textAlign: 'center' }}>
      <Icon size={iconSize} weight="duotone" color="var(--mui-palette-primary-main)" aria-hidden />
      <Typography
        sx={{
          fontSize: iconSize >= 20 ? '0.75rem' : '0.6875rem',
          color: 'text.secondary',
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: iconSize >= 20 ? '0.9rem' : FONT_CAPTION,
          lineHeight: 1.25,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

const PORTFOLIO_INITIAL_VISIBLE = 6;

function ProfessionalPortfolioCard({ item }: { item: ProfessionalPortfolioItem }) {
  return (
    <Box sx={{ borderRadius: 2.5, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
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

/** Grid of portfolio work — first 6 visible, then “Më shumë”. */
export function ProfessionalPortfolioSection({ items }: { items: ProfessionalPortfolioItem[] }) {
  const [showAll, setShowAll] = React.useState(false);
  const visible = showAll ? items : items.slice(0, PORTFOLIO_INITIAL_VISIBLE);
  const hasMore = items.length > PORTFOLIO_INITIAL_VISIBLE;

  if (items.length === 0) return null;

  return (
    <Stack spacing={1.25}>
      <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Portofoli</Typography>
      <Grid container spacing={1.5}>
        {visible.map((item) => (
          <Grid key={item.id} size={{ xs: 6, sm: 4 }}>
            <ProfessionalPortfolioCard item={item} />
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
  );
}

'use client';

import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';

import { CardTextMarquee } from './card-text-marquee';

const GOLD = '#c9a227';
const GOLD_LIGHT = '#e8c547';

const promoPulseSx = {
  position: 'relative',
  '@keyframes bizPromoGlow': {
    '0%, 100%': {
      boxShadow: `inset 0 0 0 0 ${alpha(GOLD, 0)}`,
      backgroundColor: alpha('#000', 0.72),
    },
    '50%': {
      boxShadow: `inset 0 0 18px 2px ${alpha(GOLD, 0.42)}`,
      backgroundColor: alpha(GOLD, 0.22),
    },
  },
  '@keyframes bizPromoSheen': {
    '0%': { transform: 'translateX(-130%)' },
    '18%': { transform: 'translateX(280%)' },
    '100%': { transform: 'translateX(280%)' },
  },
  '@keyframes bizPromoIcon': {
    '0%, 100%': { opacity: 0.82, transform: 'scale(1)' },
    '50%': { opacity: 1, transform: 'scale(1.08)' },
  },
  animation: 'bizPromoGlow 3.2s ease-in-out infinite',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '42%',
    pointerEvents: 'none',
    zIndex: 2,
    background: `linear-gradient(90deg, transparent 0%, ${alpha('#fff', 0.18)} 35%, ${alpha(GOLD_LIGHT, 0.55)} 50%, ${alpha('#fff', 0.18)} 65%, transparent 100%)`,
    animation: 'bizPromoSheen 3.8s ease-in-out infinite',
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    '&::after': { animation: 'none', opacity: 0 },
  },
} as const;

export type BusinessAnnouncementProps = {
  title?: string | null;
  subtitle?: string | null;
  bannerUrl?: string | null;
};

function hasAnnouncement(props: BusinessAnnouncementProps): boolean {
  return Boolean(props.title?.trim());
}

function cardMarqueeLabel({ title, subtitle }: BusinessAnnouncementProps): string {
  const parts = [title?.trim(), subtitle?.trim()].filter(Boolean) as string[];
  return parts.join(' · ') || 'Ofertë';
}

function BusinessPromoCardStrip({
  title,
  subtitle,
  overlay = false,
}: BusinessAnnouncementProps & { overlay?: boolean }) {
  const label = cardMarqueeLabel({ title, subtitle });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.85,
        px: 1.25,
        ...(overlay
          ? {
              border: 0,
              borderTop: `1px solid ${GOLD}`,
              borderRadius: 0,
            }
          : {
              border: `1px solid ${GOLD}`,
              borderRadius: 1.5,
            }),
        bgcolor: overlay ? alpha('#000', 0.72) : alpha(GOLD, 0.06),
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        backdropFilter: overlay ? 'blur(8px)' : undefined,
        ...promoPulseSx,
        '& > *': { position: 'relative', zIndex: 1 },
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          flexShrink: 0,
          animation: 'bizPromoIcon 3.2s ease-in-out infinite',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        <MegaphoneIcon size={16} weight="fill" color={GOLD_LIGHT} />
      </Box>
      <CardTextMarquee
        text={label}
        animationName="bizPromoMarquee"
        durationSec={22}
        textSx={{
          fontSize: '0.7rem',
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: GOLD_LIGHT,
        }}
      />
    </Box>
  );
}

export function BusinessPromoBanner({
  title,
  subtitle,
  bannerUrl,
  variant = 'detail',
  overlay = false,
}: BusinessAnnouncementProps & {
  /** `card` — one-line scrolling strip; `detail` — full promo on business page. */
  variant?: 'card' | 'detail';
  /** When `card`, pin strip to the bottom edge of the listing image. */
  overlay?: boolean;
}) {
  if (!hasAnnouncement({ title })) return null;

  if (variant === 'card') {
    return <BusinessPromoCardStrip title={title} subtitle={subtitle} overlay={overlay} />;
  }

  const headline = title!.trim();
  const sub = subtitle?.trim() || null;
  const banner = bannerUrl?.trim() || null;

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: GOLD,
        bgcolor: alpha(GOLD, 0.08),
        width: '100%',
        boxSizing: 'border-box',
        ...promoPulseSx,
      }}
    >
      {banner ? (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '21 / 9',
            maxHeight: 140,
            bgcolor: alpha('#000', 0.2),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </Box>
      ) : null}
      <Box sx={{ p: 2 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: GOLD_LIGHT,
                letterSpacing: '0.06em',
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}
            >
              Ofertë e papritur
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.125rem', lineHeight: 1.15 }}>{headline}</Typography>
            {sub ? (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.35 }}>{sub}</Typography>
            ) : null}
          </Stack>
          <ArrowRightIcon
            size={22}
            weight="bold"
            color="var(--mui-palette-primary-main)"
            style={{ flexShrink: 0 }}
          />
        </Stack>
      </Box>
    </Box>
  );
}

/** Whether a listing has an active announcement to show. */
export function listingHasAnnouncement(listing: {
  announcementTitle?: string | null;
}): boolean {
  return Boolean(listing.announcementTitle?.trim());
}

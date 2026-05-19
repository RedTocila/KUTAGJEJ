'use client';

import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';

import { CardTextMarquee } from './card-text-marquee';

const GOLD = '#c9a227';
const GOLD_LIGHT = '#e8c547';

function promoSubtitle(servicesHighlight: string | null | undefined): string {
  const highlight = servicesHighlight?.split('·')[0]?.trim();
  return `Me rezervim online · ${highlight ?? 'Ofertë sezonale'}`;
}

function cardMarqueeLabel(servicesHighlight: string | null | undefined): string {
  const highlight = servicesHighlight?.replace(/\s+/g, ' ').trim();
  const parts = ['Ofertë e papritur', '20% zbritje', 'Me rezervim online'];
  if (highlight) parts.push(highlight);
  return parts.join(' · ');
}

function BusinessPromoCardStrip({
  servicesHighlight,
  overlay = false,
}: {
  servicesHighlight?: string | null;
  overlay?: boolean;
}) {
  const label = cardMarqueeLabel(servicesHighlight);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.85,
        px: 1.25,
        border: '1px solid',
        borderColor: GOLD,
        borderRadius: overlay ? 0 : 1.5,
        borderBottom: overlay ? 'none' : undefined,
        bgcolor: overlay ? alpha('#000', 0.72) : alpha(GOLD, 0.06),
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        backdropFilter: overlay ? 'blur(8px)' : undefined,
      }}
    >
      <MegaphoneIcon size={16} weight="fill" color={GOLD_LIGHT} style={{ flexShrink: 0 }} />
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
  servicesHighlight,
  variant = 'detail',
  overlay = false,
}: {
  servicesHighlight?: string | null;
  /** `card` — one-line scrolling strip; `detail` — full promo on business page. */
  variant?: 'card' | 'detail';
  /** When `card`, pin strip to the bottom edge of the listing image. */
  overlay?: boolean;
}) {
  if (variant === 'card') {
    return <BusinessPromoCardStrip servicesHighlight={servicesHighlight} overlay={overlay} />;
  }

  const subtitle = promoSubtitle(servicesHighlight);

  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 2,
        border: '1px solid',
        borderColor: GOLD,
        bgcolor: alpha(GOLD, 0.08),
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: GOLD_LIGHT,
              letterSpacing: '0.06em',
              lineHeight: 1.2,
            }}
          >
            Ofertë e papritur
          </Typography>
          <Typography sx={{ fontWeight: 900, fontSize: '1.125rem', lineHeight: 1.15 }}>20% ZBRITJE</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.35 }}>{subtitle}</Typography>
        </Stack>
        <ArrowRightIcon
          size={22}
          weight="bold"
          color="var(--mui-palette-primary-main)"
          style={{ flexShrink: 0 }}
        />
      </Stack>
    </Box>
  );
}

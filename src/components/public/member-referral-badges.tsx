'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Button, Typography } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ChartLineUp as ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { CirclesThreePlus as CirclesThreePlusIcon } from '@phosphor-icons/react/dist/ssr/CirclesThreePlus';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { Crown as CrownIcon } from '@phosphor-icons/react/dist/ssr/Crown';
import { CurrencyCircleDollar as CurrencyCircleDollarIcon } from '@phosphor-icons/react/dist/ssr/CurrencyCircleDollar';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { Lightning as LightningIcon } from '@phosphor-icons/react/dist/ssr/Lightning';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { Plant as PlantIcon } from '@phosphor-icons/react/dist/ssr/Plant';
import { RocketLaunch as RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { SealCheck as SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { SealQuestion as SealQuestionIcon } from '@phosphor-icons/react/dist/ssr/SealQuestion';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { Trophy as TrophyIcon } from '@phosphor-icons/react/dist/ssr/Trophy';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import type { PublicMemberReferralBadge } from '@/lib/public-member-client';
import { paths } from '@/paths';

function badgeVisual(
  kind: string,
  level?: number,
): { Icon: PhosphorIcon; accent: string } {
  const lvl = Number(level) || 0;
  switch (kind) {
    case 'platform-dominator':
      return { Icon: CrownIcon, accent: '#f0a020' };
    case 'trusted-reviewer':
      return { Icon: SealCheckIcon, accent: '#f0a020' };
    case 'review-tier':
      if (lvl >= 100) return { Icon: TrophyIcon, accent: '#f0a020' };
      if (lvl >= 35) return { Icon: SparkleIcon, accent: '#f0a020' };
      return { Icon: StarIcon, accent: '#f0a020' };
    case 'network-builder':
      return { Icon: CirclesThreePlusIcon, accent: 'var(--mui-palette-primary-main)' };
    case 'revenue-driver':
      return { Icon: CurrencyCircleDollarIcon, accent: 'var(--mui-palette-primary-main)' };
    case 'paid-tier':
      if (lvl >= 3) return { Icon: TrophyIcon, accent: '#f0a020' };
      if (lvl === 2) return { Icon: ChartLineUpIcon, accent: '#f0a020' };
      return { Icon: CoinsIcon, accent: '#f0a020' };
    case 'free-tier':
      if (lvl >= 5) return { Icon: LightningIcon, accent: 'var(--mui-palette-primary-main)' };
      if (lvl === 4) return { Icon: SparkleIcon, accent: 'var(--mui-palette-primary-main)' };
      if (lvl === 3) return { Icon: MegaphoneIcon, accent: 'var(--mui-palette-primary-main)' };
      if (lvl === 2) return { Icon: RocketLaunchIcon, accent: 'var(--mui-palette-primary-main)' };
      return { Icon: PlantIcon, accent: 'var(--mui-palette-primary-main)' };
    default:
      return { Icon: HandshakeIcon, accent: 'var(--mui-palette-primary-main)' };
  }
}

function badgeCta(kind: string): { href: string; label: string } {
  switch (kind) {
    case 'review-tier':
    case 'trusted-reviewer':
      return { href: paths.user.myRealEstateListings, label: 'Shko te shpalljet e mia' };
    case 'paid-tier':
    case 'revenue-driver':
    case 'free-tier':
    case 'network-builder':
    case 'platform-dominator':
    default:
      return { href: paths.user.referral, label: 'Shko te referimi' };
  }
}

function badgeHowTo(badge: PublicMemberReferralBadge): string {
  const need = Number(badge.threshold) || 0;
  switch (badge.kind) {
    case 'free-tier':
      return need === 1
        ? 'Ndaj kodin tënd të referimit. Kur 1 person regjistrohet falas me kodin tënd, e fiton këtë badge.'
        : `Ndaj kodin tënd të referimit. Kur ${need} persona regjistrohen falas me kodin tënd, e fiton këtë badge.`;
    case 'paid-tier':
      return need === 1
        ? 'Kur 1 person i referuar blen një paketë me pagesë, e fiton këtë badge.'
        : `Kur ${need} persona të referuar blejnë një paketë me pagesë, e fiton këtë badge.`;
    case 'review-tier':
      return `Merr ${need} vlerësime në profilin ose shpalljet e tua për të fituar këtë badge.`;
    case 'network-builder':
      return `Përfundo të gjitha nivelet e referimeve falas (aktualisht ${need || 100} referime).`;
    case 'revenue-driver':
      return `Përfundo të gjitha nivelet e referimeve të paguara (aktualisht ${need || 15} referime të paguara).`;
    case 'trusted-reviewer':
      return `Merr ${need || 100} vlerësime në profilin ose shpalljet e tua.`;
    case 'platform-dominator':
      return 'Fitoni badge-et Network Builder, Revenue Driver dhe Trusted për të zhbllokuar këtë badge.';
    default:
      return badge.description || 'Vazhdo aktivitetin në platformë për ta fituar.';
  }
}

function badgeEarnedMessage(badge: PublicMemberReferralBadge, self: boolean): string {
  const count = Math.max(0, Number(badge.progress) || 0);
  const need = Number(badge.threshold) || 0;
  const you = self;
  switch (badge.kind) {
    case 'free-tier':
      if (count === 1) {
        return you
          ? 'Ke fituar këtë badge sepse ke referuar 1 person.'
          : 'Ky badge u fitua me 1 referim.';
      }
      return you
        ? `Ke fituar këtë badge sepse ke referuar ${count} persona.`
        : `Ky badge u fitua me ${count} referime.`;
    case 'paid-tier':
      if (count === 1) {
        return you
          ? 'Ke fituar këtë badge sepse 1 person i referuar ka blerë një paketë.'
          : 'Ky badge u fitua me 1 referim të paguar.';
      }
      return you
        ? `Ke fituar këtë badge sepse ${count} persona të referuar kanë blerë një paketë.`
        : `Ky badge u fitua me ${count} referime të paguara.`;
    case 'review-tier':
      return you
        ? `Ke fituar këtë badge sepse ke marrë ${count} vlerësime.`
        : `Ky badge u fitua me ${count} vlerësime.`;
    case 'network-builder':
      return you
        ? `Ke fituar këtë badge sepse ke përfunduar referimet falas (${count} referime).`
        : `Ky badge u fitua duke përfunduar referimet falas (${count} referime).`;
    case 'revenue-driver':
      return you
        ? `Ke fituar këtë badge sepse ke përfunduar referimet e paguara (${count} referime të paguara).`
        : `Ky badge u fitua duke përfunduar referimet e paguara (${count} referime të paguara).`;
    case 'trusted-reviewer':
      return you
        ? `Ke fituar këtë badge sepse ke marrë ${count} vlerësime.`
        : `Ky badge u fitua me ${count} vlerësime.`;
    case 'platform-dominator':
      return you
        ? 'Ke fituar këtë badge sepse ke përfunduar Network Builder, Revenue Driver dhe Trusted.'
        : 'Ky badge u fitua duke përfunduar Network Builder, Revenue Driver dhe Trusted.';
    default:
      return need > 0
        ? you
          ? `Ke fituar këtë badge (progresi yt: ${count}/${need}).`
          : `Ky badge u fitua (${count}/${need}).`
        : you
          ? 'Ke fituar këtë badge.'
          : 'Ky badge është fituar.';
  }
}

function BadgeTile({
  badge,
  dense,
  isGrid,
  onOpen,
}: {
  badge: PublicMemberReferralBadge;
  dense: boolean;
  isGrid: boolean;
  onOpen: (badge: PublicMemberReferralBadge) => void;
}) {
  const { Icon, accent } = badgeVisual(badge.kind, badge.level);
  const earned = Boolean(badge.earned);
  const tile = dense ? 36 : 40;
  const iconSize = dense ? 16 : 18;
  const titleParts = [
    badge.label,
    earned ? 'E fituar' : 'Ende e pafituar',
    badge.description,
    typeof badge.lifetimePercent === 'number' ? `${badge.lifetimePercent}% Lifetime` : null,
  ].filter(Boolean);

  return (
    <Box
      component="button"
      type="button"
      title={titleParts.join(' · ')}
      onClick={() => onOpen(badge)}
      sx={{
        appearance: 'none',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        p: 0,
        m: 0,
        font: 'inherit',
        color: 'inherit',
        flexShrink: isGrid ? undefined : 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.45,
        width: isGrid ? '100%' : dense ? 52 : 56,
        minWidth: 0,
        opacity: earned ? 1 : 0.42,
        filter: earned ? 'none' : 'grayscale(0.65)',
        WebkitTapHighlightColor: 'transparent',
        '&:hover': { opacity: earned ? 1 : 0.7 },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
          borderRadius: 1,
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: tile,
          height: tile,
          borderRadius: '40%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: earned
            ? accent
            : (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
          color: earned ? '#0a0a0a' : 'text.disabled',
          border: '1px solid',
          borderColor: earned ? 'transparent' : 'divider',
          boxShadow: earned ? `0 0 0 1px ${accent}55, 0 4px 10px rgba(0,0,0,0.2)` : 'none',
        }}
      >
        <Icon size={iconSize} weight={earned ? 'fill' : 'regular'} />
        {earned ? (
          <Box
            sx={{
              position: 'absolute',
              bottom: -3,
              right: -3,
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: '#d98f00',
              display: 'grid',
              placeItems: 'center',
              border: '1.5px solid',
              borderColor: 'background.paper',
            }}
          >
            <SealCheckIcon size={8} weight="fill" color="#fff" />
          </Box>
        ) : (
          <Box
            sx={{
              position: 'absolute',
              bottom: -3,
              right: -3,
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(40,40,40,0.95)' : 'rgba(245,245,245,0.98)',
              display: 'grid',
              placeItems: 'center',
              border: '1.5px solid',
              borderColor: 'divider',
              color: 'text.disabled',
            }}
          >
            <SealQuestionIcon size={8} weight="fill" />
          </Box>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: earned ? 750 : 600,
          textAlign: 'center',
          lineHeight: 1.15,
          color: earned ? 'text.primary' : 'text.disabled',
          fontSize: dense ? '0.58rem' : '0.6rem',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {badge.label}
      </Typography>
    </Box>
  );
}

function BadgeInfoDialog({
  badge,
  open,
  onClose,
  selfView,
}: {
  badge: PublicMemberReferralBadge | null;
  open: boolean;
  onClose: () => void;
  selfView: boolean;
}) {
  if (!badge) return null;

  const earned = Boolean(badge.earned);
  const { Icon, accent } = badgeVisual(badge.kind, badge.level);
  const cta = badgeCta(badge.kind);
  const threshold = Number(badge.threshold) || 0;
  const progress = Math.max(0, Number(badge.progress) || 0);

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <ProductDialogTitle onClose={onClose}>{badge.label}</ProductDialogTitle>
      <ProductDialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, pt: 0.5 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '40%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: earned ? accent : 'action.hover',
              color: earned ? '#0a0a0a' : 'text.secondary',
              border: '1px solid',
              borderColor: earned ? 'transparent' : 'divider',
            }}
          >
            <Icon size={30} weight="fill" />
          </Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.82rem',
              color: earned ? 'primary.main' : 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {earned ? 'E fituar' : 'Ende e pafituar'}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', lineHeight: 1.5, fontWeight: 550 }}
          >
            {earned ? badgeEarnedMessage(badge, selfView) : badgeHowTo(badge)}
          </Typography>
          {threshold > 0 && badge.kind !== 'platform-dominator' ? (
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 700 }}>
              Progresi: {Math.min(progress, threshold)}/{threshold}
            </Typography>
          ) : null}
          {typeof badge.lifetimePercent === 'number' ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              +{badge.lifetimePercent}% Lifetime
            </Typography>
          ) : null}
        </Box>
      </ProductDialogContent>
      <ProductDialogActions sx={{ px: 2.5, pb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 700 }}>
          Mbyll
        </Button>
        {selfView || !earned ? (
          <Button
            component={RouterLink}
            href={cta.href}
            variant="contained"
            color="primary"
            onClick={onClose}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            {cta.label}
          </Button>
        ) : null}
      </ProductDialogActions>
    </ProductDialog>
  );
}

/** Referral badges — scroll row or fixed grid (optionally collapsed to one row). */
export function MemberReferralBadgesRow({
  badges,
  dense = false,
  layout = 'scroll',
  columns = 5,
  selfView = false,
  collapsible = false,
}: {
  badges: PublicMemberReferralBadge[];
  /** Slightly tighter layout for the portal profile card. */
  dense?: boolean;
  /** `scroll` = horizontal strip; `grid` = wrap all badges, no slider. */
  layout?: 'scroll' | 'grid';
  /** Columns when `layout="grid"`. */
  columns?: number;
  /** First-person earned copy + owner CTAs (my profile / own public profile). */
  selfView?: boolean;
  /** Grid only: show one row, then “view all” expands the rest downward. */
  collapsible?: boolean;
}) {
  const [selected, setSelected] = React.useState<PublicMemberReferralBadge | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const open = Boolean(selected);

  const orderedBadges = React.useMemo(() => {
    if (!badges.length) return badges;
    // Earned first so completed badges appear in the collapsed preview row.
    return [...badges].sort((a, b) => Number(Boolean(b.earned)) - Number(Boolean(a.earned)));
  }, [badges]);

  if (!orderedBadges.length) return null;

  const isGrid = layout === 'grid';
  const previewCount = Math.max(1, columns);
  const canCollapse = isGrid && collapsible && orderedBadges.length > previewCount;
  const visibleBadges =
    canCollapse && !expanded ? orderedBadges.slice(0, previewCount) : orderedBadges;

  return (
    <>
      <Box sx={{ width: '100%' }}>
        <Box
          sx={
            isGrid
              ? {
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  columnGap: dense ? 0.75 : 1,
                  rowGap: dense ? 1.25 : 1.5,
                  width: '100%',
                }
              : {
                  display: 'flex',
                  flexDirection: 'row',
                  gap: dense ? 0.75 : 1,
                  overflowX: 'auto',
                  pb: 0.25,
                  mx: { xs: -0.25, sm: 0 },
                  px: { xs: 0.25, sm: 0 },
                  scrollbarWidth: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                  width: '100%',
                  justifyContent: { xs: 'flex-start', sm: 'center' },
                }
          }
        >
          {visibleBadges.map((badge) => (
            <BadgeTile
              key={badge.id}
              badge={badge}
              dense={dense}
              isGrid={isGrid}
              onOpen={setSelected}
            />
          ))}
        </Box>
        {canCollapse ? (
          <Button
            size="small"
            variant="text"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            sx={{
              mt: 0.75,
              mx: 'auto',
              display: 'flex',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.75rem',
              py: 0.25,
              minWidth: 0,
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
            }}
          >
            {expanded ? 'Shfaq më pak' : 'Shiko të gjitha badge-et'}
          </Button>
        ) : null}
      </Box>
      <BadgeInfoDialog
        badge={selected}
        open={open}
        onClose={() => setSelected(null)}
        selfView={selfView}
      />
    </>
  );
}

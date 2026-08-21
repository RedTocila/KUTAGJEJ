'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Button, Skeleton, Typography } from '@mui/material';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { MemberBadgeEmblem } from '@/components/public/member-badge-emblem';
import type { PublicMemberReferralBadge } from '@/lib/public-member-client';
import { paths } from '@/paths';

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

function badgeWhatItIs(badge: PublicMemberReferralBadge): string {
  const need = Number(badge.threshold) || 0;
  switch (badge.kind) {
    case 'free-tier':
      return need === 1 ? '1 referim' : `${need} referime`;
    case 'paid-tier':
      return need === 1 ? '1 referim i paguar' : `${need} referime të paguara`;
    case 'review-tier':
      return `${need} vlerësime`;
    case 'network-builder':
      return need > 0 ? `${need} referime` : 'Referime falas';
    case 'revenue-driver':
      return need > 0 ? `${need} të paguara` : 'Referime të paguara';
    case 'trusted-reviewer':
      return need > 0 ? `${need} vlerësime` : 'Vlerësime';
    case 'platform-dominator':
      return 'Të 3 badge-et';
    default:
      return '';
  }
}

function badgeTileLabel(badge: PublicMemberReferralBadge): string {
  return String(badge.label || '')
    .replace(/\s+badge$/i, '')
    .trim();
}

function badgePackagePercent(badge: PublicMemberReferralBadge): number {
  const n = Number(badge.lifetimePercent);
  return Number.isFinite(n) && n > 0 ? n : 0;
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
  const earned = Boolean(badge.earned);
  const tile = dense ? 42 : 48;
  const label = badgeTileLabel(badge);
  const what = badgeWhatItIs(badge);
  const packagePct = badgePackagePercent(badge);
  const status = earned ? 'Kompletuar' : 'Në progres';
  const titleParts = [
    label,
    what,
    status,
    packagePct > 0 ? `−${packagePct}% në paketa` : null,
  ].filter(Boolean);
  const lineSx = {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
    lineHeight: 1.15,
  } as const;

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
        gap: 0.55,
        width: isGrid ? '100%' : dense ? 56 : 62,
        minWidth: 0,
        opacity: earned ? 1 : 0.78,
        WebkitTapHighlightColor: 'transparent',
        '&:hover': { opacity: 1 },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
          borderRadius: 1,
        },
      }}
    >
      <MemberBadgeEmblem kind={badge.kind} level={badge.level} earned={earned} size={tile} />
      <Box sx={{ width: '100%', minWidth: 0, textAlign: 'center' }}>
        <Typography
          variant="caption"
          sx={{
            ...lineSx,
            fontWeight: earned ? 750 : 600,
            color: earned ? 'text.primary' : 'text.disabled',
            fontSize: dense ? '0.58rem' : '0.6rem',
          }}
        >
          {label}
        </Typography>
        {what ? (
          <Typography
            variant="caption"
            sx={{
              ...lineSx,
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: dense ? '0.52rem' : '0.55rem',
              mt: 0.15,
            }}
          >
            {what}
          </Typography>
        ) : null}
        <Typography
          variant="caption"
          sx={{
            ...lineSx,
            fontWeight: 800,
            mt: 0.15,
            fontSize: dense ? '0.52rem' : '0.55rem',
            color: earned ? 'primary.main' : 'text.disabled',
          }}
        >
          {status}
        </Typography>
      </Box>
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
  const cta = badgeCta(badge.kind);
  const threshold = Number(badge.threshold) || 0;
  const progress = Math.max(0, Number(badge.progress) || 0);
  const what = badgeWhatItIs(badge);
  const packagePct = badgePackagePercent(badge);

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <ProductDialogTitle onClose={onClose}>{badge.label}</ProductDialogTitle>
      <ProductDialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, pt: 0.5 }}>
          <MemberBadgeEmblem kind={badge.kind} level={badge.level} earned={earned} size={88} />
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.82rem',
              color: earned ? 'primary.main' : 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {earned ? 'Kompletuar' : 'Në progres'}
          </Typography>
          {what ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textAlign: 'center' }}>
              {what}
            </Typography>
          ) : null}
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
          {packagePct > 0 ? (
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: earned ? 'primary.main' : 'text.secondary', textAlign: 'center' }}
            >
              {earned
                ? `−${packagePct}% në paketat e platformës`
                : `−${packagePct}% në paketa kur kompletohet`}
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

/** Placeholder grid while referral badges load. */
export function MemberReferralBadgesSkeleton({
  count = 5,
  dense = false,
  columns = 5,
}: {
  count?: number;
  dense?: boolean;
  columns?: number;
}): React.JSX.Element {
  const tile = dense ? 42 : 48;
  return (
    <Box sx={{ width: '100%', pt: 0.5 }} aria-busy aria-label="Duke ngarkuar badges">
      <Skeleton
        variant="text"
        animation="wave"
        width={64}
        height={16}
        sx={{ mx: 'auto', mb: 1 }}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          columnGap: dense ? 0.75 : 1,
          rowGap: dense ? 1.5 : 1.75,
          width: '100%',
        }}
      >
        {Array.from({ length: count }, (_, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.55,
              minWidth: 0,
            }}
          >
            <Skeleton variant="circular" animation="wave" width={tile} height={tile} />
            <Skeleton variant="text" animation="wave" width="80%" height={12} />
            <Skeleton variant="text" animation="wave" width="70%" height={10} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Referral badges — scroll row or fixed grid. */
export function MemberReferralBadgesRow({
  badges,
  dense = false,
  layout = 'scroll',
  columns = 5,
  selfView = false,
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
}) {
  const [selected, setSelected] = React.useState<PublicMemberReferralBadge | null>(null);
  const open = Boolean(selected);

  const orderedBadges = React.useMemo(() => {
    if (!badges.length) return badges;
    return [...badges].sort((a, b) => Number(Boolean(b.earned)) - Number(Boolean(a.earned)));
  }, [badges]);

  if (!orderedBadges.length) return null;

  const isGrid = layout === 'grid';

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
                  rowGap: dense ? 1.5 : 1.75,
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
          {orderedBadges.map((badge) => (
            <BadgeTile
              key={badge.id}
              badge={badge}
              dense={dense}
              isGrid={isGrid}
              onOpen={setSelected}
            />
          ))}
        </Box>
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

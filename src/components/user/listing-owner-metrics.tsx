'use client';

import * as React from 'react';
import { Box, Button, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import { ArrowsClockwise as RefreshIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { BookmarkSimple as BookmarkIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { CursorClick as ClickIcon } from '@phosphor-icons/react/dist/ssr/CursorClick';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { PencilSimple as EditIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { ForkKnife as ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { ShareNetwork as ShareIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import RouterLink from 'next/link';

import { BusinessAnnouncementDialog } from '@/components/user/business-announcement-dialog';
import type { BusinessAnnouncement } from '@/lib/listing-announcement-client';
import type { ListingMetricKind, ListingMetrics } from '@/lib/listing-metrics';
import { refreshListingBoost, setListingAutoRefresh } from '@/lib/listing-refresh-client';
import { applyOkazionFromPlan, applyPremiumFromPlan } from '@/lib/payments-client';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center', color: 'text.secondary' }} title={label}>
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
        {new Intl.NumberFormat('en-GB').format(value)}
      </Typography>
    </Stack>
  );
}

/** Compact labeled action chip used on owner listing cards. */
const labeledBtnSx = {
  minWidth: 0,
  height: 26,
  px: 0.85,
  py: 0,
  borderRadius: 999,
  textTransform: 'none' as const,
  fontWeight: 800,
  fontSize: '0.65rem',
  letterSpacing: '0.01em',
  lineHeight: 1,
  gap: 0.35,
  '& .MuiButton-startIcon': { mr: 0.35, ml: 0 },
};

function editHrefFor(listingId: string, kind: ListingMetricKind) {
  return `${paths.user.editListing}?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(listingId)}`;
}

/**
 * Top-right card actions: Menu · Shpall · Ndrysho (rightmost = Edit).
 * Edit is always shown; Menu + Shpall only for businesses.
 */
export function ListingOwnerTopActions({
  listingId,
  kind,
  canAnnounce = false,
  announcement = null,
  onAnnouncementSaved,
}: {
  listingId: string;
  kind: ListingMetricKind;
  canAnnounce?: boolean;
  announcement?: BusinessAnnouncement | null;
  onAnnouncementSaved?: (result: {
    announcement: BusinessAnnouncement | null;
    refreshedAt?: string | null;
    boostCredits?: number;
  }) => void;
}) {
  const { checkSession } = useUser();
  const [announceOpen, setAnnounceOpen] = React.useState(false);
  const isBusiness = kind === 'businesses';

  return (
    <>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          p: 0.45,
          borderRadius: 999,
          bgcolor: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.22)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}
      >
        {isBusiness ? (
          <>
            <Tooltip title="Ndrysho menunë">
              <Button
                size="small"
                variant="outlined"
                color="primary"
                aria-label="Menu"
                component={RouterLink}
                href={`${paths.user.businessMenu}?id=${encodeURIComponent(listingId)}`}
                startIcon={<ForkKnifeIcon size={12} weight="bold" />}
                sx={labeledBtnSx}
              >
                Menu
              </Button>
            </Tooltip>
            <Tooltip
              title={
                announcement?.title
                  ? 'Ndrysho shpalljen'
                  : 'Shto shpallje · 3 Boost Coins · njoftimi shkon në krye'
              }
            >
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  aria-label="Shpall"
                  disabled={!canAnnounce}
                  onClick={() => setAnnounceOpen(true)}
                  startIcon={<MegaphoneIcon size={12} weight="fill" />}
                  sx={labeledBtnSx}
                >
                  Shpall
                </Button>
              </span>
            </Tooltip>
          </>
        ) : null}
        <Tooltip title="Ndrysho njoftimin">
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            aria-label="Ndrysho"
            component={RouterLink}
            href={editHrefFor(listingId, kind)}
            startIcon={<EditIcon size={12} weight="bold" />}
            sx={labeledBtnSx}
          >
            Ndrysho
          </Button>
        </Tooltip>
      </Stack>
      {isBusiness ? (
        <BusinessAnnouncementDialog
          open={announceOpen}
          listingId={listingId}
          initial={announcement}
          onClose={() => setAnnounceOpen(false)}
          onSaved={(result) => {
            onAnnouncementSaved?.(result);
            void checkSession();
          }}
        />
      ) : null}
    </>
  );
}

export function ListingOwnerMetrics({
  metrics,
  listingId,
  kind,
  canRefresh = false,
  autoRefreshEnabled = false,
  onAutoRefreshChange,
  isPremium = false,
  premiumUntil = null,
  onPremiumApplied,
  isOkazion = false,
  okazionUntil = null,
  onOkazionApplied,
  onRefreshed,
}: {
  metrics: Partial<ListingMetrics>;
  listingId?: string;
  kind?: ListingMetricKind;
  /** Only approved listings can be bumped to the top. */
  canRefresh?: boolean;
  /** Whether this listing is enrolled in Auto-Refresh. */
  autoRefreshEnabled?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  /** Active Premium window from plan or add-on. */
  isPremium?: boolean;
  premiumUntil?: string | null;
  onPremiumApplied?: (result: { premiumUntil: string }) => void;
  /** Active OKAZION window from plan or add-on. */
  isOkazion?: boolean;
  okazionUntil?: string | null;
  onOkazionApplied?: (result: { okazionUntil: string }) => void;
  onRefreshed?: (result: { refreshedAt: string; boostCredits: number }) => void;
}) {
  const { checkSession } = useUser();
  const [busy, setBusy] = React.useState(false);
  const [autoBusy, setAutoBusy] = React.useState(false);
  const [premiumBusy, setPremiumBusy] = React.useState(false);
  const [okazionBusy, setOkazionBusy] = React.useState(false);
  const [premiumOn, setPremiumOn] = React.useState(Boolean(isPremium));
  const [okazionOn, setOkazionOn] = React.useState(Boolean(isOkazion));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPremiumOn(Boolean(isPremium));
  }, [isPremium, premiumUntil]);

  React.useEffect(() => {
    setOkazionOn(Boolean(isOkazion));
  }, [isOkazion, okazionUntil]);

  /** Directory profiles (businesses / professionals) cannot be OKAZION. */
  const okazionSupported =
    kind === 'real-estate' || kind === 'car' || kind === 'job' || kind === 'marketplace';

  const viewCount = metrics.viewCount ?? 0;
  const clickCount = metrics.clickCount ?? 0;
  const shareCount = metrics.shareCount ?? 0;
  const saveCount = metrics.saveCount ?? 0;

  const handleRefresh = async () => {
    if (!listingId || !kind || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await refreshListingBoost({ kind, listingId });
      if (res.error || !res.refreshedAt) {
        setError(res.error || 'Rifreskimi dështoi.');
        return;
      }
      onRefreshed?.({ refreshedAt: res.refreshedAt, boostCredits: res.boostCredits ?? 0 });
      void checkSession();
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAuto = async () => {
    if (!listingId || !kind || autoBusy) return;
    setError(null);
    setAutoBusy(true);
    try {
      const next = !autoRefreshEnabled;
      const res = await setListingAutoRefresh({ kind, listingId, enabled: next });
      if (res.error) {
        setError(res.error);
        return;
      }
      onAutoRefreshChange?.(Boolean(res.enabled));
      void checkSession();
    } finally {
      setAutoBusy(false);
    }
  };

  const handleApplyPremium = async () => {
    if (!listingId || !kind || premiumBusy || premiumOn) return;
    setError(null);
    setPremiumBusy(true);
    try {
      const res = await applyPremiumFromPlan({ kind, listingId });
      if (res.error || !res.premiumUntil) {
        setError(res.error || 'Aplikimi i Premium dështoi.');
        return;
      }
      setPremiumOn(true);
      onPremiumApplied?.({ premiumUntil: res.premiumUntil });
      void checkSession();
    } finally {
      setPremiumBusy(false);
    }
  };

  const handleApplyOkazion = async () => {
    if (!listingId || !kind || okazionBusy || okazionOn) return;
    setError(null);
    setOkazionBusy(true);
    try {
      const res = await applyOkazionFromPlan({ kind, listingId });
      if (res.error || !res.okazionUntil) {
        setError(res.error || 'Aplikimi i OKAZION dështoi.');
        return;
      }
      setOkazionOn(true);
      onOkazionApplied?.({ okazionUntil: res.okazionUntil });
      void checkSession();
    } finally {
      setOkazionBusy(false);
    }
  };

  const anyBusy = busy || autoBusy || premiumBusy || okazionBusy;

  return (
    <Stack spacing={0.75} sx={{ pt: 0.85, mt: 0.35, borderTop: 1, borderColor: 'divider' }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
          rowGap: 0.75,
        }}
      >
        {listingId && kind && canRefresh ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
            <Tooltip title="Vendose njoftimin në krye të listës · kushton 1 Boost Coin">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  aria-label="Rifresko"
                  disabled={anyBusy}
                  onClick={() => {
                    void handleRefresh();
                  }}
                  startIcon={
                    busy ? <CircularProgress size={11} color="inherit" /> : <RefreshIcon size={12} weight="bold" />
                  }
                  sx={labeledBtnSx}
                >
                  Rifresko
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title={
                autoRefreshEnabled
                  ? 'Hiq nga Auto-Refresh'
                  : 'Shto në Auto-Refresh (rifreskim automatik sipas planit)'
              }
            >
              <span>
                <Button
                  size="small"
                  variant={autoRefreshEnabled ? 'contained' : 'outlined'}
                  color="primary"
                  aria-label="Auto"
                  disabled={anyBusy}
                  onClick={() => {
                    void handleToggleAuto();
                  }}
                  startIcon={
                    autoBusy ? <CircularProgress size={11} color="inherit" /> : <TimerIcon size={12} weight="bold" />
                  }
                  sx={labeledBtnSx}
                >
                  Auto
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title={
                premiumOn
                  ? premiumUntil
                    ? `Premium aktiv deri më ${new Date(premiumUntil).toLocaleDateString('sq-AL')}`
                    : 'Premium aktiv'
                  : 'Bëje Premium me vendin nga paketa (Grow/Elite · 30 ditë)'
              }
            >
              <span>
                <Button
                  size="small"
                  variant={premiumOn ? 'contained' : 'outlined'}
                  color="warning"
                  aria-label="Premium"
                  disabled={anyBusy || premiumOn}
                  onClick={() => {
                    void handleApplyPremium();
                  }}
                  startIcon={
                    premiumBusy ? (
                      <CircularProgress size={11} color="inherit" />
                    ) : (
                      <SparkleIcon size={12} weight="bold" />
                    )
                  }
                  sx={labeledBtnSx}
                >
                  Premium
                </Button>
              </span>
            </Tooltip>
            {okazionSupported ? (
            <Tooltip
              title={
                okazionOn
                  ? okazionUntil
                    ? `OKAZION aktiv deri më ${new Date(okazionUntil).toLocaleDateString('sq-AL')}`
                    : 'OKAZION aktiv'
                  : 'Bëje OKAZION me vendin nga paketa (Grow/Elite · 5 ditë)'
              }
            >
              <span>
                <Button
                  size="small"
                  variant={okazionOn ? 'contained' : 'outlined'}
                  color="error"
                  aria-label="OKAZION"
                  disabled={anyBusy || okazionOn}
                  onClick={() => {
                    void handleApplyOkazion();
                  }}
                  startIcon={
                    okazionBusy ? (
                      <CircularProgress size={11} color="inherit" />
                    ) : (
                      <SealPercentIcon size={12} weight="bold" />
                    )
                  }
                  sx={labeledBtnSx}
                >
                  OKAZION
                </Button>
              </span>
            </Tooltip>
            ) : null}
          </Stack>
        ) : (
          <Box />
        )}

        <Stack
          direction="row"
          spacing={1.1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5, ml: { xs: 0, sm: 'auto' } }}
        >
          <Stat icon={<EyeIcon size={13} />} label="shikime" value={viewCount} />
          <Stat icon={<ClickIcon size={13} />} label="klikime" value={clickCount} />
          <Stat icon={<ShareIcon size={13} />} label="ndarje" value={shareCount} />
          <Stat icon={<BookmarkIcon size={13} />} label="ruajtje" value={saveCount} />
        </Stack>
      </Stack>
      {error ? (
        <Typography variant="caption" color="error" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}

'use client';

import * as React from 'react';
import { Box, Button, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import { ArrowsClockwise as RefreshIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { BookmarkSimple as BookmarkIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { CursorClick as ClickIcon } from '@phosphor-icons/react/dist/ssr/CursorClick';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { PencilSimple as EditIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { ForkKnife as ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { ShareNetwork as ShareIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import RouterLink from 'next/link';

import type { ListingMetricKind, ListingMetrics } from '@/lib/listing-metrics';
import { refreshListingBoost, setListingAutoRefresh } from '@/lib/listing-refresh-client';
import { applyPremiumFromPlan } from '@/lib/payments-client';
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

const btnSx = {
  minWidth: 28,
  width: 28,
  height: 28,
  p: 0,
  borderRadius: 999,
};

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
  onRefreshed?: (result: { refreshedAt: string; boostCredits: number }) => void;
}) {
  const { checkSession } = useUser();
  const [busy, setBusy] = React.useState(false);
  const [autoBusy, setAutoBusy] = React.useState(false);
  const [premiumBusy, setPremiumBusy] = React.useState(false);
  const [premiumOn, setPremiumOn] = React.useState(Boolean(isPremium));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPremiumOn(Boolean(isPremium));
  }, [isPremium, premiumUntil]);

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

  const anyBusy = busy || autoBusy || premiumBusy;
  const editHref =
    listingId && kind
      ? `${paths.user.editListing}?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(listingId)}`
      : null;

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
        {listingId && kind ? (
          <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.6 }}>
            {editHref ? (
              <Tooltip title="Ndrysho njoftimin">
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  aria-label="Ndrysho"
                  component={RouterLink}
                  href={editHref}
                  sx={btnSx}
                >
                  <EditIcon size={14} weight="bold" />
                </Button>
              </Tooltip>
            ) : null}
            {kind === 'businesses' && listingId ? (
              <Tooltip title="Ndrysho menunë">
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  aria-label="Menu"
                  component={RouterLink}
                  href={`${paths.user.businessMenu}?id=${encodeURIComponent(listingId)}`}
                  startIcon={<ForkKnifeIcon size={13} weight="bold" />}
                  sx={{
                    ...btnSx,
                    width: 'auto',
                    minWidth: 0,
                    px: 1.1,
                    textTransform: 'none',
                    fontWeight: 800,
                    fontSize: '0.7rem',
                  }}
                >
                  Menu
                </Button>
              </Tooltip>
            ) : null}
            {canRefresh ? (
              <>
                <Tooltip title="Vendose njoftimin në krye të listës · kushton 1 Boost Coin">
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      aria-label="Rifresko · 1 BC"
                      disabled={anyBusy}
                      onClick={() => {
                        void handleRefresh();
                      }}
                      sx={btnSx}
                    >
                      {busy ? (
                        <CircularProgress size={12} color="inherit" />
                      ) : (
                        <RefreshIcon size={14} weight="bold" />
                      )}
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
                      aria-label={autoRefreshEnabled ? 'Auto · ON' : 'Auto'}
                      disabled={anyBusy}
                      onClick={() => {
                        void handleToggleAuto();
                      }}
                      sx={btnSx}
                    >
                      {autoBusy ? (
                        <CircularProgress size={12} color="inherit" />
                      ) : (
                        <TimerIcon size={14} weight="bold" />
                      )}
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
                      aria-label={premiumOn ? 'Premium · ON' : 'Premium'}
                      disabled={anyBusy || premiumOn}
                      onClick={() => {
                        void handleApplyPremium();
                      }}
                      sx={btnSx}
                    >
                      {premiumBusy ? (
                        <CircularProgress size={12} color="inherit" />
                      ) : (
                        <SparkleIcon size={14} weight="bold" />
                      )}
                    </Button>
                  </span>
                </Tooltip>
              </>
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

'use client';

import * as React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  DialogContentText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowsClockwise as RefreshIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { BookmarkSimple as BookmarkIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { PencilSimple as EditIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { ForkKnife as ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { ShareNetwork as ShareIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Timer as TimerIcon } from '@phosphor-icons/react/dist/ssr/Timer';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import RouterLink from 'next/link';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { BusinessAnnouncementDialog } from '@/components/user/business-announcement-dialog';
import type { BusinessAnnouncement } from '@/lib/listing-announcement-client';
import { ANNOUNCE_COST_BC } from '@/lib/listing-announcement-client';
import type { ListingMetricKind, ListingMetrics } from '@/lib/listing-metrics';
import { refreshListingBoost, setListingAutoRefresh } from '@/lib/listing-refresh-client';
import { applyOkazionFromPlan, applyPremiumFromPlan } from '@/lib/payments-client';
import {
  errorMainAlpha,
  primaryMainAlpha,
  warningMainAlpha,
} from '@/lib/css-var-alpha';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

function Stat({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  const body = (
    <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center', color: 'text.secondary' }} title={label}>
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
        {new Intl.NumberFormat('en-GB').format(value)}
      </Typography>
    </Stack>
  );

  if (!onClick) return body;

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={label}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        m: 0,
        p: 0,
        border: 0,
        bgcolor: 'transparent',
        cursor: 'pointer',
        borderRadius: 1,
        WebkitTapHighlightColor: 'transparent',
        '&:hover': { color: 'primary.main', '& .MuiTypography-root': { color: 'primary.main' } },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      {body}
    </Box>
  );
}

export function ListingOwnerStats({
  metrics,
  sx,
  onSavesClick,
}: {
  metrics: Partial<ListingMetrics>;
  sx?: object;
  /** Opens Grow/Elite “who saved” leads when the save count is pressed. */
  onSavesClick?: () => void;
}) {
  const viewCount = metrics.viewCount ?? 0;
  const shareCount = metrics.shareCount ?? 0;
  const saveCount = metrics.saveCount ?? 0;

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1.1,
        flexWrap: 'wrap',
        rowGap: 0.5,
        ...sx,
      }}
    >
      <Stat icon={<EyeIcon size={13} />} label="shikime" value={viewCount} />
      <Stat icon={<ShareIcon size={13} />} label="ndarje" value={shareCount} />
      <Stat
        icon={<BookmarkIcon size={13} />}
        label={onSavesClick ? 'ruajtje · shiko interesuarit' : 'ruajtje'}
        value={saveCount}
        onClick={onSavesClick}
      />
    </Stack>
  );
}

/** Compact labeled action chip used on owner listing cards. */
const ACTION_RADIUS_PX = '12px';
const ACTION_CONTAINER_RADIUS_PX = '16px';

const labeledBtnSx = {
  minWidth: 0,
  height: 26,
  px: 0.85,
  py: 0,
  borderRadius: ACTION_RADIUS_PX,
  textTransform: 'none' as const,
  fontWeight: 800,
  fontSize: '0.65rem',
  letterSpacing: '0.01em',
  lineHeight: 1,
  gap: 0.35,
  boxShadow: 'none',
  border: 'none',
  '&:hover': { boxShadow: 'none' },
  '& .MuiButton-startIcon': { mr: 0.35, ml: 0 },
};

function fadedToneSx(
  bg: string,
  hoverBg: string,
  color: string,
): Record<string, unknown> {
  return {
    bgcolor: bg,
    color,
    boxShadow: 'none',
    '&:hover': {
      bgcolor: hoverBg,
      boxShadow: 'none',
    },
  };
}

const fadedPrimarySx = fadedToneSx(primaryMainAlpha(0.28), primaryMainAlpha(0.42), 'primary.main');
const fadedWarningSx = fadedToneSx(warningMainAlpha(0.28), warningMainAlpha(0.42), 'warning.main');
const fadedErrorSx = fadedToneSx(errorMainAlpha(0.28), errorMainAlpha(0.42), 'error.main');
const fadedPrimaryStrongSx = fadedToneSx(primaryMainAlpha(0.45), primaryMainAlpha(0.58), 'primary.main');
const fadedWarningStrongSx = fadedToneSx(warningMainAlpha(0.45), warningMainAlpha(0.58), 'warning.main');
const fadedErrorStrongSx = fadedToneSx(errorMainAlpha(0.45), errorMainAlpha(0.58), 'error.main');

function editHrefFor(listingId: string, kind: ListingMetricKind) {
  return `${paths.user.editListing}?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(listingId)}`;
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Top-right card actions: Menu · Shpall · Ndrysho · trash (rightmost = Delete).
 * Edit + Delete are always shown; Menu only for businesses; Shpall for businesses + professionals.
 */
export function ListingOwnerTopActions({
  listingId,
  kind,
  canAnnounce = false,
  announcement = null,
  onAnnouncementSaved,
  onDeleteRequest,
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
  onDeleteRequest?: (listingId: string, kind: ListingMetricKind) => void;
}) {
  const { checkSession } = useUser();
  const [announceOpen, setAnnounceOpen] = React.useState(false);
  const showMenu = kind === 'businesses';
  const showAnnounce = kind === 'businesses' || kind === 'professionals';

  return (
    <>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          p: 0.45,
          borderRadius: ACTION_CONTAINER_RADIUS_PX,
          bgcolor: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.22)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}
      >
        {showMenu ? (
          <Tooltip title="Ndrysho menunë">
            <Button
              size="small"
              variant="contained"
              color="primary"
              aria-label="Menu"
              component={RouterLink}
              href={`${paths.user.businessMenu}?id=${encodeURIComponent(listingId)}`}
              startIcon={<ForkKnifeIcon size={12} weight="bold" />}
              sx={{ ...labeledBtnSx, ...fadedPrimarySx }}
            >
              Menu
            </Button>
          </Tooltip>
        ) : null}
        {showAnnounce ? (
          <Tooltip
            title={
              announcement?.title
                ? 'Ndrysho shpalljen'
                : `Shto shpallje · ${ANNOUNCE_COST_BC} Boost Coins · njoftimi shkon në krye`
            }
          >
            <span>
              <Button
                size="small"
                variant="contained"
                color="warning"
                aria-label="Shpall"
                disabled={!canAnnounce}
                onClick={() => setAnnounceOpen(true)}
                startIcon={<MegaphoneIcon size={12} weight="fill" />}
                sx={{ ...labeledBtnSx, ...fadedWarningSx }}
              >
                Shpall
              </Button>
            </span>
          </Tooltip>
        ) : null}
        <Tooltip title="Ndrysho njoftimin">
          <Button
            size="small"
            variant="contained"
            color="primary"
            aria-label="Ndrysho"
            component={RouterLink}
            href={editHrefFor(listingId, kind)}
            startIcon={<EditIcon size={12} weight="bold" />}
            sx={{ ...labeledBtnSx, ...fadedPrimarySx }}
          >
            Ndrysho
          </Button>
        </Tooltip>
        {onDeleteRequest ? (
          <Tooltip title="Fshi njoftimin">
            <Button
              size="small"
              variant="contained"
              color="error"
              aria-label="Fshi"
              onClick={() => onDeleteRequest(listingId, kind)}
              sx={{
                ...labeledBtnSx,
                ...fadedErrorSx,
                width: 26,
                px: 0,
                minWidth: 26,
              }}
            >
              <TrashIcon size={12} weight="bold" />
            </Button>
          </Tooltip>
        ) : null}
      </Stack>
      {showAnnounce ? (
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
  lastRefreshedAt,
  refreshEveryHours,
  hideStats = false,
  onSavesClick,
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
  /** Last manual/auto refresh anchor; uses listing createdAt on initial load. */
  lastRefreshedAt?: string | null;
  /** Cooldown window from active package/subscription. */
  refreshEveryHours?: number | null;
  /** Hide stats row when rendered externally. */
  hideStats?: boolean;
  /** Opens Grow/Elite saver leads for this listing. */
  onSavesClick?: () => void;
}) {
  const t = useCopy();
  const { checkSession } = useUser();
  const [busy, setBusy] = React.useState(false);
  const [autoBusy, setAutoBusy] = React.useState(false);
  const [premiumBusy, setPremiumBusy] = React.useState(false);
  const [okazionBusy, setOkazionBusy] = React.useState(false);
  const [premiumOn, setPremiumOn] = React.useState(Boolean(isPremium));
  const [okazionOn, setOkazionOn] = React.useState(Boolean(isOkazion));
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const [lastRefreshAtLocal, setLastRefreshAtLocal] = React.useState<string | null>(lastRefreshedAt ?? null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmBoost, setConfirmBoost] = React.useState<'premium' | 'okazion' | null>(null);

  React.useEffect(() => {
    setPremiumOn(Boolean(isPremium));
  }, [isPremium, premiumUntil]);

  React.useEffect(() => {
    setOkazionOn(Boolean(isOkazion));
  }, [isOkazion, okazionUntil]);

  React.useEffect(() => {
    setLastRefreshAtLocal(lastRefreshedAt ?? null);
  }, [lastRefreshedAt]);

  const refreshWindowHours = Math.max(1, Number(refreshEveryHours) || 48);
  const nextRefreshAtMs = React.useMemo(() => {
    if (!lastRefreshAtLocal) return null;
    const baseMs = new Date(lastRefreshAtLocal).getTime();
    if (!Number.isFinite(baseMs)) return null;
    return baseMs + refreshWindowHours * 60 * 60 * 1000;
  }, [lastRefreshAtLocal, refreshWindowHours]);
  const remainingRefreshMs = nextRefreshAtMs == null ? 0 : Math.max(0, nextRefreshAtMs - nowMs);
  const refreshLocked = remainingRefreshMs > 0;

  React.useEffect(() => {
    if (!refreshLocked) return undefined;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [refreshLocked]);

  /** Directory profiles (businesses / professionals) cannot be OKAZION. */
  const okazionSupported =
    kind === 'real-estate' || kind === 'car' || kind === 'job' || kind === 'marketplace';

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
      setLastRefreshAtLocal(res.refreshedAt);
      onRefreshed?.({ refreshedAt: res.refreshedAt, boostCredits: res.boostCredits ?? 0 });
      void checkSession();
    } finally {
      setBusy(false);
    }
  };
  const handleRefreshRef = React.useRef(handleRefresh);
  handleRefreshRef.current = handleRefresh;

  /**
   * Auto-Refresh: when enrolled and the Rifresko cooldown ends, fire the same
   * bump as a manual click (1 BC). Needed on Vercel where the API has no
   * long-lived setInterval scheduler.
   */
  const autoRefreshAttemptKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!autoRefreshEnabled) {
      autoRefreshAttemptKeyRef.current = null;
      return;
    }
    if (!canRefresh || !listingId || !kind) return;
    if (refreshLocked || busy || autoBusy) return;

    const attemptKey = `${listingId}:${lastRefreshAtLocal ?? 'none'}`;
    if (autoRefreshAttemptKeyRef.current === attemptKey) return;

    const timer = window.setTimeout(() => {
      if (autoRefreshAttemptKeyRef.current === attemptKey) return;
      autoRefreshAttemptKeyRef.current = attemptKey;
      void handleRefreshRef.current();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    autoRefreshEnabled,
    canRefresh,
    listingId,
    kind,
    refreshLocked,
    busy,
    autoBusy,
    lastRefreshAtLocal,
  ]);

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

  const closeConfirmBoost = () => {
    if (premiumBusy || okazionBusy) return;
    setConfirmBoost(null);
  };

  const handleApplyPremium = async () => {
    if (!listingId || !kind || premiumBusy || premiumOn) return;
    setError(null);
    setPremiumBusy(true);
    try {
      const res = await applyPremiumFromPlan({ kind, listingId });
      if (res.error || !res.premiumUntil) {
        setConfirmBoost(null);
        setError(res.error || 'Aplikimi i Premium dështoi.');
        return;
      }
      setPremiumOn(true);
      setConfirmBoost(null);
      onPremiumApplied?.({ premiumUntil: res.premiumUntil });
      const refreshedAt = res.refreshedAt ?? new Date().toISOString();
      setLastRefreshAtLocal(refreshedAt);
      onRefreshed?.({ refreshedAt, boostCredits: 0 });
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
        setConfirmBoost(null);
        setError(res.error || 'Aplikimi i OKAZION dështoi.');
        return;
      }
      setOkazionOn(true);
      setConfirmBoost(null);
      onOkazionApplied?.({ okazionUntil: res.okazionUntil });
      const refreshedAt = res.refreshedAt ?? new Date().toISOString();
      setLastRefreshAtLocal(refreshedAt);
      onRefreshed?.({ refreshedAt, boostCredits: 0 });
      void checkSession();
    } finally {
      setOkazionBusy(false);
    }
  };

  const handleConfirmBoost = () => {
    if (confirmBoost === 'premium') {
      void handleApplyPremium();
      return;
    }
    if (confirmBoost === 'okazion') {
      void handleApplyOkazion();
    }
  };

  const anyBusy = busy || autoBusy || premiumBusy || okazionBusy;
  const refreshButtonDisabled = anyBusy || refreshLocked;
  const refreshTimer = formatCountdown(remainingRefreshMs);
  const premiumDisabled = anyBusy || premiumOn || okazionOn;
  const okazionDisabled = anyBusy || okazionOn || premiumOn;

  return (
    <Stack spacing={0.75} sx={{ pt: 0.5, mt: 0.35 }}>
      {!hideStats ? (
        <ListingOwnerStats metrics={metrics} sx={{ pb: 0.4 }} onSavesClick={onSavesClick} />
      ) : null}

      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 0.8 }}>
        {listingId && kind && canRefresh ? (
          <Stack
            direction="row"
            sx={{
              width: '100%',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 0.5,
              '& > *': { flex: 1, minWidth: 0 },
              '& .MuiButton-root': { width: '100%', justifyContent: 'center' },
            }}
          >
            <Tooltip title="Vendose njoftimin në krye të listës · kushton 1 Boost Coin">
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  aria-label="Rifresko"
                  disabled={refreshButtonDisabled}
                  onClick={() => {
                    void handleRefresh();
                  }}
                  startIcon={
                    busy ? <CircularProgress size={11} color="inherit" /> : <RefreshIcon size={12} weight="bold" />
                  }
                  sx={{
                    ...labeledBtnSx,
                    ...(refreshLocked
                      ? {
                          bgcolor: 'action.hover',
                          color: 'text.disabled',
                          boxShadow: 'none',
                          opacity: 1,
                          '&.Mui-disabled': {
                            bgcolor: 'action.hover',
                            color: 'text.disabled',
                            opacity: 1,
                          },
                        }
                      : fadedPrimarySx),
                  }}
                >
                  {refreshLocked ? refreshTimer : 'Rifresko'}
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title={
                autoRefreshEnabled
                  ? 'Hiq nga Auto-Refresh'
                  : 'Shto në Auto-Refresh · rifreskon automatikisht sa herë që Rifresko bëhet i disponueshëm · 1 BC për çdo rifreskim'
              }
            >
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  aria-label="Auto"
                  disabled={anyBusy}
                  onClick={() => {
                    void handleToggleAuto();
                  }}
                  startIcon={
                    autoBusy ? (
                      <CircularProgress size={11} color="inherit" />
                    ) : (
                      <TimerIcon size={12} weight="bold" />
                    )
                  }
                  endIcon={
                    !autoBusy && autoRefreshEnabled ? <CheckCircleIcon size={11} weight="fill" /> : undefined
                  }
                  sx={{
                    ...labeledBtnSx,
                    ...(autoRefreshEnabled ? fadedPrimaryStrongSx : fadedPrimarySx),
                  }}
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
                  : okazionOn
                    ? 'Nuk mund të aktivizoni Premium kur OKAZION është aktiv.'
                  : 'Bëje Premium me vendin nga paketa (Grow/Elite · 30 ditë)'
              }
            >
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  aria-label="Premium"
                  disabled={premiumDisabled}
                  onClick={() => {
                    setError(null);
                    setConfirmBoost('premium');
                  }}
                  startIcon={
                    premiumBusy ? (
                      <CircularProgress size={11} color="inherit" />
                    ) : (
                      <SparkleIcon size={12} weight="bold" />
                    )
                  }
                  sx={{
                    ...labeledBtnSx,
                    ...(premiumOn ? fadedWarningStrongSx : fadedWarningSx),
                  }}
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
                  : premiumOn
                    ? 'Nuk mund të aktivizoni OKAZION kur Premium është aktiv.'
                  : 'Bëje OKAZION me vendin nga paketa (Grow/Elite · 5 ditë)'
              }
            >
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  aria-label="OKAZION"
                  disabled={okazionDisabled}
                  onClick={() => {
                    setError(null);
                    setConfirmBoost('okazion');
                  }}
                  startIcon={
                    okazionBusy ? (
                      <CircularProgress size={11} color="inherit" />
                    ) : (
                      <SealPercentIcon size={12} weight="bold" />
                    )
                  }
                  sx={{
                    ...labeledBtnSx,
                    ...(okazionOn ? fadedErrorStrongSx : fadedErrorSx),
                  }}
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
      </Box>
      {error ? (
        <Typography variant="caption" color="error" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>
          {error}
        </Typography>
      ) : null}

      <ProductDialog
        open={confirmBoost !== null}
        onClose={closeConfirmBoost}
        maxWidth="xs"
        fullWidth
      >
        <ProductDialogTitle onClose={closeConfirmBoost}>
          {confirmBoost === 'okazion'
            ? t.myListings.okazionConfirmTitle
            : t.myListings.premiumConfirmTitle}
        </ProductDialogTitle>
        <ProductDialogContent>
          <DialogContentText sx={{ m: 0, color: 'text.secondary' }}>
            {confirmBoost === 'okazion'
              ? t.myListings.okazionConfirmBody
              : t.myListings.premiumConfirmBody}
          </DialogContentText>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button
            color="error"
            onClick={closeConfirmBoost}
            disabled={premiumBusy || okazionBusy}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t.common.cancel}
          </Button>
          <Button
            color={confirmBoost === 'okazion' ? 'error' : 'warning'}
            variant="contained"
            disabled={premiumBusy || okazionBusy}
            onClick={handleConfirmBoost}
            startIcon={
              premiumBusy || okazionBusy ? (
                <CircularProgress size={16} color="inherit" />
              ) : confirmBoost === 'okazion' ? (
                <SealPercentIcon size={16} weight="bold" />
              ) : (
                <SparkleIcon size={16} weight="bold" />
              )
            }
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {confirmBoost === 'okazion'
              ? t.myListings.okazionConfirmAction
              : t.myListings.premiumConfirmAction}
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </Stack>
  );
}

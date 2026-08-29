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
import { PaperPlaneTilt as ShareIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
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
import { refreshCostBc, bumpButtonAriaLabelSq, refreshCostTooltipSq } from '@/lib/listing-refresh-cost';
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
      <Stat icon={<ShareIcon size={13} weight="bold" />} label="ndarje" value={shareCount} />
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
const ACTION_RADIUS_PX = '999px';

const labeledBtnSx = {
  minWidth: 0,
  height: 32,
  px: 0.5,
  py: 0,
  borderRadius: ACTION_RADIUS_PX,
  textTransform: 'none' as const,
  fontWeight: 800,
  fontSize: '0.68rem',
  letterSpacing: '0.01em',
  lineHeight: 1,
  gap: 0.35,
  boxShadow: 'none',
  border: '1px solid currentColor',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  '&:hover': { boxShadow: 'none' },
  '& .MuiButton-startIcon': { mr: 0.35, ml: 0 },
};

const imageEditSx = {
  bgcolor: 'rgba(15, 23, 42, 0.72)',
  color: '#fff',
  borderColor: 'rgba(255,255,255,0.28)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  '&:hover': {
    bgcolor: 'rgba(15, 23, 42, 0.86)',
    borderColor: 'rgba(255,255,255,0.42)',
  },
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

function iconActionToneSx(color: string): Record<string, unknown> {
  return {
    bgcolor: (theme: { palette: { mode: string } }) =>
      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)',
    color,
    borderColor: 'rgba(255,255,255,0.28)',
    boxShadow: 'none',
    '&:hover': {
      bgcolor: (theme: { palette: { mode: string } }) =>
        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.13)' : 'rgba(15,23,42,0.14)',
      boxShadow: 'none',
    },
  };
}

const fadedPrimarySx = fadedToneSx(primaryMainAlpha(0.28), primaryMainAlpha(0.42), 'primary.main');
const fadedWarningSx = fadedToneSx(warningMainAlpha(0.28), warningMainAlpha(0.42), 'warning.main');
const fadedErrorSx = fadedToneSx(errorMainAlpha(0.28), errorMainAlpha(0.42), 'error.main');
const iconPrimarySx = iconActionToneSx('primary.main');
const iconWarningSx = iconActionToneSx('warning.main');
const iconErrorSx = iconActionToneSx('error.main');

function editHrefFor(listingId: string, kind: ListingMetricKind) {
  return `${paths.user.editListing}?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(listingId)}`;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

/**
 * Top-right card actions: Menu · Shpall · Ndrysho · trash (rightmost = Delete).
 * Edit + Delete are always shown; Menu only for businesses; Shpall for businesses + professionals.
 */
export function ListingOwnerTopActions({
  listingId,
  kind,
  placement = 'all',
  showEdit = true,
  showDelete = true,
  canAnnounce = false,
  announcement = null,
  onAnnouncementSaved,
  onDeleteRequest,
}: {
  listingId: string;
  kind: ListingMetricKind;
  placement?: 'all' | 'image' | 'secondary';
  showEdit?: boolean;
  showDelete?: boolean;
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
  const showEditAction = placement !== 'secondary' && showEdit;
  const showDeleteAction = placement !== 'secondary' && showDelete;
  const showSecondaryActions = placement !== 'image';

  return (
    <>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          flexWrap: placement === 'image' ? 'nowrap' : 'wrap',
          maxWidth: '100%',
        }}
      >
        {showSecondaryActions && showMenu ? (
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
        {showSecondaryActions && showAnnounce ? (
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
        {showEditAction ? (
          <Tooltip title="Ndrysho njoftimin">
          <Button
            size="small"
            variant="contained"
            color="primary"
            aria-label="Ndrysho"
            component={RouterLink}
            href={editHrefFor(listingId, kind)}
            startIcon={<EditIcon size={18} weight="bold" />}
            sx={{
              ...labeledBtnSx,
              ...(placement === 'image' ? imageEditSx : fadedPrimarySx),
              ...(placement === 'image'
                ? {
                    width: 34,
                    minWidth: 34,
                    height: 34,
                    p: 0,
                    fontSize: 0,
                    '& .MuiButton-startIcon': { m: 0 },
                  }
                : {}),
            }}
          >
            Ndrysho
          </Button>
          </Tooltip>
        ) : null}
        {showDeleteAction && onDeleteRequest ? (
          <Tooltip title="Fshi njoftimin">
              <Button
                size="small"
                variant="contained"
                color="error"
                aria-label="Fshi"
                onClick={() => onDeleteRequest(listingId, kind)}
                sx={{
                  ...labeledBtnSx,
                  bgcolor: 'transparent',
                  color: 'error.light',
                  border: 'none',
                  width: 32,
                  height: 32,
                  px: 0,
                  minWidth: 32,
                  '& > svg': { flexShrink: 0 },
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.28)', color: 'error.light' },
                }}
              >
                <TrashIcon size={18} weight="bold" />
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

  const refreshTierFlags = React.useMemo(
    () => ({
      isOkazion: okazionSupported && (okazionOn || Boolean(isOkazion)),
      isPremium: premiumOn || Boolean(isPremium),
    }),
    [okazionSupported, okazionOn, isOkazion, premiumOn, isPremium],
  );
  const refreshCost = refreshCostBc(refreshTierFlags);
  const bumpButtonAriaLabel = bumpButtonAriaLabelSq(refreshTierFlags);
  const refreshTooltip = refreshCostTooltipSq(refreshTierFlags);

  const handleRefresh = async () => {
    if (!listingId || !kind || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await refreshListingBoost({ kind, listingId });
      if (res.error || !res.refreshedAt) {
        setError(res.error || 'Nuk u ngrijt në krye.');
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
   * Auto: when enrolled and cooldown ends, fire the same bump as a manual click.
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
  const refreshStatusText = autoRefreshEnabled
    ? `Rifreskohet automatikisht pas ${refreshTimer}`
    : `Rifreskohet pas ${refreshTimer}`;
  const premiumDisabled = anyBusy || premiumOn || okazionOn;
  const okazionDisabled = anyBusy || okazionOn || premiumOn;

  return (
    <Stack spacing={0.5} sx={{ pt: 0.25, mt: 0 }}>
      {!hideStats ? (
        <ListingOwnerStats metrics={metrics} sx={{ pb: 0.4 }} onSavesClick={onSavesClick} />
      ) : null}

      <Box sx={{ pt: 0.5 }}>
        {listingId && kind && canRefresh ? (
          <Stack spacing={0.35}>
            {refreshLocked ? (
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontSize: '0.64rem', fontWeight: 700, textAlign: 'left' }}
              >
                {refreshStatusText}
              </Typography>
            ) : null}
            <Stack
              sx={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 0.5,
                '& > *': { minWidth: 0 },
                '& .MuiButton-root': { width: '100%', justifyContent: 'center' },
                '& .MuiButton-startIcon': { m: 0 },
                '& .MuiButton-endIcon': { m: 0 },
              }}
            >
            <Tooltip title={refreshLocked ? refreshStatusText : refreshTooltip}>
              <span>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  aria-label={refreshLocked ? `${bumpButtonAriaLabel} · ${refreshTimer}` : bumpButtonAriaLabel}
                  disabled={refreshButtonDisabled}
                  onClick={() => {
                    void handleRefresh();
                  }}
                  startIcon={
                    busy ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon size={18} weight="bold" />
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
                      : iconPrimarySx),
                  }}
                >
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title={
                autoRefreshEnabled
                  ? 'Hiq nga Auto'
                  : `Shto në Auto · ngrihet automatikisht në krye pas cooldown · ${refreshCost} BC`
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
                      <TimerIcon size={18} weight="bold" />
                    )
                  }
                  endIcon={
                    !autoBusy && autoRefreshEnabled ? <CheckCircleIcon size={15} weight="fill" /> : undefined
                  }
                  sx={{
                    ...labeledBtnSx,
                    ...iconPrimarySx,
                  }}
                />
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
                      <SparkleIcon size={18} weight="bold" />
                    )
                  }
                  sx={{
                    ...labeledBtnSx,
                    ...iconWarningSx,
                  }}
                />
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
                  : 'Bëje OKAZION me vendin nga paketa (Grow/Elite · 7 ditë)'
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
                      <SealPercentIcon size={18} weight="bold" />
                    )
                  }
                  sx={{
                    ...labeledBtnSx,
                    ...iconErrorSx,
                  }}
                />
              </span>
            </Tooltip>
            ) : null}
          </Stack>
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

'use client';

import * as React from 'react';
import { Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Circle as CircleIcon } from '@phosphor-icons/react/dist/ssr/Circle';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { Fire as FireIcon } from '@phosphor-icons/react/dist/ssr/Fire';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import { portalCardSx } from '@/components/user/portal-cards';
import { ShareMyListingsDialog } from '@/components/user/share-my-listings-dialog';
import { useLanguage } from '@/hooks/use-language';
import { useUser } from '@/hooks/use-user';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { hardNavigate } from '@/lib/hard-navigate';
import { fetchMyReferralStats } from '@/lib/referrals-client';
import type { ReferralNextTier } from '@/types/referrals';
import { paths } from '@/paths';

const AMBER = '#F5A623';
const AMBER_SOFT_DARK = 'rgba(245, 166, 35, 0.14)';
const AMBER_SOFT_LIGHT = 'rgba(245, 166, 35, 0.12)';
const AMBER_BORDER_DARK = 'rgba(245, 166, 35, 0.38)';
const AMBER_BORDER_LIGHT = 'rgba(245, 166, 35, 0.32)';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const copy = {
  sq: {
    title: 'Referimi',
    subtitle: 'Ndani kodin me miqtë dhe fitoni Boost Coins.',
    copyCode: 'Kopjo kodin',
    copied: 'U kopjua',
    nextGoal: 'Hapi tjetër',
    remaining: (n: number) => (n === 1 ? 'Edhe 1 referim' : `Edhe ${n} referime`),
    allDone: 'Keni arritur të gjitha nivelet aktuale.',
    openFull: 'Shiko detajet',
    streakTitle: 'Aktivitet ditor',
    streakDays: (n: number) => `${n} ditë radhazi`,
    shareDone: 'Ndajë sot ✓',
    shareTodo: 'Ndaj sot',
    shareButton: 'Ndaj',
    lifetimeHint: 'Përfundo të gjitha referimet dhe merr 20% zbritje përgjithmonë.',
  },
  en: {
    title: 'Referral',
    subtitle: 'Share your code with friends and earn Boost Coins.',
    copyCode: 'Copy code',
    copied: 'Copied',
    nextGoal: 'Next goal',
    remaining: (n: number) => (n === 1 ? '1 more referral' : `${n} more referrals`),
    allDone: 'You’ve reached all current tiers.',
    openFull: 'See details',
    streakTitle: 'Daily activity',
    streakDays: (n: number) => `${n}-day streak`,
    shareDone: 'Shared today ✓',
    shareTodo: 'Share today',
    shareButton: 'Share',
    lifetimeHint: 'Completing all referrals gives you 20% off forever.',
  },
} as const;

/** Compact referral hub — code, copy, next goal + daily streak — opens full referral page. */
export function ReferralSummaryCard() {
  const { user, checkSession } = useUser();
  const { language } = useLanguage();
  const t = copy[language];
  const [loading, setLoading] = React.useState(true);
  const [code, setCode] = React.useState('');
  const [referralCount, setReferralCount] = React.useState(0);
  const [nextTier, setNextTier] = React.useState<ReferralNextTier | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [streakDays, setStreakDays] = React.useState(0);
  const [daysRequired, setDaysRequired] = React.useState(7);
  const [streakReward, setStreakReward] = React.useState(5);
  const [shareDone, setShareDone] = React.useState(false);
  const [shareReward, setShareReward] = React.useState(3);
  const [sharePickerOpen, setSharePickerOpen] = React.useState(false);

  const canView =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  const refreshStats = React.useCallback(async () => {
    if (!user?.id || !canView) return;
    const res = await fetchMyReferralStats();
    if (res.referral) {
      setCode(res.referral.code || '');
      setReferralCount(res.referral.referralCount ?? 0);
      setNextTier(res.referral.nextTier ?? null);
      setStreakDays(res.referral.loginStreakDays ?? 0);
      setDaysRequired(
        res.referral.loginStreakDaysRequired ?? res.program?.loginStreak.daysRequired ?? 7,
      );
      setStreakReward(
        res.referral.loginStreakBoostCredits ?? res.program?.loginStreak.boostCredits ?? 5,
      );
      setShareDone(Boolean(res.referral.dailyShareClaimedToday));
      setShareReward(res.referral.dailyShareBoostCredits ?? 3);
      if (res.referral.loginStreakAwarded) {
        void checkSession();
      }
    } else if (res.program?.loginStreak) {
      setDaysRequired(res.program.loginStreak.daysRequired);
      setStreakReward(res.program.loginStreak.boostCredits);
    }
  }, [user?.id, canView, checkSession]);

  React.useEffect(() => {
    if (!user?.id || !canView) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await refreshStats();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, canView, refreshStats]);

  const handleCopy = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!code) return;
    const ok = await copyText(code);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenShare = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSharePickerOpen(true);
  };

  if (!canView) return null;

  const next = nextTier;
  const progress =
    next && next.referralsRequired > 0
      ? Math.min(100, Math.round((referralCount / next.referralsRequired) * 100))
      : 100;

  const required = Math.max(1, daysRequired);
  const streakCurrent = Math.max(0, Math.min(streakDays, required));
  const streakProgress = Math.round((streakCurrent / required) * 100);

  return (
    <>
    <Box
      component="a"
      href={paths.user.referral}
      onClick={(event) => hardNavigate(paths.user.referral, event)}
      sx={{
        ...portalCardSx,
        p: { xs: 2, sm: 2.25 },
        alignSelf: 'stretch',
        width: '100%',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.18 : 0.12),
              color: 'primary.main',
            }}
          >
            <HandshakeIcon size={22} weight="fill" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography sx={{ fontWeight: 850, fontSize: '0.98rem', lineHeight: 1.25 }}>
                {t.title}
              </Typography>
              <Box sx={{ color: 'text.disabled', display: 'inline-flex' }}>
                <CaretRightIcon size={16} weight="bold" />
              </Box>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.2, lineHeight: 1.35 }}
            >
              {t.subtitle}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.25,
            py: 1,
            borderRadius: 2.25,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: '1.05rem',
              letterSpacing: '0.08em',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {loading ? '…' : code || '—'}
          </Typography>
          <IconButton
            size="small"
            aria-label={t.copyCode}
            disabled={!code || loading}
            onClick={(event) => void handleCopy(event)}
            sx={{
              flexShrink: 0,
              color: copied ? 'primary.main' : 'text.secondary',
              bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.14 : 0.1),
              '&:hover': {
                bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.22 : 0.16),
              },
            }}
          >
            <CopyIcon size={16} weight="bold" />
          </IconButton>
        </Stack>
        {copied ? (
          <Typography
            variant="caption"
            sx={{ mt: -0.75, color: 'primary.main', fontWeight: 700, px: 0.25 }}
          >
            {t.copied}
          </Typography>
        ) : null}

        <Box>
          {next ? (
            <>
              <Stack
                direction="row"
                sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.55 }}
              >
                <Typography sx={{ fontWeight: 750, fontSize: '0.84rem', minWidth: 0, pr: 1 }}>
                  {t.nextGoal}: {next.title}
                </Typography>
                <Typography
                  sx={{ fontWeight: 800, fontSize: '0.8rem', color: 'primary.main', flexShrink: 0 }}
                >
                  {loading ? '…' : `${referralCount}/${next.referralsRequired}`}
                  {!loading ? (
                    <Typography
                      component="span"
                      sx={{ ml: 0.65, fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}
                    >
                      +{next.boostCredits} BC
                    </Typography>
                  ) : null}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={loading ? 0 : progress}
                sx={{
                  height: 6,
                  borderRadius: 999,
                  bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.14 : 0.1),
                  '& .MuiLinearProgress-bar': { borderRadius: 999 },
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.5, lineHeight: 1.35 }}
              >
                {t.remaining(next.remaining)} · {t.openFull}
              </Typography>
            </>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.35 }}
            >
              {loading ? '…' : t.allDone}
            </Typography>
          )}
        </Box>

        <Box sx={{ pt: 1.15, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.1),
                color: 'primary.main',
              }}
            >
              <FireIcon size={15} weight="fill" />
            </Box>
            <Typography sx={{ fontWeight: 750, fontSize: '0.82rem', flex: 1, minWidth: 0 }}>
              {t.streakTitle}
            </Typography>
            <Typography
              sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', flexShrink: 0 }}
            >
              {loading ? '…' : `${streakCurrent}/${required}`}
              {!loading ? (
                <Typography
                  component="span"
                  sx={{ ml: 0.55, fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}
                >
                  +{streakReward} BC
                </Typography>
              ) : null}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={loading ? 0 : streakProgress}
            sx={{
              height: 5,
              borderRadius: 999,
              mb: 0.85,
              bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.14 : 0.1),
              '& .MuiLinearProgress-bar': { borderRadius: 999 },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
            {t.streakDays(required)}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              mt: 0.9,
              px: 1.1,
              py: 0.85,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <Box
              sx={{
                color: shareDone ? 'primary.main' : 'text.disabled',
                display: 'inline-flex',
                flexShrink: 0,
              }}
            >
              {shareDone ? (
                <CheckCircleIcon size={16} weight="fill" />
              ) : (
                <CircleIcon size={16} weight="regular" />
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: 750,
                  lineHeight: 1.25,
                  color: shareDone ? 'text.secondary' : 'text.primary',
                  textDecoration: shareDone ? 'line-through' : 'none',
                }}
              >
                {shareDone ? t.shareDone : t.shareTodo}
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    ml: 0.55,
                    fontWeight: 800,
                    color: shareDone ? 'text.disabled' : 'primary.main',
                  }}
                >
                  +{shareReward} BC
                </Typography>
              </Typography>
            </Box>
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={<ShareNetworkIcon size={14} weight="bold" />}
              onClick={handleOpenShare}
              sx={{
                flexShrink: 0,
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.75rem',
                minWidth: 0,
                height: 30,
                px: 1.35,
                borderRadius: 999,
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
                '& .MuiButton-startIcon': { mr: 0.55 },
              }}
            >
              {t.shareButton}
            </Button>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              mt: 1,
              px: 1.1,
              py: 0.95,
              borderRadius: 2,
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? AMBER_BORDER_DARK : AMBER_BORDER_LIGHT,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? AMBER_SOFT_DARK : AMBER_SOFT_LIGHT,
            }}
          >
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: 1.25,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(245, 166, 35, 0.22)' : 'rgba(245, 166, 35, 0.2)',
                color: AMBER,
              }}
            >
              <SealPercentIcon size={15} weight="fill" />
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: AMBER,
                fontWeight: 700,
                lineHeight: 1.35,
                fontSize: '0.72rem',
              }}
            >
              {t.lifetimeHint}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>

    <ShareMyListingsDialog
      open={sharePickerOpen}
      onClose={() => setSharePickerOpen(false)}
      onShareComplete={() => {
        void refreshStats();
        void checkSession();
      }}
    />
    </>
  );
}

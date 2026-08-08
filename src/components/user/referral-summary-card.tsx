'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha } from '@mui/material/styles';
import { Box, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { Fire as FireIcon } from '@phosphor-icons/react/dist/ssr/Fire';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';

import { portalCardSx } from '@/components/user/portal-cards';
import { useLanguage } from '@/hooks/use-language';
import { useUser } from '@/hooks/use-user';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { fetchMyReferralStats } from '@/lib/referrals-client';
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
    streakTitle: 'Aktivitet ditor',
    streakDays: (n: number) => `${n} ditë radhazi`,
    lifetimeHint: 'Përfundo të gjitha referimet dhe merr 20% zbritje përgjithmonë.',
  },
  en: {
    title: 'Referral',
    subtitle: 'Share your code with friends and earn Boost Coins.',
    copyCode: 'Copy code',
    copied: 'Copied',
    streakTitle: 'Daily activity',
    streakDays: (n: number) => `${n}-day streak`,
    lifetimeHint: 'Completing all referrals gives you 20% off forever.',
  },
} as const;

/** Compact referral hub — code, copy + daily streak — opens full referral page. */
export function ReferralSummaryCard() {
  const { user, checkSession } = useUser();
  const { language } = useLanguage();
  const t = copy[language];
  const [loading, setLoading] = React.useState(true);
  const [code, setCode] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [streakDays, setStreakDays] = React.useState(0);
  const [daysRequired, setDaysRequired] = React.useState(7);
  const [streakReward, setStreakReward] = React.useState(5);

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
      setStreakDays(res.referral.loginStreakDays ?? 0);
      setDaysRequired(
        res.referral.loginStreakDaysRequired ?? res.program?.loginStreak.daysRequired ?? 7,
      );
      setStreakReward(
        res.referral.loginStreakBoostCredits ?? res.program?.loginStreak.boostCredits ?? 5,
      );
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

  if (!canView) return null;

  const required = Math.max(1, daysRequired);
  const streakCurrent = Math.max(0, Math.min(streakDays, required));
  const streakProgress = Math.round((streakCurrent / required) * 100);

  return (
    <Box
      component={RouterLink}
      href={paths.user.referral}
      sx={{
        ...portalCardSx,
        p: { xs: 2, sm: 2.25 },
        alignSelf: 'stretch',
        width: '100%',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.5),
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'action.hover',
          transform: 'translateY(-1px)',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? `0 8px 24px ${alpha(theme.palette.common.black, 0.35)}`
              : `0 8px 22px ${alpha(theme.palette.common.black, 0.1)}`,
          '& .referral-card-caret': {
            color: 'primary.main',
            transform: 'translateX(2px)',
          },
          '& .referral-amber-row': {
            borderColor: AMBER,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(245, 166, 35, 0.2)' : 'rgba(245, 166, 35, 0.18)',
          },
        },
        '&:active': {
          transform: 'translateY(0)',
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
              <Box
                className="referral-card-caret"
                sx={{
                  color: 'primary.main',
                  display: 'inline-flex',
                  opacity: 0.85,
                  transition: 'transform 0.15s ease, color 0.15s ease',
                }}
              >
                <CaretRightIcon size={18} weight="bold" />
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
            className="referral-amber-row"
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
              transition: 'border-color 0.15s ease, background-color 0.15s ease',
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
                flex: 1,
                minWidth: 0,
                color: AMBER,
                fontWeight: 700,
                lineHeight: 1.35,
                fontSize: '0.72rem',
              }}
            >
              {t.lifetimeHint}
            </Typography>
            <Box sx={{ color: AMBER, display: 'inline-flex', flexShrink: 0, opacity: 0.9 }}>
              <CaretRightIcon size={16} weight="bold" />
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

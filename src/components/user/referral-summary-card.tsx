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
    streakDays: (n: number) => `${n} ditë radhazi`,
    lifetimeHint: (pct: number) => `Kompleto referimet · −${pct}% përgjithmonë`,
    lifetimeActive: (pct: number) => `−${pct}% përgjithmonë në paketa.`,
  },
  en: {
    title: 'Referral',
    subtitle: 'Share your code with friends and earn Boost Coins.',
    copyCode: 'Copy code',
    copied: 'Copied',
    streakDays: (n: number) => `${n}-day streak`,
    lifetimeHint: (pct: number) => `Finish all referrals · −${pct}% lifetime`,
    lifetimeActive: (pct: number) => `−${pct}% lifetime on packages.`,
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
  const [streakReward, setStreakReward] = React.useState(10);
  const [lifetimePercent, setLifetimePercent] = React.useState(0);
  const [maxLifetimePercent, setMaxLifetimePercent] = React.useState(20);

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
        res.referral.loginStreakBoostCredits ?? res.program?.loginStreak.boostCredits ?? 10,
      );
      setLifetimePercent(Number(res.referral.lifetimePercent) || 0);
      const maxPct = Number(res.program?.platformDominatorBadge?.lifetimePercent) || 20;
      setMaxLifetimePercent(maxPct);
      if (res.referral.loginStreakAwarded) {
        void checkSession();
      }
    } else if (res.program) {
      if (res.program.loginStreak) {
        setDaysRequired(res.program.loginStreak.daysRequired);
        setStreakReward(res.program.loginStreak.boostCredits);
      }
      const maxPct = Number(res.program.platformDominatorBadge?.lifetimePercent) || 20;
      setMaxLifetimePercent(maxPct);
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
        p: { xs: 1.5, sm: 1.65 },
        pb: { xs: 2, sm: 2.15 },
        alignSelf: 'stretch',
        width: '100%',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        '&:hover': {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.5),
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover',
          '& .referral-card-caret': {
            color: 'primary.main',
            transform: 'translateX(2px)',
          },
        },
      }}
    >
      <Stack spacing={1.1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              border: '1.5px solid',
              borderColor: 'primary.main',
              bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.1),
              color: 'primary.main',
            }}
          >
            <HandshakeIcon size={18} weight="fill" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 850, fontSize: '0.95rem', lineHeight: 1.2, minWidth: 0 }} noWrap>
                {t.title}
              </Typography>
              <Box
                className="referral-card-caret"
                sx={{
                  color: 'text.disabled',
                  display: 'inline-flex',
                  flexShrink: 0,
                  transition: 'transform 0.15s ease, color 0.15s ease',
                }}
              >
                <CaretRightIcon size={14} weight="bold" />
              </Box>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.15, lineHeight: 1.3, fontSize: '0.72rem' }}
              noWrap
            >
              {t.subtitle}
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 0.75,
            alignItems: 'stretch',
          }}
        >
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              alignItems: 'center',
              minWidth: 0,
              px: 1,
              py: 0.7,
              borderRadius: 1.5,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            }}
          >
            <Typography
              sx={{
                flex: 1,
                minWidth: 0,
                fontWeight: 850,
                fontSize: '0.82rem',
                letterSpacing: '0.08em',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {loading ? '…' : code || '—'}
            </Typography>
            <IconButton
              size="small"
              aria-label={copied ? t.copied : t.copyCode}
              disabled={!code || loading}
              onClick={(event) => void handleCopy(event)}
              sx={{
                flexShrink: 0,
                p: 0.4,
                color: copied ? 'primary.main' : 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <CopyIcon size={14} weight="bold" />
            </IconButton>
          </Stack>

          <Stack
            direction="row"
            spacing={0.55}
            sx={{
              alignItems: 'center',
              minWidth: 0,
              px: 1,
              py: 0.7,
              borderRadius: 1.5,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(245, 166, 35, 0.4)' : 'rgba(245, 166, 35, 0.35)',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(245, 166, 35, 0.12)' : 'rgba(245, 166, 35, 0.1)',
            }}
          >
            <Box sx={{ color: AMBER, display: 'inline-flex', flexShrink: 0, lineHeight: 0 }}>
              <SealPercentIcon size={13} weight="fill" />
            </Box>
            <Typography
              variant="caption"
              sx={{
                flex: 1,
                minWidth: 0,
                color: AMBER,
                fontWeight: 750,
                lineHeight: 1.25,
                fontSize: '0.64rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {lifetimePercent >= maxLifetimePercent
                ? t.lifetimeActive(lifetimePercent)
                : t.lifetimeHint(maxLifetimePercent)}
            </Typography>
            <Box
              className="referral-card-caret"
              sx={{
                color: AMBER,
                display: 'inline-flex',
                flexShrink: 0,
                lineHeight: 0,
                opacity: 0.9,
                transition: 'transform 0.15s ease, color 0.15s ease',
              }}
            >
              <CaretRightIcon size={12} weight="bold" />
            </Box>
          </Stack>
        </Box>

        <Stack spacing={0.45} sx={{ pb: 0.35 }}>
          <Stack direction="row" spacing={0.65} sx={{ alignItems: 'center' }}>
            <Box sx={{ color: 'primary.main', display: 'inline-flex', flexShrink: 0, lineHeight: 0 }}>
              <FireIcon size={14} weight="fill" />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', flexShrink: 0 }}>
              {loading ? '…' : `${streakCurrent}/${required}`}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 650, fontSize: '0.7rem', minWidth: 0 }}
              noWrap
            >
              {t.streakDays(required)}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontWeight: 750, fontSize: '0.7rem', color: 'text.secondary', flexShrink: 0 }}>
              +{streakReward} BC
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={loading ? 0 : streakProgress}
            sx={{
              height: 4,
              borderRadius: 999,
              bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.14 : 0.1),
              '& .MuiLinearProgress-bar': { borderRadius: 999 },
            }}
          />
        </Stack>
      </Stack>
    </Box>
  );
}

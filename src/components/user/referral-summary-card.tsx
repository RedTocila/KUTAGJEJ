'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha } from '@mui/material/styles';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
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
    copyCode: 'Kopjo kodin',
    copied: 'U kopjua',
    streakDays: (n: number) => `${n} ditë radhazi`,
    lifetimeLabel: (pct: number) => `−${pct}% përgjithmonë`,
  },
  en: {
    title: 'Referral',
    copyCode: 'Copy code',
    copied: 'Copied',
    streakDays: (n: number) => `${n}-day streak`,
    lifetimeLabel: (pct: number) => `−${pct}% lifetime`,
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
  const streakDots = Math.min(required, 14);

  return (
    <Box
      component={RouterLink}
      href={paths.user.referral}
      sx={{
        ...portalCardSx,
        p: { xs: 1.5, sm: 1.65 },
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
            transform: 'translateX(3px)',
            color: 'primary.main',
            opacity: 1,
          },
        },
      }}
    >
      <Stack spacing={0.95}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
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
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.05rem',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              flexShrink: 0,
            }}
            noWrap
          >
            {t.title}
          </Typography>
          <Box sx={{ flex: 1, minWidth: 8 }} />
          <Stack
            direction="row"
            spacing={0.45}
            sx={{
              alignItems: 'center',
              flexShrink: 0,
              px: 1,
              py: 0.5,
              borderRadius: 999,
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
              sx={{
                color: AMBER,
                fontWeight: 750,
                lineHeight: 1,
                fontSize: '0.72rem',
                whiteSpace: 'nowrap',
              }}
            >
              {t.lifetimeLabel(lifetimePercent >= maxLifetimePercent ? lifetimePercent : maxLifetimePercent)}
            </Typography>
          </Stack>
          <Box
            className="referral-card-caret"
            sx={{
              color: 'text.secondary',
              display: 'flex',
              flexShrink: 0,
              ml: 0.25,
              opacity: 0.7,
              transition: 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1), color 160ms ease, opacity 160ms ease',
            }}
          >
            <CaretRightIcon size={20} weight="bold" />
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: 'center',
            minWidth: 0,
            px: 1.1,
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

        <Stack spacing={0.55}>
          <Stack direction="row" spacing={0.65} sx={{ alignItems: 'center' }}>
            <Box sx={{ color: 'primary.main', display: 'inline-flex', flexShrink: 0, lineHeight: 0 }}>
              <FireIcon size={14} weight="fill" />
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 650, fontSize: '0.7rem', minWidth: 0 }}
              noWrap
            >
              {t.streakDays(required)}
            </Typography>
          </Stack>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', width: '100%', justifyContent: 'space-between' }}
            aria-label={`${streakCurrent}/${required}`}
          >
            {Array.from({ length: streakDots }, (_, index) => {
              const done = !loading && index < streakCurrent;
              return (
                <Box
                  key={index}
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    bgcolor: done
                      ? 'primary.main'
                      : (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.22 : 0.14),
                    color: 'common.white',
                  }}
                >
                  {done ? <CheckIcon size={9} weight="bold" /> : null}
                </Box>
              );
            })}
            <Typography sx={{ fontWeight: 750, fontSize: '0.7rem', color: 'text.secondary', flexShrink: 0 }}>
              +{streakReward} BC
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

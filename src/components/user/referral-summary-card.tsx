'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha } from '@mui/material/styles';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { Copy as CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { Fire as FireIcon } from '@phosphor-icons/react/dist/ssr/Fire';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { Percent as PercentIcon } from '@phosphor-icons/react/dist/ssr/Percent';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { PortalIconBox } from '@/components/user/portal-cards';
import { useLanguage } from '@/hooks/use-language';
import { useUser } from '@/hooks/use-user';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { fetchMyReferralStats } from '@/lib/referrals-client';
import { paths } from '@/paths';

const GOLD = '#FFC400';
const GOLD_DEEP = '#E6A800';

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
    title: 'Refero & Kurse',
    invite: 'Ftoni miqtë dhe merrni',
    off: (pct: number) => `${pct}% ZBRITJE`,
    forever: 'PËRGJITHMONË',
    codeLabel: 'Kodi yt i referimit',
    copyCode: 'Kopjo',
    copied: 'U kopjua',
    streakTitle: (n: number) => `Serie ${n}-ditore`,
    streakHint: 'Vazhdo kështu!',
    afterDays: (n: number) => `Pas ${n} ditësh`,
  },
  en: {
    title: 'Refer & Save',
    invite: 'Invite friends and get',
    off: (pct: number) => `${pct}% OFF`,
    forever: 'FOREVER',
    codeLabel: 'Your referral code',
    copyCode: 'Copy',
    copied: 'Copied',
    streakTitle: (n: number) => `${n}-day streak`,
    streakHint: 'Keep it up!',
    afterDays: (n: number) => `After ${n} days`,
  },
} as const;

function DiscountTag() {
  return (
    <Box
      sx={{
        position: 'relative',
        width: { xs: 64, sm: 76 },
        height: { xs: 64, sm: 76 },
        flexShrink: 0,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <Box
        sx={{
          position: 'absolute',
          inset: { xs: 6, sm: 8 },
          color: GOLD,
          transform: 'rotate(-22deg)',
          filter: `drop-shadow(0 0 10px ${alpha(GOLD, 0.55)})`,
        }}
      >
        <TagIcon size={52} weight="fill" />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#111',
            transform: 'translate(2px, 3px) rotate(22deg)',
          }}
        >
          <PercentIcon size={16} weight="bold" />
        </Box>
      </Box>
      <Box sx={{ position: 'absolute', top: 2, right: 6, color: GOLD, opacity: 0.95 }}>
        <SparkleIcon size={11} weight="fill" />
      </Box>
      <Box sx={{ position: 'absolute', top: 22, right: 0, color: GOLD, opacity: 0.7 }}>
        <SparkleIcon size={8} weight="fill" />
      </Box>
      <Box sx={{ position: 'absolute', bottom: 8, left: 4, color: GOLD, opacity: 0.75 }}>
        <SparkleIcon size={9} weight="fill" />
      </Box>
    </Box>
  );
}

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
  const [streakReward, setStreakReward] = React.useState(25);
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
        res.referral.loginStreakBoostCredits ?? res.program?.loginStreak.boostCredits ?? 25,
      );
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
  const streakDots = Math.min(required, 7);
  const offerPercent = Math.max(1, maxLifetimePercent);

  return (
    <Box
      component={RouterLink}
      href={paths.user.referral}
      sx={{
        alignSelf: 'stretch',
        width: '100%',
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        borderRadius: 3.25,
        overflow: 'hidden',
        p: { xs: 1.7, sm: 2 },
        border: '1px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? alpha('#fff', 0.1) : 'divider',
        bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#121212' : 'background.paper'),
        backgroundImage: (theme) =>
          theme.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${alpha('#ffffff', 0.05)} 0%, transparent 32%)`
            : 'none',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark' ? `inset 0 1px 0 ${alpha('#ffffff', 0.07)}` : 'none',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        '&:hover': {
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? primaryMainAlpha(0.45) : 'primary.main',
        },
      }}
    >
      <Stack spacing={{ xs: 1.5, sm: 1.7 }}>
        <Stack direction="row" spacing={1.35} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ pt: 0.15 }}>
            <PortalIconBox>
              <HandshakeIcon size={24} weight="duotone" />
            </PortalIconBox>
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.1 }}>
            <Typography
              sx={{
                fontWeight: 850,
                fontSize: { xs: '1.12rem', sm: '1.22rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'text.primary'),
              }}
            >
              {t.title}
            </Typography>
            <Typography
              sx={{
                mt: 0.25,
                fontSize: { xs: '0.78rem', sm: '0.82rem' },
                lineHeight: 1.3,
                fontWeight: 550,
                color: 'text.secondary',
              }}
            >
              {t.invite}
            </Typography>
            <Stack
              direction="row"
              spacing={0.85}
              sx={{ alignItems: 'center', mt: 0.55, minWidth: 0, flexWrap: 'wrap', rowGap: 0.6 }}
            >
              <Typography
                sx={{
                  fontWeight: 850,
                  fontSize: { xs: '1.15rem', sm: '1.28rem' },
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: GOLD,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.off(offerPercent)}
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: 1.35,
                  py: 0.42,
                  borderRadius: 999,
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: GOLD,
                  backgroundImage: `linear-gradient(105deg, #FFE27A 0%, ${GOLD} 48%, ${GOLD_DEEP} 100%)`,
                  boxShadow: `0 2px 10px ${alpha(GOLD, 0.32)}`,
                  '@keyframes referralForeverSheen': {
                    '0%': { transform: 'translateX(-130%)' },
                    '18%': { transform: 'translateX(280%)' },
                    '100%': { transform: 'translateX(280%)' },
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '42%',
                    pointerEvents: 'none',
                    background: `linear-gradient(90deg, transparent 0%, ${alpha('#fff', 0.28)} 35%, ${alpha('#fff', 0.78)} 50%, ${alpha('#fff', 0.28)} 65%, transparent 100%)`,
                    animation: 'referralForeverSheen 3.8s ease-in-out infinite',
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    '&::after': { animation: 'none', opacity: 0 },
                  },
                }}
              >
                <Typography
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    fontWeight: 850,
                    fontSize: '0.62rem',
                    letterSpacing: '0.08em',
                    lineHeight: 1,
                    color: '#111',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.forever}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <DiscountTag />
        </Stack>

        <Box>
          <Typography
            sx={{
              fontSize: '0.72rem',
              fontWeight: 650,
              color: 'text.secondary',
              mb: 0.7,
              px: 0.15,
            }}
          >
            {t.codeLabel}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              minWidth: 0,
              pl: 1.5,
              pr: 0.7,
              py: 0.65,
              borderRadius: 2.25,
              border: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? alpha('#fff', 0.12) : 'divider',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? alpha('#000', 0.28) : 'rgba(0,0,0,0.03)',
            }}
          >
            <Typography
              sx={{
                flex: 1,
                minWidth: 0,
                fontWeight: 800,
                fontSize: { xs: '1.05rem', sm: '1.18rem' },
                letterSpacing: '0.06em',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'text.primary'),
              }}
            >
              {loading ? '…' : code || '—'}
            </Typography>
            <ButtonBase
              disabled={!code || loading}
              aria-label={copied ? t.copied : t.copyCode}
              onClick={(event) => void handleCopy(event)}
              sx={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.55,
                px: 1.15,
                py: 0.65,
                borderRadius: 1.75,
                border: '1.5px solid',
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.12 : 0.08),
                },
                '&.Mui-disabled': { opacity: 0.45 },
              }}
            >
              {copied ? <CheckIcon size={15} weight="bold" /> : <CopyIcon size={15} weight="bold" />}
              <Typography
                component="span"
                sx={{ fontWeight: 750, fontSize: '0.78rem', lineHeight: 1, color: 'inherit' }}
              >
                {copied ? t.copied : t.copyCode}
              </Typography>
            </ButtonBase>
          </Stack>
        </Box>

        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: { xs: 0.75, sm: 1.15 },
            px: { xs: 1, sm: 1.35 },
            py: { xs: 1, sm: 1.2 },
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? alpha('#fff', 0.1) : 'divider',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? alpha('#fff', 0.035) : 'rgba(0,0,0,0.025)',
          }}
          aria-label={`${streakCurrent}/${required} ${t.streakTitle(required)}`}
        >
          <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', flexShrink: 0, minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 24, sm: 28 },
                height: { xs: 24, sm: 28 },
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.22 : 0.16),
                color: 'primary.main',
              }}
            >
              <FireIcon size={14} weight="fill" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '0.72rem', sm: '0.82rem' },
                  lineHeight: 1.15,
                  color: (theme) => (theme.palette.mode === 'dark' ? '#fff' : 'text.primary'),
                }}
                noWrap
              >
                {t.streakTitle(required)}
              </Typography>
              <Typography
                sx={{ fontSize: { xs: '0.6rem', sm: '0.68rem' }, color: 'text.secondary', lineHeight: 1.15 }}
                noWrap
              >
                {t.streakHint}
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            sx={{
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flex: 1,
              minWidth: 0,
              px: { xs: 0.15, sm: 0.35 },
            }}
          >
            {Array.from({ length: streakDots }, (_, index) => {
              const done = !loading && index < streakCurrent;
              return (
                <Stack key={index} spacing={0.3} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: { xs: 16, sm: 20 },
                      height: { xs: 16, sm: 20 },
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      border: done ? 'none' : '1.5px solid',
                      borderColor: (theme) =>
                        theme.palette.mode === 'dark' ? alpha('#fff', 0.2) : 'divider',
                      bgcolor: done ? 'primary.main' : 'transparent',
                      color: done ? '#fff' : 'transparent',
                      boxShadow: done
                        ? (theme) =>
                            theme.palette.mode === 'dark'
                              ? `0 0 8px ${primaryMainAlpha(0.65)}`
                              : 'none'
                        : 'none',
                    }}
                  >
                    {done ? <CheckIcon size={9} weight="bold" /> : null}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: { xs: '0.52rem', sm: '0.58rem' },
                      fontWeight: 700,
                      lineHeight: 1,
                      color: done ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {index + 1}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>

          <Stack
            direction="row"
            spacing={0.65}
            sx={{
              alignItems: 'center',
              flexShrink: 0,
              pl: { xs: 0.75, sm: 1.15 },
              borderLeft: '1px solid',
              borderColor: (theme) =>
                theme.palette.mode === 'dark' ? alpha('#fff', 0.12) : 'divider',
            }}
          >
            <BoostCoinIcon size={20} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 850,
                  fontSize: { xs: '0.78rem', sm: '0.92rem' },
                  lineHeight: 1.15,
                  color: GOLD,
                  whiteSpace: 'nowrap',
                }}
              >
                +{streakReward} BC
              </Typography>
              <Typography
                sx={{ fontSize: { xs: '0.56rem', sm: '0.64rem' }, color: 'text.secondary', lineHeight: 1.15 }}
                noWrap
              >
                {t.afterDays(required)}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

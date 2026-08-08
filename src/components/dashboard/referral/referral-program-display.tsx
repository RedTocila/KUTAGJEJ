'use client';

import * as React from 'react';
import { alpha } from '@mui/material/styles';
import { Box, Chip, LinearProgress, Stack, Typography, useTheme } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Circle as CircleIcon } from '@phosphor-icons/react/dist/ssr/Circle';
import { CirclesThreePlus as CirclesThreePlusIcon } from '@phosphor-icons/react/dist/ssr/CirclesThreePlus';
import { Crown as CrownIcon } from '@phosphor-icons/react/dist/ssr/Crown';
import { CurrencyCircleDollar as CurrencyCircleDollarIcon } from '@phosphor-icons/react/dist/ssr/CurrencyCircleDollar';
import { SealCheck as SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { UserPlus as UserPlusIcon } from '@phosphor-icons/react/dist/ssr/UserPlus';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import type { ReferralBadge, ReferralProgram, ReferralTrustedBadge } from '@/types/referral-program';

type Accent = 'primary' | 'warning';

function progressOf(current: number, thresholds: number[]) {
  const max = thresholds.length ? thresholds[thresholds.length - 1] : 1;
  const achieved = thresholds.filter((t) => current >= t).length;
  const percent = Math.round(Math.max(0, Math.min(100, (current / Math.max(max, 1)) * 100)));
  return { achieved, total: thresholds.length, percent };
}

function TierLine({
  title,
  hint,
  reward,
  done,
  accent,
  progressPercent,
  action,
}: {
  title: string;
  hint: string;
  reward: string;
  done: boolean;
  accent: Accent;
  /** 0–100; when set, shows a thin bar under the hint (login streak). */
  progressPercent?: number;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  const main = theme.palette[accent].main;
  const showProgress = typeof progressPercent === 'number';
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: showProgress ? 'flex-start' : 'center',
        py: 0.7,
        px: 0.85,
        borderRadius: 1.25,
        bgcolor: done ? alpha(main, 0.09) : 'transparent',
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          color: done ? main : 'text.disabled',
          flexShrink: 0,
          pt: showProgress ? 0.15 : 0,
        }}
      >
        {done ? <CheckCircleIcon size={16} weight="fill" /> : <CircleIcon size={16} weight="regular" />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 750, lineHeight: 1.25, fontSize: '0.82rem' }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
          {hint}
        </Typography>
        {showProgress ? (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, progressPercent))}
            color={accent}
            sx={{
              mt: 0.65,
              height: 5,
              borderRadius: 999,
              bgcolor: alpha(main, 0.14),
              '& .MuiLinearProgress-bar': { borderRadius: 999 },
            }}
          />
        ) : null}
      </Box>
      {action}
      <Chip
        size="small"
        label={reward}
        color={accent}
        variant={done ? 'filled' : 'outlined'}
        sx={{ height: 22, fontWeight: 800, fontSize: '0.68rem', flexShrink: 0, mt: showProgress ? 0.1 : 0 }}
      />
    </Stack>
  );
}

function MiniBadge({
  badge,
  Icon,
  tone,
}: {
  badge: ReferralBadge | ReferralTrustedBadge;
  Icon: PhosphorIcon;
  tone: 'green' | 'gold';
}) {
  const isTrusted = 'reviewsRequired' in badge && typeof badge.reviewsRequired === 'number';
  const bg =
    tone === 'gold'
      ? 'linear-gradient(135deg, #ffd35c 0%, #d98f00 100%)'
      : 'linear-gradient(135deg, #3fd266 0%, #1a7f37 100%)';
  return (
    <Stack
      direction="row"
      spacing={1.15}
      sx={{
        alignItems: 'center',
        mt: 0.85,
        p: 1,
        borderRadius: 1.5,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)'),
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 1.25,
          background: bg,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <Icon size={17} weight="fill" color={tone === 'gold' ? '#1a1a1a' : '#fff'} />
        <Box
          sx={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            width: 14,
            height: 14,
            borderRadius: '50%',
            bgcolor: '#d98f00',
            display: 'grid',
            placeItems: 'center',
            border: '1.5px solid',
            borderColor: 'background.paper',
          }}
        >
          <SealCheckIcon size={8} weight="fill" color="#fff" />
        </Box>
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', lineHeight: 1.2 }}>
          Badge: {badge.label} · {badge.lifetimePercent}% lifetime
          {isTrusted ? ` · ${(badge as ReferralTrustedBadge).reviewsRequired} reviews` : ''}
        </Typography>
        {badge.description ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
            {badge.description}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

function GroupCard({
  icon: Icon,
  kindLabel,
  title,
  howItWorks,
  current,
  unit,
  thresholds,
  accent,
  children,
  badge,
}: {
  icon: PhosphorIcon;
  kindLabel: string;
  title: string;
  howItWorks: string;
  current: number;
  unit: string;
  thresholds: number[];
  accent: Accent;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const { achieved, total, percent } = progressOf(current, thresholds);
  const done = total > 0 && achieved >= total;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Stack
        spacing={1}
        sx={{
          px: 1.5,
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) =>
            accent === 'warning'
              ? t.palette.mode === 'dark'
                ? 'rgba(245,166,35,0.08)'
                : 'rgba(245,166,35,0.06)'
              : t.palette.mode === 'dark'
                ? 'rgba(118,186,27,0.08)'
                : 'rgba(118,186,27,0.06)',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: accent === 'warning' ? 'warning.main' : 'primary.main',
            }}
          >
            <Icon size={18} weight="duotone" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                size="small"
                label={kindLabel}
                color={accent}
                variant="outlined"
                sx={{ height: 20, fontWeight: 800, fontSize: '0.62rem', letterSpacing: 0.2 }}
              />
              <Chip
                size="small"
                label={done ? 'Kompletuar' : `${achieved}/${total}`}
                color={done ? 'success' : 'default'}
                sx={{ height: 20, fontWeight: 800, fontSize: '0.62rem' }}
              />
            </Stack>
            <Typography sx={{ fontWeight: 850, fontSize: '0.92rem', mt: 0.45, lineHeight: 1.25 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, lineHeight: 1.35 }}>
              {howItWorks}
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={0.4}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {current} {unit}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: `${accent}.main` }}>
              {percent}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={percent}
            color={accent}
            sx={{ height: 5, borderRadius: 3 }}
          />
        </Stack>
      </Stack>

      <Stack spacing={0.15} sx={{ px: 1.15, py: 1 }}>
        {children}
        {badge}
      </Stack>
    </Box>
  );
}

export function ProgramDisplay({
  program,
  referralCount = 0,
  paidReferralCount = 0,
  reviewCount = 0,
  compact = false,
  loginStreakDays = 0,
}: {
  program: ReferralProgram;
  referralCount?: number;
  paidReferralCount?: number;
  reviewCount?: number;
  compact?: boolean;
  loginStreakDays?: number;
}) {
  const freeThresholds = program.freeTiers.map((t) => t.referralsRequired);
  const paidThresholds = program.paidTiers.map((t) => t.paidReferralsRequired);
  const reviewThresholds = program.reviewMilestones.map((m) => m.reviewsRequired);
  const streakRequired = Math.max(1, program.loginStreak.daysRequired);
  const streakCurrent = Math.max(0, Math.min(loginStreakDays, streakRequired));
  const streakProgress = Math.round((streakCurrent / streakRequired) * 100);

  return (
    <Stack spacing={1.5}>
      {!compact ? (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
            {program.pageTitle}
          </Typography>
          {program.pageSubtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
              {program.pageSubtitle}
            </Typography>
          ) : null}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 650 }}>
          Çdo grup më poshtë është një lloj shpërblimi i ndryshëm — progresi juaj matet veç e veç.
        </Typography>
      )}

      <GroupCard
        icon={UserPlusIcon}
        kindLabel="1 · Referime falas"
        title={program.freeSignUpTitle || 'Regjistrime falas'}
        howItWorks="Ftoni miq që krijojnë llogari falas. Sa më shumë referime, aq më shumë Boost Coins."
        current={referralCount}
        unit="referime"
        thresholds={freeThresholds}
        accent="primary"
        badge={<MiniBadge badge={program.networkBuilderBadge} Icon={CirclesThreePlusIcon} tone="green" />}
      >
        {program.freeTiers.map((t) => (
          <TierLine
            key={`${t.level}-${t.title}`}
            title={t.title}
            hint={`Niveli ${t.level} · duhen ${t.referralsRequired} referime`}
            reward={`+${t.boostCredits} BC`}
            done={referralCount >= t.referralsRequired}
            accent="primary"
          />
        ))}
      </GroupCard>

      <GroupCard
        icon={BoostCoinIcon as PhosphorIcon}
        kindLabel="2 · Referime të paguara"
        title={program.paidTitle || 'Referime të paguara'}
        howItWorks="Kur personi i ftuar blen një paketë me pagesë, llogaritet si referim i paguar (shpërblime më të mëdha)."
        current={paidReferralCount}
        unit="të paguara"
        thresholds={paidThresholds}
        accent="primary"
        badge={<MiniBadge badge={program.revenueDriverBadge} Icon={CurrencyCircleDollarIcon} tone="green" />}
      >
        {program.paidTiers.map((t) => (
          <TierLine
            key={`${t.tier}-${t.title}`}
            title={t.title}
            hint={
              t.premiumMonths > 0
                ? `${t.paidReferralsRequired} të paguara · +${t.premiumMonths} muaj premium`
                : `Duhen ${t.paidReferralsRequired} referime të paguara`
            }
            reward={`+${t.boostCredits} BC`}
            done={paidReferralCount >= t.paidReferralsRequired}
            accent="primary"
          />
        ))}
      </GroupCard>

      <GroupCard
        icon={StarIcon}
        kindLabel="3 · Vlerësime"
        title={program.reviewsTitle || 'Vlerësime'}
        howItWorks="Fitoni Boost Coins kur merrni vlerësime nga klientët në njoftimet tuaja."
        current={reviewCount}
        unit="vlerësime"
        thresholds={reviewThresholds}
        accent="warning"
        badge={<MiniBadge badge={program.trustedReviewerBadge} Icon={SealCheckIcon} tone="gold" />}
      >
        {program.reviewMilestones.map((m, i) => (
          <TierLine
            key={`${m.reviewsRequired}-${i}`}
            title={`${m.reviewsRequired} vlerësime`}
            hint="Milestone i vlerësimeve"
            reward={`+${m.boostCredits} BC`}
            done={reviewCount >= m.reviewsRequired}
            accent="warning"
          />
        ))}
      </GroupCard>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2.5,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'flex-start',
            px: 1.5,
            py: 1.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: (t) =>
              t.palette.mode === 'dark' ? 'rgba(245,166,35,0.08)' : 'rgba(245,166,35,0.06)',
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: 'warning.main',
            }}
          >
            <CrownIcon size={18} weight="duotone" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Chip
              size="small"
              label="4 · Kompletuesi"
              color="warning"
              variant="outlined"
              sx={{ height: 20, fontWeight: 800, fontSize: '0.62rem', mb: 0.45 }}
            />
            <Typography sx={{ fontWeight: 850, fontSize: '0.92rem', lineHeight: 1.25 }}>
              {program.completionTitle || 'Badge i platformës'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
              {program.completionSubtitle ||
                'Badge speciale kur arrini nivelet më të larta të programit të referimit.'}
            </Typography>
          </Box>
        </Stack>
        <Box sx={{ px: 1.15, py: 1 }}>
          <MiniBadge badge={program.platformDominatorBadge} Icon={CrownIcon} tone="gold" />
        </Box>
      </Box>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2.5,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'flex-start',
            px: 1.5,
            py: 1.25,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: (t) =>
              t.palette.mode === 'dark' ? 'rgba(118,186,27,0.08)' : 'rgba(118,186,27,0.06)',
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              color: 'primary.main',
            }}
          >
            <ShareNetworkIcon size={18} weight="duotone" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Chip
              size="small"
              label="5 · Aktivitet ditor"
              color="primary"
              variant="outlined"
              sx={{ height: 20, fontWeight: 800, fontSize: '0.62rem', mb: 0.45 }}
            />
            <Typography sx={{ fontWeight: 850, fontSize: '0.92rem', lineHeight: 1.25 }}>
              {program.loginStreakTitle || 'Aktivitet ditor'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
              {program.loginStreakSubtitle ||
                'Shpërblime të vogla për aktivitet të rregullt — të ndara nga referimet.'}
            </Typography>
          </Box>
        </Stack>
        <Stack spacing={0.15} sx={{ px: 1.15, py: 1 }}>
          <TierLine
            title={`${streakRequired} ditë radhazi`}
            hint={
              streakCurrent > 0
                ? `${streakCurrent}/${streakRequired} ditë`
                : 'Hyr çdo ditë në platformë'
            }
            reward={`+${program.loginStreak.boostCredits} BC`}
            done={streakCurrent >= streakRequired}
            accent="primary"
            progressPercent={streakProgress}
          />
        </Stack>
      </Box>
    </Stack>
  );
}

'use client';

import * as React from 'react';
import { alpha } from '@mui/material/styles';
import { Box, Card, CardContent, Chip, Divider, Stack, Typography, useTheme } from '@mui/material';
import { Check as CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Circle as CircleIcon } from '@phosphor-icons/react/dist/ssr/Circle';
import { Crown as CrownIcon } from '@phosphor-icons/react/dist/ssr/Crown';
import { SealCheck as SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { TrendUp as TrendUpIcon } from '@phosphor-icons/react/dist/ssr/TrendUp';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import type { ReferralBadge, ReferralProgram, ReferralTrustedBadge } from '@/types/referral-program';

type Accent = 'primary' | 'warning';

const GRADIENTS = {
  green: 'linear-gradient(135deg, #3fd266 0%, #1a7f37 100%)',
  gold: 'linear-gradient(135deg, #ffd35c 0%, #d98f00 100%)',
} as const;

// ---------------------------------------------------------------------------
// Checkpoint slider
// ---------------------------------------------------------------------------

function CheckpointSlider({
  thresholds,
  current,
  accent,
}: {
  thresholds: number[];
  current: number;
  accent: Accent;
}) {
  const theme = useTheme();
  const main = theme.palette[accent].main;
  const max = thresholds.length ? thresholds[thresholds.length - 1] : 1;
  const fillPercent = Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <Box sx={{ position: 'relative', px: 1.5, pt: 1.25, pb: 3 }}>
      <Box sx={{ position: 'relative', height: 18 }}>
        {/* base track */}
        <Box
          sx={{
            position: 'absolute',
            top: 7,
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            bgcolor: 'divider',
          }}
        />
        {/* filled track */}
        <Box
          sx={{
            position: 'absolute',
            top: 7,
            left: 0,
            width: `${fillPercent}%`,
            height: 4,
            borderRadius: 2,
            bgcolor: main,
            transition: 'width 0.4s ease',
          }}
        />
        {thresholds.map((threshold, i) => {
          const pos = Math.max(0, Math.min(100, (threshold / max) * 100));
          const achieved = current >= threshold;
          return (
            <Box
              key={`${threshold}-${i}`}
              sx={{ position: 'absolute', top: 0, left: `${pos}%`, transform: 'translateX(-50%)' }}
            >
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  border: '2px solid',
                  borderColor: main,
                  bgcolor: achieved ? main : 'background.paper',
                }}
              >
                {achieved ? (
                  <CheckIcon size={9} weight="bold" color={theme.palette[accent].contrastText} />
                ) : (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: main }} />
                )}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: 22,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: achieved ? 'text.primary' : 'text.disabled',
                  fontWeight: achieved ? 700 : 500,
                  fontSize: '0.7rem',
                }}
              >
                {threshold}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Achievement row (level / tier / review milestone)
// ---------------------------------------------------------------------------

function TierRow({
  heading,
  subtitle,
  boostCredits,
  achieved,
  accent,
}: {
  heading: string;
  subtitle: string;
  boostCredits: number;
  achieved: boolean;
  accent: Accent;
}) {
  const theme = useTheme();
  const main = theme.palette[accent].main;
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: 'center',
        py: 1,
        px: 1.25,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: achieved ? alpha(main, 0.5) : 'transparent',
        bgcolor: achieved ? alpha(main, 0.08) : 'transparent',
      }}
    >
      <Box sx={{ display: 'inline-flex', color: achieved ? main : 'text.disabled', flexShrink: 0 }}>
        {achieved ? (
          <CheckCircleIcon size={20} weight="fill" />
        ) : (
          <CircleIcon size={20} weight="regular" />
        )}
      </Box>
      <Stack spacing={0.1} sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {heading}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>
      <Chip
        size="small"
        label={`+${boostCredits} BC`}
        color={accent}
        variant="outlined"
        sx={{ fontWeight: 700, flexShrink: 0 }}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Badge card
// ---------------------------------------------------------------------------

function BadgeCard({
  badge,
  icon: Icon,
  gradient,
  iconColor,
}: {
  badge: ReferralBadge | ReferralTrustedBadge;
  icon: PhosphorIcon;
  gradient: string;
  iconColor: string;
}) {
  const isTrusted = 'reviewsRequired' in badge && typeof badge.reviewsRequired === 'number';
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        p: 1.5,
        borderRadius: 2,
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.05)'),
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 52,
          height: 52,
          borderRadius: 2,
          background: gradient,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        }}
      >
        <Icon size={26} weight="fill" color={iconColor} />
        <Box
          sx={{
            position: 'absolute',
            bottom: -5,
            right: -5,
            width: 20,
            height: 20,
            borderRadius: '50%',
            bgcolor: '#d98f00',
            display: 'grid',
            placeItems: 'center',
            border: '2px solid',
            borderColor: 'background.paper',
          }}
        >
          <SealCheckIcon size={11} weight="fill" color="#fff" />
        </Box>
      </Box>

      <Stack spacing={0.4} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={badge.label}
            sx={{ bgcolor: '#f0a020', color: '#1a1a1a', fontWeight: 800, height: 22 }}
          />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {badge.lifetimePercent}% Lifetime
            {isTrusted ? ` · në ${(badge as ReferralTrustedBadge).reviewsRequired} reviews` : ''}
          </Typography>
        </Stack>
        {badge.description ? (
          <Typography variant="caption" color="text.secondary">
            {badge.description}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Section shell with progress header
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  subtitle,
  unitLabel,
  current,
  thresholds,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  unitLabel: string;
  current: number;
  thresholds: number[];
  accent: Accent;
  children: React.ReactNode;
}) {
  const total = thresholds.length;
  const achievedCount = thresholds.filter((t) => current >= t).length;
  const max = total ? thresholds[total - 1] : 1;
  const percent = Math.round(Math.max(0, Math.min(100, (current / max) * 100)));

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}

        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 2.5 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {current} {unitLabel} · {achievedCount}/{total} checkpointe
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, color: `${accent}.main` }}>
            {percent}%
          </Typography>
        </Stack>

        <CheckpointSlider thresholds={thresholds} current={current} accent={accent} />

        <Stack spacing={1}>{children}</Stack>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Simple reward row (login streak)
// ---------------------------------------------------------------------------

function RewardRow({
  title,
  subtitle,
  boostCredits,
  accent,
}: {
  title: string;
  subtitle: string;
  boostCredits: number;
  accent: Accent;
}) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', py: 1.25 }}>
      <Stack spacing={0.1} sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>
      <Chip
        size="small"
        label={`+${boostCredits} BC`}
        color={accent}
        variant="outlined"
        sx={{ fontWeight: 700, flexShrink: 0 }}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Program display
// ---------------------------------------------------------------------------

export function ProgramDisplay({
  program,
  referralCount = 0,
  paidReferralCount = 0,
  reviewCount = 0,
}: {
  program: ReferralProgram;
  referralCount?: number;
  paidReferralCount?: number;
  reviewCount?: number;
}) {
  const freeThresholds = program.freeTiers.map((t) => t.referralsRequired);
  const paidThresholds = program.paidTiers.map((t) => t.paidReferralsRequired);
  const reviewThresholds = program.reviewMilestones.map((m) => m.reviewsRequired);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
          {program.pageTitle}
        </Typography>
        {program.pageSubtitle ? (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
            {program.pageSubtitle}
          </Typography>
        ) : null}
      </Box>

      {/* Free sign-up promotions */}
      <SectionCard
        title={program.freeSignUpTitle}
        subtitle={program.freeSignUpSubtitle}
        unitLabel="referime"
        current={referralCount}
        thresholds={freeThresholds}
        accent="primary"
      >
        {program.freeTiers.map((t) => (
          <TierRow
            key={`${t.level}-${t.title}`}
            heading={`Niveli ${t.level}: ${t.title}`}
            subtitle={`${t.referralsRequired} referime`}
            boostCredits={t.boostCredits}
            achieved={referralCount >= t.referralsRequired}
            accent="primary"
          />
        ))}
        <Box sx={{ pt: 1 }}>
          <BadgeCard
            badge={program.networkBuilderBadge}
            icon={ShareNetworkIcon}
            gradient={GRADIENTS.green}
            iconColor="#fff"
          />
        </Box>
      </SectionCard>

      {/* Paid promotion packages */}
      <SectionCard
        title={program.paidTitle}
        subtitle={program.paidSubtitle}
        unitLabel="referime të paguara"
        current={paidReferralCount}
        thresholds={paidThresholds}
        accent="primary"
      >
        {program.paidTiers.map((t) => (
          <TierRow
            key={`${t.tier}-${t.title}`}
            heading={`Paketa ${t.tier}: ${t.title}`}
            subtitle={
              t.premiumMonths > 0
                ? `${t.premiumMonths} muaj premium${t.extraNote ? ` · ${t.extraNote}` : ''}`
                : `${t.paidReferralsRequired} referime të paguara`
            }
            boostCredits={t.boostCredits}
            achieved={paidReferralCount >= t.paidReferralsRequired}
            accent="primary"
          />
        ))}
        <Box sx={{ pt: 1 }}>
          <BadgeCard
            badge={program.revenueDriverBadge}
            icon={TrendUpIcon}
            gradient={GRADIENTS.green}
            iconColor="#fff"
          />
        </Box>
      </SectionCard>

      {/* Reviews */}
      <SectionCard
        title={program.reviewsTitle}
        subtitle={program.reviewsSubtitle}
        unitLabel="vlerësime"
        current={reviewCount}
        thresholds={reviewThresholds}
        accent="warning"
      >
        {program.reviewMilestones.map((m, i) => (
          <TierRow
            key={`${m.reviewsRequired}-${i}`}
            heading={`${m.reviewsRequired} vlerësime`}
            subtitle={`${m.reviewsRequired} vlerësime`}
            boostCredits={m.boostCredits}
            achieved={reviewCount >= m.reviewsRequired}
            accent="warning"
          />
        ))}
        <Box sx={{ pt: 1 }}>
          <BadgeCard
            badge={program.trustedReviewerBadge}
            icon={StarIcon}
            gradient={GRADIENTS.gold}
            iconColor="#1a1a1a"
          />
        </Box>
      </SectionCard>

      {/* Completion */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {program.completionTitle}
          </Typography>
          {program.completionSubtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {program.completionSubtitle}
            </Typography>
          ) : null}
          <Divider sx={{ my: 2 }} />
          <BadgeCard
            badge={program.platformDominatorBadge}
            icon={CrownIcon}
            gradient={GRADIENTS.gold}
            iconColor="#1a1a1a"
          />
        </CardContent>
      </Card>

      {/* Login streak */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {program.loginStreakTitle}
          </Typography>
          {program.loginStreakSubtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {program.loginStreakSubtitle}
            </Typography>
          ) : null}
          <Divider sx={{ my: 1.5 }} />
          <RewardRow
            title="Share daily"
            subtitle="Ndaj çdo ditë për të fituar 3 Boost Coins"
            boostCredits={3}
            accent="primary"
          />
          <Divider />
          <RewardRow
            title={`${program.loginStreak.daysRequired} ditë radhazi`}
            subtitle="Hyr çdo ditë në platformë"
            boostCredits={program.loginStreak.boostCredits}
            accent="primary"
          />
        </CardContent>
      </Card>
    </Stack>
  );
}

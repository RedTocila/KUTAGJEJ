'use client';

import { Chip, Paper, Stack, Typography } from '@mui/material';

import type { ReferralBadge, ReferralTrustedBadge } from '@/types/referral-program';

export function BadgeRow({ badge, emoji }: { badge: ReferralBadge | ReferralTrustedBadge; emoji: string }) {
  const isTrusted = 'reviewsRequired' in badge && badge.reviewsRequired !== undefined;
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography component="span" aria-hidden>
          {emoji}
        </Typography>
        <Chip size="small" color="warning" label={badge.label} sx={{ fontWeight: 700 }} />
        <Typography variant="body2" color="text.secondary">
          {badge.lifetimePercent}% Lifetime
          {isTrusted ? ` · në ${badge.reviewsRequired} reviews` : ''}
        </Typography>
      </Stack>
      {badge.description ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {badge.description}
        </Typography>
      ) : null}
    </Paper>
  );
}

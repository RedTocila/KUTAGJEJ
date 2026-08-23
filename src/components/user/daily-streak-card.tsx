'use client';

import * as React from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { Fire as FireIcon } from '@phosphor-icons/react/dist/ssr/Fire';

import { portalCardSx } from '@/components/user/portal-cards';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { fetchMyReferralStats } from '@/lib/referrals-client';
import { useUser } from '@/hooks/use-user';

/** Daily login streak — shown under Boost Coins on the portal dashboard. */
export function DailyStreakCard() {
  const { user, checkSession } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [streakDays, setStreakDays] = React.useState(0);
  const [daysRequired, setDaysRequired] = React.useState(7);
  const [streakReward, setStreakReward] = React.useState(25);

  const refreshStats = React.useCallback(async () => {
    if (!user?.id) return;
    const res = await fetchMyReferralStats();
    if (res.referral) {
      setStreakDays(res.referral.loginStreakDays ?? 0);
      setDaysRequired(res.referral.loginStreakDaysRequired ?? res.program?.loginStreak.daysRequired ?? 7);
      setStreakReward(res.referral.loginStreakBoostCredits ?? res.program?.loginStreak.boostCredits ?? 25);
      if (res.referral.loginStreakAwarded) {
        void checkSession();
      }
    } else if (res.program?.loginStreak) {
      setDaysRequired(res.program.loginStreak.daysRequired);
      setStreakReward(res.program.loginStreak.boostCredits);
    }
  }, [user?.id, checkSession]);

  React.useEffect(() => {
    if (!user?.id) {
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
  }, [user?.id, refreshStats]);

  const required = Math.max(1, daysRequired);
  const current = Math.max(0, Math.min(streakDays, required));
  const progress = Math.round((current / required) * 100);
  const streakComplete = current >= required;

  return (
    <Box sx={{ ...portalCardSx, p: { xs: 2, sm: 2.25 }, alignSelf: 'stretch', width: '100%' }}>
      <Stack spacing={1.75}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.18 : 0.12),
              color: 'primary.main',
            }}
          >
            <FireIcon size={22} weight="fill" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 850, fontSize: '0.98rem', lineHeight: 1.25 }}>
              Aktivitet ditor
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, lineHeight: 1.35 }}>
              Hyr çdo ditë për të fituar Boost Coins.
            </Typography>
          </Box>
        </Stack>

        <Box>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={{ fontWeight: 750, fontSize: '0.86rem' }}>
              {required} ditë radhazi
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: 'primary.main' }}>
              {loading ? '…' : `${current}/${required}`}
              {!loading ? (
                <Typography component="span" sx={{ ml: 0.75, fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>
                  +{streakReward} BC
                </Typography>
              ) : null}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={loading ? 0 : progress}
            sx={{
              height: 8,
              borderRadius: 999,
              bgcolor: (t) => primaryMainAlpha(t.palette.mode === 'dark' ? 0.14 : 0.1),
              '& .MuiLinearProgress-bar': { borderRadius: 999 },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.65, lineHeight: 1.35 }}>
            {streakComplete
              ? 'Seria u plotësua — shpërblimi u shtua te Boost Coins.'
              : 'Hyr çdo ditë për të mbajtur serinë.'}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

'use client';

import * as React from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Circle as CircleIcon } from '@phosphor-icons/react/dist/ssr/Circle';
import { Fire as FireIcon } from '@phosphor-icons/react/dist/ssr/Fire';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import { portalCardSx } from '@/components/user/portal-cards';
import { ShareMyListingsDialog } from '@/components/user/share-my-listings-dialog';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { fetchMyReferralStats } from '@/lib/referrals-client';
import { useUser } from '@/hooks/use-user';

function DailyCheckRow({
  done,
  title,
  hint,
  reward,
  action,
}: {
  done: boolean;
  title: string;
  hint: string;
  reward: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.15} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ color: done ? 'primary.main' : 'text.disabled', display: 'inline-flex', pt: 0.15, flexShrink: 0 }}>
        {done ? <CheckCircleIcon size={20} weight="fill" /> : <CircleIcon size={20} weight="regular" />}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            sx={{
              fontWeight: 750,
              fontSize: '0.88rem',
              lineHeight: 1.3,
              textDecoration: done ? 'line-through' : 'none',
              color: done ? 'text.secondary' : 'text.primary',
            }}
          >
            {title}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {action}
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '0.75rem',
                color: done ? 'text.disabled' : 'primary.main',
                flexShrink: 0,
              }}
            >
              {reward}
            </Typography>
          </Stack>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, lineHeight: 1.35 }}>
          {hint}
        </Typography>
      </Box>
    </Stack>
  );
}

/** Daily login streak + share check — shown under Boost Coins on the portal dashboard. */
export function DailyStreakCard() {
  const { user, checkSession } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [streakDays, setStreakDays] = React.useState(0);
  const [daysRequired, setDaysRequired] = React.useState(7);
  const [streakReward, setStreakReward] = React.useState(5);
  const [shareDone, setShareDone] = React.useState(false);
  const [shareReward, setShareReward] = React.useState(3);
  const [sharePickerOpen, setSharePickerOpen] = React.useState(false);

  const refreshStats = React.useCallback(async () => {
    if (!user?.id) return;
    const res = await fetchMyReferralStats();
    if (res.referral) {
      setStreakDays(res.referral.loginStreakDays ?? 0);
      setDaysRequired(res.referral.loginStreakDaysRequired ?? res.program?.loginStreak.daysRequired ?? 7);
      setStreakReward(res.referral.loginStreakBoostCredits ?? res.program?.loginStreak.boostCredits ?? 5);
      setShareDone(Boolean(res.referral.dailyShareClaimedToday));
      setShareReward(res.referral.dailyShareBoostCredits ?? 3);
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
    <>
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
                Hyr çdo ditë dhe ndaj një njoftim për Boost Coins.
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

          <Box
            sx={{
              pt: 0.25,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ mt: 1.15, px: 0.25, py: 0.25 }}>
              <DailyCheckRow
                done={shareDone}
                title="Ndaj çdo ditë"
                hint={
                  shareDone
                    ? 'U krye sot — ndaj përsëri nesër.'
                    : 'Ndaj një njoftim si Instagram Story'
                }
                reward={`+${shareReward} BC`}
                action={
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    startIcon={<ShareNetworkIcon size={14} weight="bold" />}
                    onClick={() => setSharePickerOpen(true)}
                    sx={{
                      flexShrink: 0,
                      textTransform: 'none',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      minWidth: 0,
                      height: 28,
                      px: 1.2,
                      borderRadius: 999,
                      boxShadow: 'none',
                      '&:hover': { boxShadow: 'none' },
                      '& .MuiButton-startIcon': { mr: 0.5 },
                    }}
                  >
                    Ndaj
                  </Button>
                }
              />
            </Box>
          </Box>
        </Stack>
      </Box>

      <ShareMyListingsDialog
        open={sharePickerOpen}
        onClose={() => setSharePickerOpen(false)}
        onShareComplete={() => {
          void refreshStats();
        }}
      />
    </>
  );
}

'use client';

import { alpha } from '@mui/material/styles';
import { Box, Card, CardContent, Chip, Divider, Stack, Typography, useTheme } from '@mui/material';

import type { ReferralProgram } from '@/types/referral-program';

import { BadgeRow } from '@/components/dashboard/referral/referral-badge-row';

export function ProgramDisplay({ program }: { program: ReferralProgram }) {
  const theme = useTheme();

  return (
    <Stack spacing={3}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Statusi yt
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
            YOUR RANK
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Rangu yt llogaritet sipas referimeve, shqyrtimeve dhe objektivave të përfunduara — lidhja me statistikat e
            llogarisë vjen së shpejti.
          </Typography>
          <Chip label="—" sx={{ mt: 2, fontWeight: 700 }} variant="outlined" />
        </CardContent>
      </Card>

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

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {program.freeSignUpTitle}
          </Typography>
          {program.freeSignUpSubtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {program.freeSignUpSubtitle}
            </Typography>
          ) : null}
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.5}>
            {program.freeTiers.map((t) => (
              <Stack
                key={`${t.level}-${t.title}`}
                spacing={1}
                sx={{
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  py: 1.5,
                  px: 2,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Level {t.level}: {t.title}
                  </Typography>
                  <Typography variant="body2">
                    {t.referralsRequired} referral{t.referralsRequired === 1 ? '' : 's'} → {t.boostCredits} Boost Credits
                  </Typography>
                </Stack>
                <Chip label={`${t.boostCredits} BC`} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <BadgeRow badge={program.networkBuilderBadge} emoji="🎖️" />
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {program.paidTitle}
          </Typography>
          {program.paidSubtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {program.paidSubtitle}
            </Typography>
          ) : null}
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.5}>
            {program.paidTiers.map((t) => (
              <Stack
                key={`${t.tier}-${t.title}`}
                spacing={1}
                sx={{
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  py: 1.5,
                  px: 2,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.success.main, 0.06),
                }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tier {t.tier}: {t.title}
                  </Typography>
                  <Typography variant="body2">
                    {t.paidReferralsRequired} paid referral{t.paidReferralsRequired === 1 ? '' : 's'} →{' '}
                    {t.boostCredits} Boost Credits
                    {t.premiumMonths > 0
                      ? ` + (${t.premiumMonths} month${t.premiumMonths === 1 ? '' : 's'} premium package)`
                      : ''}
                  </Typography>
                  {t.extraNote ? (
                    <Typography variant="caption" color="text.secondary">
                      {t.extraNote}
                    </Typography>
                  ) : null}
                </Stack>
                <Chip label={`${t.boostCredits} BC`} color="success" variant="outlined" sx={{ fontWeight: 700 }} />
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <BadgeRow badge={program.revenueDriverBadge} emoji="🎖️" />
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {program.reviewsTitle}
          </Typography>
          {program.reviewsSubtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {program.reviewsSubtitle}
            </Typography>
          ) : null}
          <Divider sx={{ my: 2 }} />
          <Stack spacing={1.5}>
            {program.reviewMilestones.map((m, i) => (
              <Stack
                key={`${m.reviewsRequired}-${i}`}
                spacing={1}
                sx={{
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  py: 1.5,
                  px: 2,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.warning.main, 0.06),
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {m.reviewsRequired} Reviews
                </Typography>
                <Typography variant="body2">{m.boostCredits} Boost Credits</Typography>
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <BadgeRow badge={program.trustedReviewerBadge} emoji="🎖️" />
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {program.completionTitle}
          </Typography>
          {program.completionSubtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {program.completionSubtitle}
            </Typography>
          ) : null}
          <Divider sx={{ my: 2 }} />
          <BadgeRow badge={program.platformDominatorBadge} emoji="🎖️" />
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {program.loginStreakTitle}
          </Typography>
          {program.loginStreakSubtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {program.loginStreakSubtitle}
            </Typography>
          ) : null}
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1">
            Log In {program.loginStreak.daysRequired} days → {program.loginStreak.boostCredits} Boost Credits
          </Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

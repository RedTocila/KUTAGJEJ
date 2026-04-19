'use client';

import * as React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { FloppyDisk as FloppyDiskIcon } from '@phosphor-icons/react/dist/ssr/FloppyDisk';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { useUser } from '@/hooks/use-user';
import { fetchReferralProgramPublic, putReferralProgram } from '@/lib/referral-program-client';
import type {
  ReferralBadge,
  ReferralFreeTier,
  ReferralPaidTier,
  ReferralProgram,
  ReferralReviewMilestone,
  ReferralTrustedBadge,
} from '@/types/referral-program';

function BadgeRow({ badge, emoji }: { badge: ReferralBadge | ReferralTrustedBadge; emoji: string }) {
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

function ProgramDisplay({ program }: { program: ReferralProgram }) {
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

function emptyFreeTier(): ReferralFreeTier {
  return { level: 1, title: '', referralsRequired: 0, boostCredits: 0 };
}

function emptyPaidTier(): ReferralPaidTier {
  return { tier: 1, title: '', paidReferralsRequired: 0, boostCredits: 0, premiumMonths: 0, extraNote: '' };
}

function emptyReviewMilestone(): ReferralReviewMilestone {
  return { reviewsRequired: 0, boostCredits: 0 };
}

function emptyTrustedBadge(): ReferralTrustedBadge {
  return { label: '', lifetimePercent: 0, reviewsRequired: 0, description: '' };
}

function AdminEditor({
  draft,
  onChange,
  saving,
  onSave,
}: {
  draft: ReferralProgram;
  onChange: (next: ReferralProgram) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const set = (patch: Partial<ReferralProgram>) => onChange({ ...draft, ...patch });

  return (
    <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'warning.main', borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Redakto programin e referimit
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Numrat dhe etiketat ruhen në databazë dhe reflektohen menjëherë në faqe për të gjithë përdoruesit.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="warning"
            startIcon={<FloppyDiskIcon size={20} weight="bold" />}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
          </Button>
        </Stack>

        <Accordion defaultExpanded sx={{ mt: 2 }}>
          <AccordionSummary expandIcon={<CaretDownIcon weight="bold" />}>
            <Typography sx={{ fontWeight: 700 }}>Faqja kryesore</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Titulli i faqes"
                  fullWidth
                  value={draft.pageTitle}
                  onChange={(e) => set({ pageTitle: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Nëntitull"
                  fullWidth
                  multiline
                  minRows={2}
                  value={draft.pageSubtitle}
                  onChange={(e) => set({ pageSubtitle: e.target.value })}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<CaretDownIcon weight="bold" />}>
            <Typography sx={{ fontWeight: 700 }}>Regjistrime falas</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Titulli i seksionit"
                    fullWidth
                    value={draft.freeSignUpTitle}
                    onChange={(e) => set({ freeSignUpTitle: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Përshkrimi"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.freeSignUpSubtitle}
                    onChange={(e) => set({ freeSignUpSubtitle: e.target.value })}
                  />
                </Grid>
              </Grid>
              <Stack spacing={1}>
                {draft.freeTiers.map((row, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                    <Stack
                      spacing={1}
                      sx={{
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { xs: 'stretch', md: 'flex-end' },
                      }}
                    >
                      <TextField
                        label="Level"
                        type="number"
                        sx={{ width: 100 }}
                        value={row.level}
                        onChange={(e) => {
                          const next = [...draft.freeTiers];
                          next[idx] = { ...row, level: Number(e.target.value) };
                          set({ freeTiers: next });
                        }}
                      />
                      <TextField
                        label="Titulli"
                        fullWidth
                        value={row.title}
                        onChange={(e) => {
                          const next = [...draft.freeTiers];
                          next[idx] = { ...row, title: e.target.value };
                          set({ freeTiers: next });
                        }}
                      />
                      <TextField
                        label="Referime"
                        type="number"
                        sx={{ minWidth: 120 }}
                        value={row.referralsRequired}
                        onChange={(e) => {
                          const next = [...draft.freeTiers];
                          next[idx] = { ...row, referralsRequired: Number(e.target.value) };
                          set({ freeTiers: next });
                        }}
                      />
                      <TextField
                        label="Boost Credits"
                        type="number"
                        sx={{ minWidth: 140 }}
                        value={row.boostCredits}
                        onChange={(e) => {
                          const next = [...draft.freeTiers];
                          next[idx] = { ...row, boostCredits: Number(e.target.value) };
                          set({ freeTiers: next });
                        }}
                      />
                      <IconButton
                        aria-label="Hiq nivelin"
                        color="error"
                        onClick={() => {
                          const next = draft.freeTiers.filter((_, i) => i !== idx);
                          set({ freeTiers: next.length ? next : [emptyFreeTier()] });
                        }}
                      >
                        <TrashIcon weight="bold" />
                      </IconButton>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              <Button
                startIcon={<PlusIcon weight="bold" />}
                onClick={() => set({ freeTiers: [...draft.freeTiers, emptyFreeTier()] })}
              >
                Shto nivel
              </Button>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Network Builder Badge
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Etiketa"
                    fullWidth
                    value={draft.networkBuilderBadge.label}
                    onChange={(e) =>
                      set({ networkBuilderBadge: { ...draft.networkBuilderBadge, label: e.target.value } })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="% Lifetime"
                    type="number"
                    fullWidth
                    value={draft.networkBuilderBadge.lifetimePercent}
                    onChange={(e) =>
                      set({
                        networkBuilderBadge: {
                          ...draft.networkBuilderBadge,
                          lifetimePercent: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Përshkrimi"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.networkBuilderBadge.description}
                    onChange={(e) =>
                      set({ networkBuilderBadge: { ...draft.networkBuilderBadge, description: e.target.value } })
                    }
                  />
                </Grid>
              </Grid>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<CaretDownIcon weight="bold" />}>
            <Typography sx={{ fontWeight: 700 }}>Paketa të paguara</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Titulli i seksionit"
                    fullWidth
                    value={draft.paidTitle}
                    onChange={(e) => set({ paidTitle: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Përshkrimi"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.paidSubtitle}
                    onChange={(e) => set({ paidSubtitle: e.target.value })}
                  />
                </Grid>
              </Grid>
              {draft.paidTiers.map((row, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    spacing={1}
                    sx={{
                      flexDirection: { xs: 'column', md: 'row' },
                      alignItems: { xs: 'stretch', md: 'flex-end' },
                    }}
                  >
                    <TextField
                      label="Tier"
                      type="number"
                      sx={{ width: 100 }}
                      value={row.tier}
                      onChange={(e) => {
                        const next = [...draft.paidTiers];
                        next[idx] = { ...row, tier: Number(e.target.value) };
                        set({ paidTiers: next });
                      }}
                    />
                    <TextField
                      label="Titulli"
                      fullWidth
                      value={row.title}
                      onChange={(e) => {
                        const next = [...draft.paidTiers];
                        next[idx] = { ...row, title: e.target.value };
                        set({ paidTiers: next });
                      }}
                    />
                    <TextField
                      label="Paid referrals"
                      type="number"
                      sx={{ minWidth: 140 }}
                      value={row.paidReferralsRequired}
                      onChange={(e) => {
                        const next = [...draft.paidTiers];
                        next[idx] = { ...row, paidReferralsRequired: Number(e.target.value) };
                        set({ paidTiers: next });
                      }}
                    />
                    <TextField
                      label="Boost Credits"
                      type="number"
                      sx={{ minWidth: 140 }}
                      value={row.boostCredits}
                      onChange={(e) => {
                        const next = [...draft.paidTiers];
                        next[idx] = { ...row, boostCredits: Number(e.target.value) };
                        set({ paidTiers: next });
                      }}
                    />
                    <TextField
                      label="Muaj premium"
                      type="number"
                      sx={{ minWidth: 130 }}
                      value={row.premiumMonths}
                      onChange={(e) => {
                        const next = [...draft.paidTiers];
                        next[idx] = { ...row, premiumMonths: Number(e.target.value) };
                        set({ paidTiers: next });
                      }}
                    />
                    <TextField
                      label="Shënim shtesë"
                      fullWidth
                      value={row.extraNote}
                      onChange={(e) => {
                        const next = [...draft.paidTiers];
                        next[idx] = { ...row, extraNote: e.target.value };
                        set({ paidTiers: next });
                      }}
                    />
                    <IconButton
                      aria-label="Hiq tier-in"
                      color="error"
                      onClick={() => {
                        const next = draft.paidTiers.filter((_, i) => i !== idx);
                        set({ paidTiers: next.length ? next : [emptyPaidTier()] });
                      }}
                    >
                      <TrashIcon weight="bold" />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
              <Button
                startIcon={<PlusIcon weight="bold" />}
                onClick={() => set({ paidTiers: [...draft.paidTiers, emptyPaidTier()] })}
              >
                Shto tier
              </Button>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Revenue Driver Badge
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Etiketa"
                    fullWidth
                    value={draft.revenueDriverBadge.label}
                    onChange={(e) =>
                      set({ revenueDriverBadge: { ...draft.revenueDriverBadge, label: e.target.value } })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="% Lifetime"
                    type="number"
                    fullWidth
                    value={draft.revenueDriverBadge.lifetimePercent}
                    onChange={(e) =>
                      set({
                        revenueDriverBadge: {
                          ...draft.revenueDriverBadge,
                          lifetimePercent: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Përshkrimi"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.revenueDriverBadge.description}
                    onChange={(e) =>
                      set({ revenueDriverBadge: { ...draft.revenueDriverBadge, description: e.target.value } })
                    }
                  />
                </Grid>
              </Grid>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<CaretDownIcon weight="bold" />}>
            <Typography sx={{ fontWeight: 700 }}>Reviews dhe badge Trusted</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Titulli i seksionit"
                    fullWidth
                    value={draft.reviewsTitle}
                    onChange={(e) => set({ reviewsTitle: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Përshkrimi"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.reviewsSubtitle}
                    onChange={(e) => set({ reviewsSubtitle: e.target.value })}
                  />
                </Grid>
              </Grid>
              {draft.reviewMilestones.map((row, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    spacing={1}
                    sx={{
                      flexDirection: { xs: 'column', md: 'row' },
                      alignItems: { xs: 'stretch', md: 'flex-end' },
                    }}
                  >
                    <TextField
                      label="Reviews (pragu)"
                      type="number"
                      fullWidth
                      value={row.reviewsRequired}
                      onChange={(e) => {
                        const next = [...draft.reviewMilestones];
                        next[idx] = { ...row, reviewsRequired: Number(e.target.value) };
                        set({ reviewMilestones: next });
                      }}
                    />
                    <TextField
                      label="Boost Credits"
                      type="number"
                      fullWidth
                      value={row.boostCredits}
                      onChange={(e) => {
                        const next = [...draft.reviewMilestones];
                        next[idx] = { ...row, boostCredits: Number(e.target.value) };
                        set({ reviewMilestones: next });
                      }}
                    />
                    <IconButton
                      aria-label="Hiq milestone"
                      color="error"
                      onClick={() => {
                        const next = draft.reviewMilestones.filter((_, i) => i !== idx);
                        set({ reviewMilestones: next.length ? next : [emptyReviewMilestone()] });
                      }}
                    >
                      <TrashIcon weight="bold" />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
              <Button
                startIcon={<PlusIcon weight="bold" />}
                onClick={() => set({ reviewMilestones: [...draft.reviewMilestones, emptyReviewMilestone()] })}
              >
                Shto milestone
              </Button>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Trusted (reviews)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label="Etiketa"
                    fullWidth
                    value={draft.trustedReviewerBadge.label}
                    onChange={(e) =>
                      set({ trustedReviewerBadge: { ...draft.trustedReviewerBadge, label: e.target.value } })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label="% Lifetime"
                    type="number"
                    fullWidth
                    value={draft.trustedReviewerBadge.lifetimePercent}
                    onChange={(e) =>
                      set({
                        trustedReviewerBadge: {
                          ...draft.trustedReviewerBadge,
                          lifetimePercent: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    label="Pragu i reviews"
                    type="number"
                    fullWidth
                    value={draft.trustedReviewerBadge.reviewsRequired}
                    onChange={(e) =>
                      set({
                        trustedReviewerBadge: {
                          ...draft.trustedReviewerBadge,
                          reviewsRequired: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Përshkrimi"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.trustedReviewerBadge.description}
                    onChange={(e) =>
                      set({ trustedReviewerBadge: { ...draft.trustedReviewerBadge, description: e.target.value } })
                    }
                  />
                </Grid>
              </Grid>
            </Stack>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<CaretDownIcon weight="bold" />}>
            <Typography sx={{ fontWeight: 700 }}>Përfundimi dhe streak</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Titulli (përfundim)"
                    fullWidth
                    value={draft.completionTitle}
                    onChange={(e) => set({ completionTitle: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Përshkrimi"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.completionSubtitle}
                    onChange={(e) => set({ completionSubtitle: e.target.value })}
                  />
                </Grid>
              </Grid>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Platform Dominator
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Etiketa"
                    fullWidth
                    value={draft.platformDominatorBadge.label}
                    onChange={(e) =>
                      set({ platformDominatorBadge: { ...draft.platformDominatorBadge, label: e.target.value } })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="% Lifetime"
                    type="number"
                    fullWidth
                    value={draft.platformDominatorBadge.lifetimePercent}
                    onChange={(e) =>
                      set({
                        platformDominatorBadge: {
                          ...draft.platformDominatorBadge,
                          lifetimePercent: Number(e.target.value),
                        },
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Përshkrimi"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.platformDominatorBadge.description}
                    onChange={(e) =>
                      set({ platformDominatorBadge: { ...draft.platformDominatorBadge, description: e.target.value } })
                    }
                  />
                </Grid>
              </Grid>
              <Divider />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Titulli (login streak)"
                    fullWidth
                    value={draft.loginStreakTitle}
                    onChange={(e) => set({ loginStreakTitle: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Përshkrimi"
                    fullWidth
                    multiline
                    minRows={2}
                    value={draft.loginStreakSubtitle}
                    onChange={(e) => set({ loginStreakSubtitle: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Ditë të njëpasnjëshme login"
                    type="number"
                    fullWidth
                    value={draft.loginStreak.daysRequired}
                    onChange={(e) =>
                      set({
                        loginStreak: { ...draft.loginStreak, daysRequired: Number(e.target.value) },
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Boost Credits (streak)"
                    type="number"
                    fullWidth
                    value={draft.loginStreak.boostCredits}
                    onChange={(e) =>
                      set({
                        loginStreak: { ...draft.loginStreak, boostCredits: Number(e.target.value) },
                      })
                    }
                  />
                </Grid>
              </Grid>
            </Stack>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export default function ReferralPage() {
  const { user } = useUser();
  const [program, setProgram] = React.useState<ReferralProgram | null>(null);
  const [draft, setDraft] = React.useState<ReferralProgram | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const isPlatformAdmin =
    user?.accountType === 'admin' || Boolean(user?.role === 'admin' && user?.accountType === undefined);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { program: p, error: err } = await fetchReferralProgramPublic();
      if (cancelled) return;
      if (err || !p) {
        setError(err ?? 'Programi nuk u ngarkua.');
        setProgram(null);
      } else {
        setProgram(p);
        setDraft(p);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = React.useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    const { program: next, error: err } = await putReferralProgram(draft);
    setSaving(false);
    if (err || !next) {
      setSaveError(err ?? 'Ruajtja dështoi.');
      return;
    }
    setProgram(next);
    setDraft(next);
    setEditing(false);
  }, [draft]);

  if (!user) return null;

  return (
    <Stack spacing={3}>
      <Stack
        spacing={2}
        sx={{
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Programi i referimit
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Shiko nivelet, shpërblimet dhe badge-t; administratorët mund t’i përditësojnë vlerat kur të duhen.
          </Typography>
        </Box>
        {isPlatformAdmin ? (
          <Button
            variant={editing ? 'outlined' : 'contained'}
            color="primary"
            startIcon={editing ? undefined : <PencilSimpleIcon size={20} weight="bold" />}
            onClick={() => {
              if (editing) {
                setDraft(program);
                setEditing(false);
                setSaveError(null);
              } else {
                setDraft(program);
                setEditing(true);
              }
            }}
          >
            {editing ? 'Anulo redaktimin' : 'Redakto si admin'}
          </Button>
        ) : null}
      </Stack>

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : loading ? (
        <Skeleton variant="rounded" height={420} />
      ) : program ? (
        <>
          {editing && draft && isPlatformAdmin ? (
            <>
              {saveError ? <Alert severity="error">{saveError}</Alert> : null}
              <AdminEditor draft={draft} onChange={setDraft} saving={saving} onSave={onSave} />
            </>
          ) : null}
          <ProgramDisplay program={editing && draft ? draft : program} />
        </>
      ) : (
        <Alert severity="warning">Nuk ka të dhëna për programin e referimit.</Alert>
      )}
    </Stack>
  );
}
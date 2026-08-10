'use client';

import * as React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { FloppyDisk as FloppyDiskIcon } from '@phosphor-icons/react/dist/ssr/FloppyDisk';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import type { ReferralProgram } from '@/types/referral-program';
import {
  emptyFreeTier,
  emptyPaidTier,
  emptyReviewMilestone,
  emptyTrustedBadge,
} from '@/components/dashboard/referral/referral-empty-defaults';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

export function AdminEditor({
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
    <Box sx={{ ...productPanelSx, border: '1px dashed', borderColor: 'warning.main', p: 3 }}>
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
            sx={productButtonSx}
          >
            {saving ? 'Duke ruajtur…' : 'Ruaj ndryshimet'}
          </Button>
        </Stack>

        <Box sx={{ mt: 2, ...productFieldSx }}>
        <Accordion defaultExpanded>
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
                  <Box key={idx} sx={{ ...productPanelSx, p: 2 }}>
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
                  </Box>
                ))}
              </Stack>
              <Button
                startIcon={<PlusIcon weight="bold" />}
                onClick={() => set({ freeTiers: [...draft.freeTiers, emptyFreeTier()] })}
                sx={productButtonSx}
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
                <Box key={idx} sx={{ ...productPanelSx, p: 2 }}>
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
                </Box>
              ))}
              <Button
                startIcon={<PlusIcon weight="bold" />}
                onClick={() => set({ paidTiers: [...draft.paidTiers, emptyPaidTier()] })}
                sx={productButtonSx}
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
                <Box key={idx} sx={{ ...productPanelSx, p: 2 }}>
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
                </Box>
              ))}
              <Button
                startIcon={<PlusIcon weight="bold" />}
                onClick={() => set({ reviewMilestones: [...draft.reviewMilestones, emptyReviewMilestone()] })}
                sx={productButtonSx}
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
        </Box>
    </Box>
  );
}

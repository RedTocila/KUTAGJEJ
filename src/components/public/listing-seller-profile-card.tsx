'use client';

import * as React from 'react';
import Link from 'next/link';
import { Avatar, Box, Button, Paper, Stack, Typography, type SxProps, type Theme } from '@mui/material';

import { pathsPublicMemberProfile } from '@/paths';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { formatRatingDisplay } from '@/lib/format-rating';
import type { PublicRealEstateListingSeller } from '@/lib/public-listings-client';
import { avatarImageUrl } from '@/lib/storage-image';
import { ListingTrustBadge } from '@/components/public/listing-trust-badge';
import { ListingVerifiedBadge, ProfessionalRatingSummary, ProfileVerifiedNotice } from '@/components/public/professional-listing-detail-ui';

function sellerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Shared “Rreth shitësit / ofertuesit” card used on listing detail pages. */
export function ListingSellerProfileCard({
  seller,
  headingId,
  cardSx,
}: {
  seller: PublicRealEstateListingSeller | null | undefined;
  headingId?: string;
  /** Optional overrides for the card Paper (e.g. borderless hero column). */
  cardSx?: SxProps<Theme>;
}) {
  const name = seller?.displayName?.trim() || 'Përdorues KuTaGjej';
  const memberYear = seller?.memberSince ? new Date(seller.memberSince).getFullYear() : undefined;
  const profileHref = seller?.id ? pathsPublicMemberProfile(seller.id) : null;
  const reviewCount = seller?.reviewCount ?? 0;
  const ratingLabel = formatRatingDisplay(seller?.ratingAverage);

  return (
    <Stack spacing={1.5} component="section" aria-labelledby={headingId}>
      <Typography
        id={headingId}
        variant="overline"
        color="text.secondary"
        sx={{ fontWeight: 800, letterSpacing: '0.1em', display: 'block' }}
      >
        Rreth shitësit / ofertuesit
      </Typography>

      <Paper
        variant="outlined"
        sx={[
          {
            borderRadius: 2.5,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            p: { xs: 2, sm: 2.5 },
          },
          ...(Array.isArray(cardSx) ? cardSx : cardSx ? [cardSx] : []),
        ]}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar
            src={avatarImageUrl(seller?.avatarUrl, 144) ?? undefined}
            sx={{
              width: { xs: 64, sm: 72 },
              height: { xs: 64, sm: 72 },
              bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.12),
              color: 'primary.main',
              fontWeight: 800,
              fontSize: '1.35rem',
            }}
            aria-hidden
          >
            {sellerInitials(name)}
          </Avatar>
          <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Typography sx={{ fontWeight: 850, fontSize: '1.125rem', color: 'text.primary' }} noWrap>
                {name}
                {seller?.verified ? (
                  <Box
                    component="span"
                    sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.45, lineHeight: 0 }}
                  >
                    <ListingVerifiedBadge size={18} aria-label="Profil i verifikuar" />
                  </Box>
                ) : null}
                {seller?.trustBadge ? (
                  <Box
                    component="span"
                    sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.45, lineHeight: 0 }}
                  >
                    <ListingTrustBadge size={18} />
                  </Box>
                ) : null}
              </Typography>
            </Stack>
            {memberYear != null ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Anëtar që prej {memberYear}
              </Typography>
            ) : null}
            <ProfileVerifiedNotice verified={Boolean(seller?.verified)} />
            <ProfessionalRatingSummary rating={ratingLabel} reviewCount={reviewCount} starSize={14} />
          </Stack>
        </Stack>

        <Button
          component={profileHref ? Link : 'button'}
          href={profileHref ?? undefined}
          disabled={!profileHref}
          variant="contained"
          disableElevation
          fullWidth
          sx={{
            mt: { xs: 2, sm: 2.25 },
            borderRadius: 999,
            fontWeight: 800,
            textTransform: 'none',
            py: 1.25,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
            color: 'text.primary',
            border: '1.5px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)'),
              color: 'text.primary',
              borderColor: 'divider',
              boxShadow: 'none',
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'text.disabled',
              borderColor: 'divider',
            },
          }}
        >
          Shiko profilin
        </Button>
      </Paper>
    </Stack>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Stack, Typography } from '@mui/material';

import { MemberLeaveReviewButton } from '@/components/public/member-leave-review-button';
import { ProfessionalRatingSummary } from '@/components/public/professional-listing-detail-ui';
import { formatRatingDisplay } from '@/lib/format-rating';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { PublicRealEstateListingSeller } from '@/lib/public-listings-client';
import { pathsPublicMemberProfile } from '@/paths';

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
  showSafetyNote = false,
}: {
  seller: PublicRealEstateListingSeller | null | undefined;
  headingId?: string;
  /** Optional platform-safety caption (real-estate historically showed this). */
  showSafetyNote?: boolean;
}) {
  const router = useRouter();
  const name = seller?.displayName?.trim() || 'Përdorues KuTaGjej';
  const memberYear = seller?.memberSince ? new Date(seller.memberSince).getFullYear() : undefined;
  const profileHref = seller?.id ? pathsPublicMemberProfile(seller.id) : null;
  const memberId = seller?.id?.trim() || '';
  const reviewCount = seller?.reviewCount ?? 0;
  const ratingAverage = seller?.ratingAverage;
  const ratingLabel = formatRatingDisplay(ratingAverage);

  return (
    <>
      <Typography
        id={headingId}
        variant="overline"
        color="text.secondary"
        sx={{ fontWeight: 800, letterSpacing: '0.1em', mb: 1.5, display: 'block' }}
      >
        Rreth shitësit / ofertuesit
      </Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Avatar
          src={seller?.avatarUrl?.trim() || undefined}
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
          <Typography sx={{ fontWeight: 850, fontSize: '1.125rem', color: 'text.primary' }} noWrap>
            {name}
          </Typography>
          {memberYear != null ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Anëtar që prej {memberYear}
            </Typography>
          ) : null}
          <ProfessionalRatingSummary rating={ratingLabel} reviewCount={reviewCount} starSize={14} />
          {showSafetyNote ? (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, opacity: 0.85 }}>
              Komuniko vetëm nëpërmjet platformës ose në numrin e listuar.
            </Typography>
          ) : null}
        </Stack>
      </Stack>

      <Stack spacing={1} sx={{ mt: { xs: 2, sm: 2.25 } }}>
        <Button
          component={profileHref ? Link : 'button'}
          href={profileHref ?? undefined}
          disabled={!profileHref}
          variant="contained"
          disableElevation
          fullWidth
          sx={{
            borderRadius: 999,
            fontWeight: 800,
            textTransform: 'none',
            py: 1.25,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'grey.900'),
            color: 'common.white',
            border: '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'grey.900',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'grey.800'),
              color: 'common.white',
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
        {memberId ? (
          <MemberLeaveReviewButton
            memberId={memberId}
            memberName={name}
            pill
            compact
            onSubmitted={() => router.refresh()}
          />
        ) : null}
      </Stack>
    </>
  );
}

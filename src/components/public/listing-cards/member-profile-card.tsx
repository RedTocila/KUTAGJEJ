'use client';

import * as React from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';

import {
  SearchHitCard,
  searchHitListTextSx,
  type SearchHitVariant,
} from '@/components/public/listing-cards/search-hit-card';
import { ListingTrustBadge } from '@/components/public/listing-trust-badge';
import {
  ListingVerifiedBadge,
  ProfessionalRatingSummary,
  ProfileVerifiedNotice,
} from '@/components/public/professional-listing-detail-ui';
import { useCopy } from '@/hooks/use-copy';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { formatRatingDisplay } from '@/lib/format-rating';
import { memberInitials, type PublicMemberSearchHit } from '@/lib/public-member-client';
import { avatarImageUrl } from '@/lib/storage-image';
import { pathsPublicMemberProfile } from '@/paths';

export function MemberProfileCard({
  member,
  variant = 'card',
  divider = false,
}: {
  member: PublicMemberSearchHit;
  variant?: SearchHitVariant;
  divider?: boolean;
}) {
  const t = useCopy();
  const name = member.displayName?.trim() || t.search.unnamedMember;
  const href = pathsPublicMemberProfile(member.id);
  const memberYear = member.memberSince ? new Date(member.memberSince).getFullYear() : undefined;
  const reviewCount = member.reviewCount ?? 0;
  const ratingLabel = formatRatingDisplay(member.ratingAverage);
  const isList = variant === 'list';

  return (
    <SearchHitCard href={href} variant={variant}>
      <Stack direction="row" spacing={isList ? 1.5 : 2} sx={{ alignItems: 'center' }}>
        <Avatar
          variant="circular"
          src={avatarImageUrl(member.avatarUrl, 144) ?? undefined}
          sx={{
            width: { xs: 64, sm: 72 },
            height: { xs: 64, sm: 72 },
            my: isList ? 1.15 : 0,
            bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.16 : 0.12),
            color: 'primary.main',
            fontWeight: 800,
            fontSize: '1.35rem',
          }}
          aria-hidden
        >
          {memberInitials(name)}
        </Avatar>
        <Stack spacing={0.5} sx={isList ? searchHitListTextSx(divider) : { flex: '1 1 auto', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 850, fontSize: '1.125rem', color: 'text.primary' }} noWrap>
            {name}
            {member.verified ? (
              <Box
                component="span"
                sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.45, lineHeight: 0 }}
              >
                <ListingVerifiedBadge size={18} aria-label={t.search.verifiedNotice} />
              </Box>
            ) : null}
            {member.trustBadge ? (
              <Box
                component="span"
                sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.45, lineHeight: 0 }}
              >
                <ListingTrustBadge size={18} />
              </Box>
            ) : null}
          </Typography>
          {memberYear != null && Number.isFinite(memberYear) ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {t.search.memberSince(memberYear)}
            </Typography>
          ) : null}
          <ProfileVerifiedNotice verified={Boolean(member.verified)} label={t.search.verifiedNotice} />
          <ProfessionalRatingSummary rating={ratingLabel} reviewCount={reviewCount} starSize={14} />
        </Stack>
      </Stack>
    </SearchHitCard>
  );
}

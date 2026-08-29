'use client';

import * as React from 'react';
import { Avatar, Box, IconButton, Stack, Typography } from '@mui/material';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';

import {
  SearchHitCard,
  searchHitListTextSx,
  type SearchHitVariant,
} from '@/components/public/listing-cards/search-hit-card';
import { ListingSharePage } from '@/components/public/listing-share/listing-share-page';
import {
  ListingVerifiedBadge,
  ProfessionalRatingSummary,
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
  const [shareOpen, setShareOpen] = React.useState(false);
  const name = member.displayName?.trim() || t.search.unnamedMember;
  const href = pathsPublicMemberProfile(member.id);
  const memberYear = member.memberSince ? new Date(member.memberSince).getFullYear() : undefined;
  const reviewCount = member.reviewCount ?? 0;
  const ratingLabel = formatRatingDisplay(member.ratingAverage);
  const isList = variant === 'list';
  const categoryLabel =
    member.businessCategory?.trim() ||
    (member.kind === 'business' ? t.search.kindBusiness : t.search.kindIndividual);

  const openShare = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShareOpen(true);
  };

  return (
    <>
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
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 850,
                  fontSize: '1.125rem',
                  lineHeight: 1.3,
                  color: 'text.primary',
                  flex: 1,
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                }}
              >
                {name}
                {member.verified ? (
                  <Box
                    component="span"
                    sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.45, lineHeight: 0 }}
                  >
                    <ListingVerifiedBadge size={18} aria-label={t.search.verifiedNotice} />
                  </Box>
                ) : null}
              </Typography>
              <IconButton
                aria-label={t.search.shareProfile}
                onClick={openShare}
                size="small"
                sx={{
                  mt: -0.25,
                  mr: -0.5,
                  flexShrink: 0,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                }}
              >
                <PaperPlaneTiltIcon size={18} weight="bold" />
              </IconButton>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', fontSize: '0.7rem' }}
            >
              {categoryLabel}
            </Typography>
            {memberYear != null && Number.isFinite(memberYear) ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {t.search.memberSince(memberYear)}
              </Typography>
            ) : null}
            <ProfessionalRatingSummary rating={ratingLabel} reviewCount={reviewCount} starSize={18} />
          </Stack>
        </Stack>
      </SearchHitCard>
      {shareOpen ? (
        <ListingSharePage
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          payload={{
            listingId: member.id,
            title: name,
            category: categoryLabel,
            imageUrl: member.avatarUrl,
            location: member.cityName ?? undefined,
            ratingAverage: member.ratingAverage,
            reviewCount,
            url: href,
          }}
        />
      ) : null}
    </>
  );
}

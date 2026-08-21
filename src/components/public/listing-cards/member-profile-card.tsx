'use client';

import * as React from 'react';
import Link from 'next/link';
import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';

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
import { MOTION } from '@/styles/motion';

export function MemberProfileCard({ member }: { member: PublicMemberSearchHit }) {
  const t = useCopy();
  const name = member.displayName?.trim() || t.search.unnamedMember;
  const href = pathsPublicMemberProfile(member.id);
  const memberYear = member.memberSince ? new Date(member.memberSince).getFullYear() : undefined;
  const reviewCount = member.reviewCount ?? 0;
  const ratingLabel = formatRatingDisplay(member.ratingAverage);

  return (
    <Paper
      component={Link}
      href={href}
      variant="outlined"
      onClick={() => {
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
      }}
      sx={{
        height: '100%',
        borderRadius: 2.5,
        border: '2px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 2, sm: 2.5 },
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        transition: `border-color ${MOTION.base} ${MOTION.ease}, transform ${MOTION.release} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            borderColor: 'primary.main',
            transform: 'translateY(-3px)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 12px 28px rgba(0, 0, 0, 0.35)'
                : '0 12px 28px rgba(15, 23, 10, 0.1)',
          },
        },
        '&:active': {
          transform: 'scale(0.985)',
          boxShadow: 'none',
          transitionDuration: MOTION.press,
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:hover': { transform: 'none', boxShadow: 'none' },
          '&:active': { transform: 'none' },
        },
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Avatar
          src={avatarImageUrl(member.avatarUrl, 144) ?? undefined}
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
          {memberInitials(name)}
        </Avatar>
        <Stack spacing={0.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
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
    </Paper>
  );
}

'use client';

import * as React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

import {
  ContentBlockSkeleton,
  ListingCardsSkeleton,
  PackageRowsSkeleton,
  StatsPageSkeleton,
} from '@/components/core/content-skeletons';
import { CategoryBrowseSkeleton } from '@/components/public/category-browse-skeleton';
import { HomeCarouselsSkeleton } from '@/components/public/homepage-skeletons';
import { ListingDetailSkeleton } from '@/components/public/listing-detail-skeleton';
import { MemberProfileSkeleton } from '@/components/public/member-profile-skeleton';
import { NotificationInboxSkeleton } from '@/components/user/inbox-skeletons';
import { PostListingFormSkeleton } from '@/components/user/post-listing-header';
import { isPublicBrowsePath, isPublicListingDetailPath } from '@/lib/public-browse-path';
import { isPostListingPath } from '@/lib/post-listing-path';
import { paths } from '@/paths';

export type RouteSkeletonKind =
  | 'home'
  | 'browse'
  | 'browse-square'
  | 'detail'
  | 'member'
  | 'dashboard'
  | 'inbox'
  | 'stats'
  | 'packages'
  | 'listings'
  | 'form';

const SQUARE_BROWSE = new Set<string>([paths.public.jobs, paths.public.businesses, paths.public.professionals]);

export function skeletonKindForPath(path: string): RouteSkeletonKind {
  if (path === paths.home) return 'home';
  if (isPublicListingDetailPath(path)) return 'detail';
  if (path.startsWith(`${paths.public.profiles}/`)) return 'member';
  if (SQUARE_BROWSE.has(path)) return 'browse-square';
  if (isPublicBrowsePath(path)) return 'browse';
  if (path === paths.user.messages || path.startsWith(`${paths.user.messages}/`)) return 'inbox';
  if (path === paths.user.notifications || path.startsWith(`${paths.user.notifications}/`)) return 'inbox';
  if (path === paths.user.statistics) return 'stats';
  if (path === paths.user.packages || path.startsWith(`${paths.user.packages}/`)) return 'packages';
  if (path === paths.user.myRealEstateListings || path.startsWith(`${paths.user.myRealEstateListings}/`)) {
    return 'listings';
  }
  if (isPostListingPath(path)) return 'form';
  return 'dashboard';
}

function DashboardSkeleton(): React.JSX.Element {
  return (
    <Stack spacing={2} sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Skeleton variant="rounded" animation="wave" width={40} height={40} sx={{ borderRadius: 2.25 }} />
        <Skeleton variant="text" animation="wave" width="46%" height={36} />
      </Stack>
      <ContentBlockSkeleton rows={4} rowHeight={88} />
    </Stack>
  );
}

function SkeletonBody({ kind }: { kind: RouteSkeletonKind }): React.JSX.Element {
  switch (kind) {
    case 'home':
      return <HomeCarouselsSkeleton />;
    case 'browse':
      return <CategoryBrowseSkeleton />;
    case 'browse-square':
      return <CategoryBrowseSkeleton cardAspectRatio="1 / 1" />;
    case 'detail':
      return <ListingDetailSkeleton />;
    case 'member':
      return <MemberProfileSkeleton />;
    case 'inbox':
      return (
        <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
          <NotificationInboxSkeleton />
        </Box>
      );
    case 'stats':
      return (
        <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
          <StatsPageSkeleton />
        </Box>
      );
    case 'packages':
      return (
        <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
          <PackageRowsSkeleton count={4} rowHeight={96} />
        </Box>
      );
    case 'listings':
      return <ListingCardsSkeleton count={6} />;
    case 'form':
      return (
        <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
          <PostListingFormSkeleton />
        </Box>
      );
    default:
      return <DashboardSkeleton />;
  }
}

/**
 * In-page placeholder for route transitions. Cold start still uses the branded splash,
 * which stays up while `data-kg-boot-pending` is present.
 */
export function RouteLoadingSkeleton({
  kind,
  cover = false,
}: {
  kind: RouteSkeletonKind;
  /** Full-screen cover used before the next route commits. */
  cover?: boolean;
}): React.JSX.Element {
  return (
    <Box
      data-kg-boot-pending=""
      aria-busy
      aria-label="Duke u ngarkuar"
      sx={
        cover
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 100000,
              overflow: 'auto',
              bgcolor: 'background.default',
              pt: 'env(safe-area-inset-top)',
              pb: 'env(safe-area-inset-bottom)',
            }
          : {
              bgcolor: 'background.default',
              minHeight: '40vh',
              py: kind === 'browse' || kind === 'browse-square' || kind === 'detail' || kind === 'home' ? 0 : 1,
            }
      }
    >
      <SkeletonBody kind={kind} />
    </Box>
  );
}

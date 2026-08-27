'use client';

import * as React from 'react';
import { Box, Typography, type SxProps, type Theme, type TypographyProps } from '@mui/material';

import { ListingVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import { ListingTrustBadge } from '@/components/public/listing-trust-badge';

const TITLE_FONT = {
  fontWeight: 700,
  fontSize: '0.95rem',
  lineHeight: 1.4,
  color: 'text.primary',
} as const;

const BADGE_GAP_PX = 3;
const MAX_LINES = 2;

function TitleBadges({
  verified,
  trustBadge,
  badgeSize,
  stampSize,
}: {
  verified: boolean;
  trustBadge: boolean;
  badgeSize: number;
  stampSize: number;
}) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${BADGE_GAP_PX}px`,
        flexShrink: 0,
        verticalAlign: 'middle',
        ml: 0.45,
        lineHeight: 0,
      }}
    >
      {verified ? (
        <ListingVerifiedBadge size={badgeSize} aria-label="Shitës i verifikuar" />
      ) : null}
      {trustBadge ? <ListingTrustBadge size={stampSize} /> : null}
    </Box>
  );
}

/**
 * Title + badges as one inline flow. Short titles keep badges beside the text;
 * long titles wrap with full-width lines and badges stay at the end of the last
 * line. Title text is shortened with … so the block never exceeds 2 lines.
 */
export function ListingTitleWithVerified({
  title,
  verified = false,
  trustBadge = false,
  id,
  component = 'h3',
  badgeSize = 16,
  trustBadgeSize,
  typographySx,
  sx,
}: {
  title: React.ReactNode;
  verified?: boolean;
  trustBadge?: boolean;
  id?: string;
  component?: TypographyProps['component'];
  badgeSize?: number;
  trustBadgeSize?: number;
  typographySx?: SxProps<Theme>;
  sx?: SxProps<Theme>;
}) {
  const stampSize = trustBadgeSize ?? badgeSize;
  const showBadges = verified || trustBadge;
  const titleTooltip = typeof title === 'string' ? title : undefined;
  const sxList = [...(Array.isArray(sx) ? sx : sx ? [sx] : [])];
  const typographySxList = [
    ...(Array.isArray(typographySx) ? typographySx : typographySx ? [typographySx] : []),
  ];

  return (
    <Typography
      id={id}
      component={component}
      title={titleTooltip}
      sx={[
        {
          ...TITLE_FONT,
          minWidth: 0,
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: MAX_LINES,
          lineClamp: MAX_LINES,
          WebkitBoxOrient: 'vertical',
          wordBreak: 'break-word',
        },
        ...typographySxList,
        ...sxList,
      ]}
    >
      {title}
      {showBadges ? (
        <TitleBadges
          verified={verified}
          trustBadge={trustBadge}
          badgeSize={badgeSize}
          stampSize={stampSize}
        />
      ) : null}
    </Typography>
  );
}

'use client';

import * as React from 'react';
import { Box, Typography, type SxProps, type Theme, type TypographyProps } from '@mui/material';

import { ListingVerifiedBadge } from '@/components/public/professional-listing-detail-ui';

const TITLE_FONT = {
  fontWeight: 700,
  fontSize: '0.95rem',
  lineHeight: 1.4,
  color: 'text.primary',
} as const;

const BADGE_GAP_PX = 3;

function TitleBadges({
  verified,
  badgeSize,
}: {
  verified: boolean;
  badgeSize: number;
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
  id,
  component = 'h3',
  badgeSize = 16,
  maxLines = 2,
  typographySx,
  sx,
}: {
  title: React.ReactNode;
  verified?: boolean;
  id?: string;
  component?: TypographyProps['component'];
  badgeSize?: number;
  maxLines?: number;
  typographySx?: SxProps<Theme>;
  sx?: SxProps<Theme>;
}) {
  const showBadges = verified;
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
          display: maxLines === 1 ? 'block' : '-webkit-box',
          whiteSpace: maxLines === 1 ? 'nowrap' : 'normal',
          WebkitLineClamp: maxLines > 1 ? maxLines : undefined,
          lineClamp: maxLines > 1 ? maxLines : undefined,
          WebkitBoxOrient: maxLines > 1 ? 'vertical' : undefined,
          wordBreak: maxLines === 1 ? 'normal' : 'break-word',
        },
        ...typographySxList,
        ...sxList,
      ]}
    >
      {title}
      {showBadges ? (
        <TitleBadges
          verified={verified}
          badgeSize={badgeSize}
        />
      ) : null}
    </Typography>
  );
}

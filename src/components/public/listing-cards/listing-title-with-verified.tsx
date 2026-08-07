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
  const titleText = typeof title === 'string' ? title : null;

  const rootRef = React.useRef<HTMLElement>(null);
  const [visibleTitle, setVisibleTitle] = React.useState(titleText ?? '');
  const [truncated, setTruncated] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!showBadges || titleText == null) {
      setVisibleTitle(titleText ?? '');
      setTruncated(false);
      return;
    }

    const root = rootRef.current;
    if (!root) return;

    const fit = () => {
      const styles = getComputedStyle(root);
      const lineHeight = parseFloat(styles.lineHeight) || root.offsetHeight || 20;
      const maxHeight = lineHeight * MAX_LINES + 1;

      // Start from full title; shrink until title + badges fit in 2 lines.
      setVisibleTitle(titleText);
      setTruncated(false);

      // Force layout with full text first (sync after state would be too late —
      // measure via a probe that mirrors the rendered structure instead).
      const probe = document.createElement('div');
      probe.style.cssText = [
        'position:absolute',
        'visibility:hidden',
        'pointer-events:none',
        'left:0',
        'top:0',
        `width:${root.clientWidth}px`,
        'font-weight:700',
        'font-size:0.95rem',
        'line-height:1.4',
        `font-family:${styles.fontFamily}`,
        'word-break:break-word',
        'white-space:normal',
      ].join(';');

      const textSpan = document.createElement('span');
      const badgeProbe = document.createElement('span');
      badgeProbe.style.cssText = [
        'display:inline-flex',
        'vertical-align:middle',
        'flex-shrink:0',
        `width:${(verified ? badgeSize : 0) + (trustBadge ? stampSize : 0) + (verified && trustBadge ? BADGE_GAP_PX : 0) + 4}px`,
        `height:${Math.max(badgeSize, stampSize)}px`,
        'margin-left:4px',
      ].join(';');

      probe.appendChild(textSpan);
      probe.appendChild(badgeProbe);
      root.appendChild(probe);

      const fits = (text: string, withEllipsis: boolean) => {
        textSpan.textContent = withEllipsis ? `${text}…` : text;
        return probe.offsetHeight <= maxHeight;
      };

      if (fits(titleText, false)) {
        root.removeChild(probe);
        setVisibleTitle(titleText);
        setTruncated(false);
        return;
      }

      let lo = 0;
      let hi = titleText.length;
      let best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const candidate = titleText.slice(0, mid).trimEnd();
        if (candidate.length === 0) {
          hi = mid - 1;
          continue;
        }
        if (fits(candidate, true)) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      let next = titleText.slice(0, best).trimEnd();
      const space = next.lastIndexOf(' ');
      if (space > next.length * 0.55) {
        const atSpace = next.slice(0, space).trimEnd();
        if (atSpace && fits(atSpace, true)) next = atSpace;
      }

      root.removeChild(probe);
      setVisibleTitle(next.length > 0 ? next : titleText.slice(0, 12));
      setTruncated(true);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => ro.disconnect();
  }, [titleText, showBadges, verified, trustBadge, badgeSize, stampSize]);

  const titleTooltip = titleText ?? undefined;
  const sxList = [...(Array.isArray(sx) ? sx : sx ? [sx] : [])];
  const typographySxList = [
    ...(Array.isArray(typographySx) ? typographySx : typographySx ? [typographySx] : []),
  ];

  if (!showBadges) {
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
      </Typography>
    );
  }

  if (titleText == null) {
    return (
      <Typography
        id={id}
        component={component}
        sx={[
          {
            ...TITLE_FONT,
            minWidth: 0,
            width: '100%',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: MAX_LINES,
            lineClamp: MAX_LINES,
            WebkitBoxOrient: 'vertical',
          },
          ...typographySxList,
          ...sxList,
        ]}
      >
        {title}
        <TitleBadges
          verified={verified}
          trustBadge={trustBadge}
          badgeSize={badgeSize}
          stampSize={stampSize}
        />
      </Typography>
    );
  }

  return (
    <Typography
      ref={rootRef as React.RefObject<HTMLElement>}
      id={id}
      component={component}
      title={titleTooltip}
      sx={[
        {
          ...TITLE_FONT,
          minWidth: 0,
          width: '100%',
          maxHeight: `${1.4 * MAX_LINES}em`,
          overflow: 'hidden',
          wordBreak: 'break-word',
        },
        ...typographySxList,
        ...sxList,
      ]}
    >
      {visibleTitle}
      {truncated ? '…' : null}
      <TitleBadges
        verified={verified}
        trustBadge={trustBadge}
        badgeSize={badgeSize}
        stampSize={stampSize}
      />
    </Typography>
  );
}

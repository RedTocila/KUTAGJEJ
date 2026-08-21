'use client';

import * as React from 'react';
import { Box, IconButton } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import { ArrowSquareOut as ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { CornersIn as CornersInIcon } from '@phosphor-icons/react/dist/ssr/CornersIn';
import { CornersOut as CornersOutIcon } from '@phosphor-icons/react/dist/ssr/CornersOut';
import { NavigationArrow as NavigationArrowIcon } from '@phosphor-icons/react/dist/ssr/NavigationArrow';

import { useCopy } from '@/hooks/use-copy';
import { MOTION } from '@/styles/motion';

/** Compact banner — wide letterbox. */
const MAP_COLLAPSED_HEIGHT = 148;
/** Taller preview after tapping expand. */
const MAP_EXPANDED_HEIGHT = 420;
/** Hide Google's top-left "Open in Maps" and top-right fullscreen controls. */
const MAP_TOP_CLIP_PX = 56;
/** Hide attribution strip and Google's stacked bottom-right buttons. */
const MAP_BOTTOM_CLIP_PX = 96;
const MAPS_BLUE = '#1a73e8';
const MAPS_BLUE_DARK = '#8ab4f8';
/** Google Maps Night land — also used for dark clip edges. */
const GOOGLE_NIGHT_LAND = '#242f3e';
/**
 * Google Maps night palette: land #242f3e, roads #38414e, parks #263c3f, water #17263c.
 * The keyless embed cannot set colorScheme, so a light map is inverted into that look.
 */
const GOOGLE_NIGHT_FILTER =
  'invert(1) hue-rotate(180deg) saturate(0.62) brightness(1.28) contrast(0.98)';

export interface LocationMapEmbedProps {
  /** Free-text query (city, zone, address) to center the map on. */
  query?: string;
  /** Exact pin — preferred over query when both are set. */
  lat?: number | null;
  lng?: number | null;
  /** Collapsed height in pixels. */
  height?: number;
  /** Expanded height in pixels. */
  expandedHeight?: number;
  /** Zoom when showing an exact pin (default 15). Text query uses 13. */
  pinZoom?: number;
}

function GoogleMapsPinIcon({ size = 18 }: { size?: number }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0 }}
      aria-hidden
    >
      <path fill="#EA4335" d="M12 2c-3.6 0-6.5 2.9-6.5 6.9 0 4.9 6.5 12.1 6.5 12.1s6.5-7.2 6.5-12.1C18.5 4.9 15.6 2 12 2z" />
      <path fill="#FBBC04" d="M12 2v19s6.5-7.2 6.5-12.1C18.5 4.9 15.6 2 12 2z" />
      <path fill="#34A853" d="M12 8.6a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4z" opacity="0.35" />
      <circle cx="12" cy="8.4" r="2.35" fill="#4285F4" />
      <circle cx="12" cy="8.4" r="1.15" fill="#fff" />
    </Box>
  );
}

function mapChromeButtonSx(theme: Theme) {
  return {
    position: 'absolute' as const,
    zIndex: 2,
    color: '#1a1c1e',
    bgcolor: alpha('#fff', 0.92),
    backdropFilter: 'blur(8px)',
    border: '1px solid',
    borderColor: alpha('#000', 0.08),
    boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
    '&:hover': { bgcolor: '#fff' },
    ...theme.applyStyles('dark', {
      color: '#fff',
      bgcolor: '#000',
      borderColor: alpha('#fff', 0.16),
      boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
      '&:hover': { bgcolor: '#111' },
    }),
  };
}

/**
 * Embeds a Google Maps view. Compact by default; expand grows it in place.
 * Native iframe chrome is clipped so only our overlays show. Dark mode uses
 * Google Maps’ night colors (navy land, muted blue-gray roads, white labels).
 */
export function LocationMapEmbed({
  query,
  lat,
  lng,
  height = MAP_COLLAPSED_HEIGHT,
  expandedHeight = MAP_EXPANDED_HEIGHT,
  pinZoom = 15,
}: LocationMapEmbedProps) {
  const t = useCopy();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState(false);

  const hasPin =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;

  const trimmed = String(query || '').trim();
  if (!hasPin && !trimmed) return null;

  const mapQuery = hasPin ? `${lat},${lng}` : trimmed;
  const zoom = hasPin ? pinZoom : 13;
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${zoom}&output=embed`;
  const externalHref = hasPin
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`;

  const mapHeight = expanded ? expandedHeight : height;

  const toggleExpanded = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((prev) => {
      const next = !prev;
      if (!prev) {
        requestAnimationFrame(() => {
          rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
      return next;
    });
  };

  const openCollapsedMap = () => {
    if (expanded) return;
    window.open(externalHref, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      ref={rootRef}
      role="region"
      aria-expanded={expanded}
      aria-label={t.common.locationMapTitle}
      onClick={openCollapsedMap}
      sx={(theme) => ({
        position: 'relative',
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        clear: 'both',
        height: mapHeight,
        borderRadius: 3,
        overflow: 'hidden',
        cursor: expanded ? 'default' : 'pointer',
        bgcolor: '#e8eaed',
        border: '1px solid',
        borderColor: alpha('#000', 0.12),
        transition: `height ${MOTION.enter} ${MOTION.ease}`,
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        ...theme.applyStyles('dark', {
          bgcolor: GOOGLE_NIGHT_LAND,
          borderColor: alpha('#fff', 0.16),
        }),
      })}
    >
      <Box
        key={embedSrc}
        component="iframe"
        title={t.common.locationMapTitle}
        src={embedSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allow="geolocation"
        tabIndex={expanded ? 0 : -1}
        sx={(theme) => ({
          border: 0,
          position: 'absolute',
          top: -MAP_TOP_CLIP_PX,
          left: 0,
          width: '100%',
          height: `calc(100% + ${MAP_TOP_CLIP_PX + MAP_BOTTOM_CLIP_PX}px)`,
          display: 'block',
          pointerEvents: expanded ? 'auto' : 'none',
          colorScheme: 'light',
          ...theme.applyStyles('dark', {
            filter: GOOGLE_NIGHT_FILTER,
            WebkitFilter: GOOGLE_NIGHT_FILTER,
          }),
        })}
      />

      <Box
        component="a"
        href={externalHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        aria-label={t.common.openInMaps}
        sx={(theme) => ({
          position: 'absolute',
          zIndex: 2,
          top: 10,
          left: 10,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          height: 36,
          px: 1.5,
          borderRadius: 999,
          textDecoration: 'none',
          bgcolor: '#fff',
          color: MAPS_BLUE,
          fontSize: '0.8125rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          border: '1px solid',
          borderColor: alpha('#000', 0.08),
          '&:hover': { bgcolor: '#f8f9fa' },
          ...theme.applyStyles('dark', {
            bgcolor: '#000',
            color: MAPS_BLUE_DARK,
            borderColor: alpha('#fff', 0.16),
            boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
            '&:hover': { bgcolor: '#111' },
          }),
        })}
      >
        Maps
        <ArrowSquareOutIcon size={14} weight="bold" />
      </Box>

      <IconButton
        aria-label={expanded ? t.common.collapseMap : t.common.expandMap}
        onClick={toggleExpanded}
        size="small"
        sx={(theme) => ({
          ...mapChromeButtonSx(theme),
          top: 10,
          right: 10,
          width: 36,
          height: 36,
        })}
      >
        {expanded ? <CornersInIcon size={18} weight="bold" /> : <CornersOutIcon size={18} weight="bold" />}
      </IconButton>

      {expanded ? (
        <>
          <Box
            component="a"
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={t.common.openInMaps}
            sx={(theme) => ({
              ...mapChromeButtonSx(theme),
              top: 'auto',
              bottom: 12,
              left: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              height: 40,
              px: 1.5,
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1,
            })}
          >
            <GoogleMapsPinIcon size={16} />
            {t.common.openInMaps}
          </Box>
          <IconButton
            component="a"
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            aria-label={t.common.mapDirections}
            size="small"
            sx={(theme) => ({
              ...mapChromeButtonSx(theme),
              top: 'auto',
              bottom: 12,
              right: 12,
              width: 40,
              height: 40,
            })}
          >
            <NavigationArrowIcon size={18} weight="fill" />
          </IconButton>
        </>
      ) : null}
    </Box>
  );
}

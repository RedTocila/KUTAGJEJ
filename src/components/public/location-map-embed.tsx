'use client';

import * as React from 'react';
import { Box } from '@mui/material';

export interface LocationMapEmbedProps {
  /** Free-text query (city, zone, address) to center the map on. */
  query?: string;
  /** Exact pin — preferred over query when both are set. */
  lat?: number | null;
  lng?: number | null;
  /** Map height in pixels. */
  height?: number;
  /** Zoom when showing an exact pin (default 15). Text query uses 13. */
  pinZoom?: number;
}

/**
 * Embeds an interactive Google Maps view for a location query or lat/lng pin.
 * Uses the keyless `output=embed` endpoint, so no API key is required.
 * Clicking the map opens the location in Google Maps.
 */
export function LocationMapEmbed({
  query,
  lat,
  lng,
  height = 240,
  pinZoom = 15,
}: LocationMapEmbedProps) {
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

  return (
    <Box
      component="a"
      href={externalHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hap në Google Maps"
      sx={{
        position: 'relative',
        display: 'block',
        width: '100%',
        maxWidth: '100%',
        clear: 'both',
        height,
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <Box
        key={embedSrc}
        component="iframe"
        title="Harta e vendndodhjes"
        src={embedSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        tabIndex={-1}
        sx={{
          border: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}

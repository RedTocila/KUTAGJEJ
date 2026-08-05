'use client';

import * as React from 'react';
import { Box } from '@mui/material';

export interface LocationMapEmbedProps {
  /** Free-text query (city, zone, address) to center the map on. */
  query: string;
  /** Map height in pixels. */
  height?: number;
}

/**
 * Embeds an interactive Google Maps view for a location query.
 * Uses the keyless `output=embed` endpoint, so no API key is required.
 * Clicking the map opens the location in Google Maps.
 */
export function LocationMapEmbed({ query, height = 240 }: LocationMapEmbedProps) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&z=13&output=embed`;
  const externalHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;

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

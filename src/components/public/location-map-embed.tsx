'use client';

import * as React from 'react';
import { Box, Link as MuiLink } from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

export interface LocationMapEmbedProps {
  /** Free-text query (city, zone, address) to center the map on. */
  query: string;
  /** Map height in pixels. */
  height?: number;
  /** Label for the "open in Google Maps" link below the map. */
  linkLabel?: string;
}

/**
 * Embeds an interactive Google Maps view for a location query.
 * Uses the keyless `output=embed` endpoint, so no API key is required.
 */
export function LocationMapEmbed({ query, height = 240, linkLabel = 'Shiko në hartë' }: LocationMapEmbedProps) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&z=13&output=embed`;
  const externalHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`;

  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          component="iframe"
          title="Harta e vendndodhjes"
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sx={{ border: 0, width: '100%', height: '100%', display: 'block' }}
        />
      </Box>
      <MuiLink
        href={externalHref}
        target="_blank"
        rel="noopener noreferrer"
        variant="subtitle2"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 800, mt: 1 }}
      >
        <MapPinIcon size={16} weight="duotone" /> {linkLabel}
      </MuiLink>
    </Box>
  );
}

'use client';

import * as React from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { findOptionLabel } from '@/components/public/listing-cards/format-helpers';
import { businessMapLocation } from '@/lib/google-maps-location';
import { JOB_INDUSTRY_OPTIONS } from '@/lib/job-constants';
import { jobIndustryCoverTheme, type JobCoverTheme } from '@/lib/job-industry-themes';
import { jobIndustryIcon } from '@/lib/job-industry-icons';

/** Slim cover banner — between listing photos and the location map strip. */
export const JOB_LISTING_COVER_ASPECT_RATIO = '21 / 9';

/** Theme wash fades out by 54%; map pin centered in the right 62% zone. */
const GRADIENT_END = '54%';
const LEFT_PANEL_WIDTH = '38%';
/** 38% left + half of 62% right = 69% */
const MAP_CENTER_X = '69%';

const MAP_TOP_CLIP_PX = 48;
const MAP_BOTTOM_CLIP_PX = 72;
const GRADIENT_FADE_MASK = `linear-gradient(to right, #000 0%, #000 18%, rgba(0, 0, 0, 0) ${GRADIENT_END})`;

/** Google Maps night land — matches LocationMapEmbed dark styling. */
const GOOGLE_NIGHT_LAND = '#242f3e';
const GOOGLE_NIGHT_FILTER =
  'invert(1) hue-rotate(180deg) saturate(0.62) brightness(1.28) contrast(0.98)';

type CoverTheme = JobCoverTheme;

export type JobListingFallbackProps = {
  industry?: string | null;
  cityName?: string | null;
  zoneName?: string | null;
  mapsUrl?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
};

function JobCoverThemeOverlay({ theme }: { theme: CoverTheme }) {
  return (
    <>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(in oklab, ${theme.colorFrom} 0%, ${theme.colorMid} 28%, ${theme.colorMid} 52%)`,
          maskImage: GRADIENT_FADE_MASK,
          WebkitMaskImage: GRADIENT_FADE_MASK,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(in oklab, ${theme.colorFrom} 0%, ${theme.colorMid} 100%)`,
          opacity: 0.5,
          maskImage: GRADIENT_FADE_MASK,
          WebkitMaskImage: GRADIENT_FADE_MASK,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 95% 150% at 12% 50%, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0) 72%)`,
          maskImage: GRADIENT_FADE_MASK,
          WebkitMaskImage: GRADIENT_FADE_MASK,
        }}
      />
    </>
  );
}

function JobCoverMapPreview({
  query,
  lat,
  lng,
}: {
  query?: string;
  lat?: number;
  lng?: number;
}) {
  const hasPin =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;

  const trimmed = String(query || '').trim();
  const mapQuery = hasPin ? `${lat},${lng}` : trimmed || 'Shqipëri';
  const zoom = hasPin ? 15 : trimmed ? 13 : 8;
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${zoom}&output=embed`;

  return (
    <Box
      aria-hidden
      sx={(muiTheme) => ({
        position: 'absolute',
        inset: 0,
        bgcolor: '#e8eaed',
        overflow: 'hidden',
        ...muiTheme.applyStyles('dark', {
          bgcolor: GOOGLE_NIGHT_LAND,
        }),
      })}
    >
      <Box
        key={embedSrc}
        component="iframe"
        title=""
        src={embedSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        tabIndex={-1}
        sx={(muiTheme) => ({
          border: 0,
          position: 'absolute',
          top: -MAP_TOP_CLIP_PX,
          left: `calc(${MAP_CENTER_X} - 50%)`,
          width: '100%',
          height: `calc(100% + ${MAP_TOP_CLIP_PX + MAP_BOTTOM_CLIP_PX}px)`,
          display: 'block',
          pointerEvents: 'none',
          colorScheme: 'light',
          ...muiTheme.applyStyles('dark', {
            filter: GOOGLE_NIGHT_FILTER,
            WebkitFilter: GOOGLE_NIGHT_FILTER,
          }),
        })}
      />
    </Box>
  );
}

/**
 * Photo-free job cover: full-bleed map, smooth theme fade on the left, large profession icon.
 */
export function JobListingFallback({
  industry,
  cityName,
  zoneName,
  mapsUrl,
  locationAddress,
  locationLat,
  locationLng,
}: JobListingFallbackProps) {
  const theme = jobIndustryCoverTheme(industry);
  const IndustryIcon = jobIndustryIcon(industry);
  const industryLabel = findOptionLabel(JOB_INDUSTRY_OPTIONS, industry) || 'Punë';
  const locationParts = [zoneName, cityName].filter(Boolean);
  const locationLabel = locationAddress?.trim() || locationParts.join(', ') || 'Shqipëri';

  const mapLocation =
    businessMapLocation({
      locationLat,
      locationLng,
      mapsUrl,
      mapsPlaceQuery: locationAddress,
      zoneName,
      cityName,
    }) ?? { query: 'Shqipëri' };

  return (
    <Box
      role="img"
      aria-label={`${industryLabel}, ${locationLabel}`}
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        bgcolor: theme.background,
      }}
    >
      <JobCoverMapPreview query={mapLocation.query} lat={mapLocation.lat} lng={mapLocation.lng} />
      <JobCoverThemeOverlay theme={theme} />

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: LEFT_PANEL_WIDTH,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.iconColor,
          pointerEvents: 'none',
          filter: `drop-shadow(0 4px 16px ${alpha('#000', 0.3)})`,
          '& svg': {
            width: '72%',
            height: '72%',
            maxWidth: '100%',
            maxHeight: '100%',
          },
        }}
      >
        <IndustryIcon weight="duotone" />
      </Box>

      {!locationParts.length && !locationAddress?.trim() && !mapsUrl?.trim() && locationLat == null ? (
        <Box
          aria-hidden
          sx={(muiTheme) => ({
            position: 'absolute',
            right: 10,
            bottom: 10,
            zIndex: 2,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.45,
            borderRadius: 999,
            bgcolor: alpha('#fff', 0.92),
            color: 'text.primary',
            fontSize: '0.68rem',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            ...muiTheme.applyStyles('dark', {
              bgcolor: alpha('#000', 0.82),
              color: '#fff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
            }),
          })}
        >
          <MapPinIcon size={13} weight="fill" />
          Shqipëri
        </Box>
      ) : null}
    </Box>
  );
}

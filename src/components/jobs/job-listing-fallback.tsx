'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { findOptionLabel } from '@/lib/find-option-label';
import { businessMapLocation } from '@/lib/google-maps-location';
import { JOB_LISTING_COVER_ASPECT_RATIO } from '@/lib/job-listing-cover';
import { JOB_INDUSTRY_OPTIONS } from '@/lib/job-constants';
import { resolveJobCoverIcon } from '@/lib/job-industry-icons';
import { inferRequiredRolesFromTitle, sanitizeRequiredRoles } from '@/lib/job-required-roles';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { neutralInk } from '@/styles/theme/colors';

export { JOB_LISTING_COVER_ASPECT_RATIO } from '@/lib/job-listing-cover';

/** Theme wash fades out softly into the map; map pin centered in the right 62% zone. */
const LEFT_PANEL_WIDTH = '38%';
/** 38% left + half of 62% right = 69% */
const MAP_CENTER_X = '69%';

const MAP_TOP_CLIP_PX = 48;
const MAP_BOTTOM_CLIP_PX = 72;
/** Soft horizontal fade — wider than before for a blurrier blend into the map. */
const GRADIENT_FADE_MASK = `linear-gradient(to right, #000 0%, #000 12%, rgba(0, 0, 0, 0.72) 28%, rgba(0, 0, 0, 0.28) 44%, rgba(0, 0, 0, 0) 62%)`;

/** Cover palette — literal hex so masked gradients stay stable (no CSS var / oklab wash-out). */
const LIGHT_COVER_SOLID = '#ffffff';
const LIGHT_COVER_FADE = neutralInk[50];
const LIGHT_COVER_MID = neutralInk[100];
const DARK_COVER_SOLID = neutralInk[950];
const DARK_COVER_FADE = neutralInk[900];
const DARK_COVER_MID = neutralInk[800];

/** Google Maps night land — matches LocationMapEmbed dark styling. */
const GOOGLE_NIGHT_LAND = '#242f3e';
const GOOGLE_NIGHT_FILTER =
  'invert(1) hue-rotate(180deg) saturate(0.62) brightness(1.28) contrast(0.98)';

export type JobListingFallbackVariant = 'default' | 'card';

export type JobListingFallbackProps = {
  title?: string | null;
  industry?: string | null;
  requiredRoles?: string[] | null;
  cityName?: string | null;
  zoneName?: string | null;
  mapsUrl?: string | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  /** Larger role text and wider icon column — for browse/home/dashboard cards. */
  variant?: JobListingFallbackVariant;
};

function normalizeRequiredRoles(requiredRoles?: string[] | null): string[] {
  return sanitizeRequiredRoles(requiredRoles);
}

/** Shrink the profession icon when more roles need room below it. */
function coverIconScale(roleCount: number, variant: JobListingFallbackVariant): number {
  if (variant === 'card') {
    if (roleCount <= 1) return 0.62;
    if (roleCount === 2) return 0.5;
    if (roleCount === 3) return 0.42;
    return 0.34;
  }
  if (roleCount <= 1) return 0.72;
  if (roleCount === 2) return 0.58;
  if (roleCount === 3) return 0.5;
  return 0.42;
}

function coverRoleFontSize(roleCount: number, variant: JobListingFallbackVariant): string {
  if (variant === 'card') {
    if (roleCount <= 2) return '0.94rem';
    if (roleCount <= 4) return '0.86rem';
    return '0.8rem';
  }
  if (roleCount <= 2) return '0.78rem';
  if (roleCount <= 4) return '0.72rem';
  return '0.66rem';
}

function coverRoleBulletSize(roleCount: number, variant: JobListingFallbackVariant): number {
  if (variant === 'card') {
    if (roleCount <= 2) return 7;
    if (roleCount <= 4) return 6.5;
    return 6;
  }
  if (roleCount <= 2) return 6;
  if (roleCount <= 4) return 5.5;
  return 5;
}

function coverLeftPanelWidth(variant: JobListingFallbackVariant): string {
  return variant === 'card' ? '44%' : LEFT_PANEL_WIDTH;
}

function JobCoverThemeOverlay() {
  return (
    <>
      <Box
        aria-hidden
        sx={(muiTheme) => ({
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: `linear-gradient(180deg, ${LIGHT_COVER_SOLID} 0%, ${LIGHT_COVER_FADE} 28%, ${LIGHT_COVER_MID} 52%)`,
          maskImage: GRADIENT_FADE_MASK,
          WebkitMaskImage: GRADIENT_FADE_MASK,
          ...muiTheme.applyStyles('dark', {
            background: `linear-gradient(180deg, ${DARK_COVER_SOLID} 0%, ${DARK_COVER_FADE} 28%, ${DARK_COVER_MID} 52%)`,
          }),
        })}
      />
      <Box
        aria-hidden
        sx={(muiTheme) => ({
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: `linear-gradient(180deg, ${LIGHT_COVER_SOLID} 0%, ${LIGHT_COVER_FADE} 100%)`,
          opacity: 0.15,
          maskImage: GRADIENT_FADE_MASK,
          WebkitMaskImage: GRADIENT_FADE_MASK,
          ...muiTheme.applyStyles('dark', {
            background: `linear-gradient(180deg, ${DARK_COVER_SOLID} 0%, ${DARK_COVER_MID} 100%)`,
            opacity: 0.48,
          }),
        })}
      />
      <Box
        aria-hidden
        sx={(muiTheme) => ({
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 95% 150% at 12% 50%, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0) 72%)`,
          maskImage: GRADIENT_FADE_MASK,
          WebkitMaskImage: GRADIENT_FADE_MASK,
          ...muiTheme.applyStyles('dark', {
            background: `radial-gradient(ellipse 95% 150% at 12% 50%, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0) 72%)`,
          }),
        })}
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
  title,
  industry,
  requiredRoles,
  cityName,
  zoneName,
  mapsUrl,
  locationAddress,
  locationLat,
  locationLng,
  variant = 'default',
}: JobListingFallbackProps) {
  const roles = React.useMemo(() => {
    const stored = normalizeRequiredRoles(requiredRoles);
    if (stored.length) return stored;
    return inferRequiredRolesFromTitle(title);
  }, [requiredRoles, title]);
  const roleCount = roles.length;
  const iconScale = coverIconScale(roleCount, variant);
  const roleFontSize = coverRoleFontSize(roleCount, variant);
  const roleBulletSize = coverRoleBulletSize(roleCount, variant);
  const leftPanelWidth = coverLeftPanelWidth(variant);
  const isCard = variant === 'card';
  const roleHint = roles.join(' / ');
  const CoverIcon = resolveJobCoverIcon(title || roleHint, industry);
  const industryLabel = findOptionLabel(JOB_INDUSTRY_OPTIONS, industry) || 'Punë';
  const roleLabel = String(title || '').trim() || roleHint || industryLabel;
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
      aria-label={`${roleLabel}, ${locationLabel}`}
      sx={(muiTheme) => ({
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        bgcolor: LIGHT_COVER_SOLID,
        ...muiTheme.applyStyles('dark', { bgcolor: DARK_COVER_SOLID }),
      })}
    >
      <JobCoverMapPreview query={mapLocation.query} lat={mapLocation.lat} lng={mapLocation.lng} />
      <JobCoverThemeOverlay />

      <Box
        aria-hidden
        sx={(muiTheme) => ({
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: leftPanelWidth,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: roleCount > 0 ? (isCard ? 0.35 : 0.5) : 0,
          px: isCard ? 0.75 : 0.5,
          color: 'primary.main',
          pointerEvents: 'none',
          filter: `drop-shadow(0 2px 10px ${primaryMainAlpha(0.18)})`,
          ...muiTheme.applyStyles('dark', {
            color: '#fff',
            filter: `drop-shadow(0 4px 16px ${alpha('#000', 0.3)})`,
          }),
        })}
      >
        <Box
          sx={{
            width: `${iconScale * 100}%`,
            maxWidth: isCard ? '92%' : '88%',
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            '& svg': {
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
            },
          }}
        >
          <CoverIcon weight="duotone" />
        </Box>
        {roleCount > 0 ? (
          <Stack
            spacing={isCard ? 0.28 : 0.35}
            sx={{
              width: '100%',
              maxWidth: isCard ? '100%' : '96%',
              px: isCard ? 0.15 : 0.25,
              alignItems: 'center',
            }}
          >
            {roles.map((role, index) => (
              <Stack
                key={`${role}-${index}`}
                direction="row"
                spacing={0.55}
                sx={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              >
                <Box
                  sx={{
                    width: roleBulletSize,
                    height: roleBulletSize,
                    borderRadius: '50%',
                    bgcolor: 'currentColor',
                    flexShrink: 0,
                    opacity: 0.92,
                  }}
                />
                <Typography
                  sx={(muiTheme) => ({
                    fontSize: roleFontSize,
                    fontWeight: 800,
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em',
                    color: 'primary.main',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                    ...muiTheme.applyStyles('dark', { color: '#fff' }),
                  })}
                >
                  {role}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : null}
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

'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { CarProfile as CarProfileIcon } from '@phosphor-icons/react/dist/ssr/CarProfile';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { Warehouse as WarehouseIcon } from '@phosphor-icons/react/dist/ssr/Warehouse';
import type { Icon as PhosphorIcon, IconProps, IconWeight } from '@phosphor-icons/react';

import { AI_SEARCH_BLUE, PROFILES_ACCENT, type SearchCategoryId } from '@/lib/home-categories';

export interface HomeVerticalIconProps {
  verticalId: SearchCategoryId;
  size?: number;
  weight?: IconWeight;
  color?: string;
}

function resolveDuotoneWeight(weight: IconWeight | undefined): IconWeight {
  if (!weight || weight === 'regular' || weight === 'thin' || weight === 'light') return 'duotone';
  return weight;
}

/** Map pin above a faded warehouse — same mark as homepage businesses category. */
function BusinessesDirectoryIcon({
  size,
  weight,
  color,
}: {
  size: number;
  weight: IconWeight;
  color: string;
}) {
  const pinSize = Math.round(size * 0.4);
  const warehouseSize = Math.round(size * 0.86);
  // Overlap just enough so pin + warehouse stay inside the icon box.
  const overlap = Math.max(Math.round(size * 0.14), pinSize + warehouseSize - size);
  const down = Math.round(size * 0.06);
  const pinTop = Math.max(0, size - warehouseSize - pinSize + overlap + down);
  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'inline-flex',
        lineHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: `-${Math.round(down * 0.35)}px`,
          transform: 'translateX(-50%)',
          opacity: 0.7,
          lineHeight: 0,
        }}
      >
        <WarehouseIcon weight={weight} size={warehouseSize} color={color} aria-hidden />
      </Box>
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: pinTop,
          transform: 'translateX(-50%)',
          zIndex: 1,
          lineHeight: 0,
          filter: 'drop-shadow(0 0 1.5px var(--mui-palette-background-paper))',
        }}
      >
        <MapPinIcon weight={weight} size={pinSize} color={color} aria-hidden />
      </Box>
    </Box>
  );
}

/**
 * Phosphor-shaped businesses mark (pin + warehouse) for headers, pickers, and cards
 * that expect an `Icon` component.
 */
export const BusinessesCategoryIcon = React.forwardRef<SVGSVGElement, IconProps>(
  function BusinessesCategoryIcon({ size = 24, weight = 'duotone', color = 'currentColor' }, _ref) {
    return (
      <BusinessesDirectoryIcon
        size={typeof size === 'number' ? size : 24}
        weight={resolveDuotoneWeight(weight)}
        color={typeof color === 'string' ? color : 'currentColor'}
      />
    );
  },
) as PhosphorIcon;

/** Phosphor icons for homepage verticals — shared by hero circles and listing sections. */
export function HomeVerticalIcon({
  verticalId,
  size = 26,
  weight = 'duotone',
  color,
}: HomeVerticalIconProps) {
  const resolvedWeight = resolveDuotoneWeight(weight);
  const resolvedColor =
    color ??
    (verticalId === 'ai'
      ? AI_SEARCH_BLUE
      : verticalId === 'profiles'
        ? PROFILES_ACCENT
        : 'var(--mui-palette-primary-main)');
  const shared = {
    weight: resolvedWeight,
    size,
    color: resolvedColor,
    'aria-hidden': true as const,
  };

  switch (verticalId) {
    case 'ai':
      return <SparkleIcon {...shared} />;
    case 'okazion':
      return <SealPercentIcon {...shared} />;
    case 'real-estate':
      return <BuildingsIcon {...shared} />;
    case 'cars':
      return <CarProfileIcon {...shared} />;
    case 'jobs':
      return <BriefcaseIcon {...shared} />;
    case 'marketplace':
      return <StorefrontIcon {...shared} />;
    case 'businesses':
      return <BusinessesDirectoryIcon size={size} weight={resolvedWeight} color={resolvedColor} />;
    case 'professionals':
      return <HandshakeIcon {...shared} />;
    case 'profiles':
      return <UsersIcon {...shared} />;
    default:
      return <BuildingsIcon {...shared} />;
  }
}

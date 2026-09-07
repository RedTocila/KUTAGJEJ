'use client';

import * as React from 'react';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { CarProfile as CarProfileIcon } from '@phosphor-icons/react/dist/ssr/CarProfile';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { SealPercent as SealPercentIcon } from '@phosphor-icons/react/dist/ssr/SealPercent';
import { ShoppingCart as ShoppingCartIcon } from '@phosphor-icons/react/dist/ssr/ShoppingCart';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Users as UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
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

/**
 * Small-business mark (storefront) for headers, pickers, and cards that expect an `Icon` component.
 */
export const BusinessesCategoryIcon = React.forwardRef<SVGSVGElement, IconProps>(
  function BusinessesCategoryIcon(props, ref) {
    const { weight = 'duotone', ...rest } = props;
    return <StorefrontIcon ref={ref} weight={resolveDuotoneWeight(weight)} {...rest} />;
  },
) as PhosphorIcon;

/** Marketplace / Tregu mark (shopping cart). */
export const MarketplaceCategoryIcon = React.forwardRef<SVGSVGElement, IconProps>(
  function MarketplaceCategoryIcon(props, ref) {
    const { weight = 'duotone', ...rest } = props;
    return <ShoppingCartIcon ref={ref} weight={resolveDuotoneWeight(weight)} {...rest} />;
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
      return <ShoppingCartIcon {...shared} />;
    case 'businesses':
      return <StorefrontIcon {...shared} />;
    case 'professionals':
      return <HandshakeIcon {...shared} />;
    case 'profiles':
      return <UsersIcon {...shared} />;
    default:
      return <BuildingsIcon {...shared} />;
  }
}

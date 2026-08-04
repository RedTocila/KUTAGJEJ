'use client';

import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { CarProfile as CarProfileIcon } from '@phosphor-icons/react/dist/ssr/CarProfile';
import { ForkKnife as ForkKnifeIcon } from '@phosphor-icons/react/dist/ssr/ForkKnife';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import type { IconWeight } from '@phosphor-icons/react';

import { AI_SEARCH_BLUE, type SearchCategoryId } from '@/lib/home-categories';

export interface HomeVerticalIconProps {
  verticalId: SearchCategoryId;
  size?: number;
  weight?: IconWeight;
  color?: string;
}

/** Phosphor icons for homepage verticals — shared by hero circles and listing sections. */
export function HomeVerticalIcon({
  verticalId,
  size = 26,
  weight = 'duotone',
  color,
}: HomeVerticalIconProps) {
  const resolvedColor =
    color ??
    (verticalId === 'ai' ? AI_SEARCH_BLUE : 'var(--mui-palette-primary-main)');
  const shared = {
    weight,
    size,
    color: resolvedColor,
    'aria-hidden': true as const,
  };

  switch (verticalId) {
    case 'ai':
      return <SparkleIcon {...shared} />;
    case 'real-estate':
      return <BuildingsIcon {...shared} />;
    case 'cars':
      return <CarProfileIcon {...shared} />;
    case 'jobs':
      return <BriefcaseIcon {...shared} />;
    case 'marketplace':
      return <StorefrontIcon {...shared} />;
    case 'businesses':
      return <ForkKnifeIcon {...shared} />;
    case 'professionals':
      return <HandshakeIcon {...shared} />;
    default:
      return <BuildingsIcon {...shared} />;
  }
}

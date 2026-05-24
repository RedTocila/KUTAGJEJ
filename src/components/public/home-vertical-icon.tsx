'use client';

import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { Martini as MartiniIcon } from '@phosphor-icons/react/dist/ssr/Martini';
import { ShoppingCart as ShoppingCartIcon } from '@phosphor-icons/react/dist/ssr/ShoppingCart';
import { UsersThree as UsersThreeIcon } from '@phosphor-icons/react/dist/ssr/UsersThree';
import type { IconWeight } from '@phosphor-icons/react';

import type { HomeVerticalId } from '@/lib/home-categories';

export interface HomeVerticalIconProps {
  verticalId: HomeVerticalId;
  size?: number;
  weight?: IconWeight;
  color?: string;
}

/** Bold Phosphor icons for homepage verticals — shared by hero circles and listing sections. */
export function HomeVerticalIcon({
  verticalId,
  size = 26,
  weight = 'bold',
  color = 'var(--mui-palette-primary-main)',
}: HomeVerticalIconProps) {
  const shared = {
    weight,
    size,
    color,
    'aria-hidden': true as const,
  };

  switch (verticalId) {
    case 'real-estate':
      return <HouseIcon {...shared} />;
    case 'cars':
      return <CarIcon {...shared} />;
    case 'jobs':
      return <BriefcaseIcon {...shared} />;
    case 'marketplace':
      return <ShoppingCartIcon {...shared} />;
    case 'businesses':
      return <MartiniIcon {...shared} />;
    case 'professionals':
      return <UsersThreeIcon {...shared} />;
    default:
      return <HouseIcon {...shared} />;
  }
}

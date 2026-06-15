import type * as React from 'react';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { ListBullets as ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';

export type UserPortalNavIconComponent = React.ComponentType<{
  className?: string;
  color?: string;
  fill?: string;
  fontSize?: string | number;
  weight?: 'bold' | 'duotone' | 'fill' | 'light' | 'regular' | 'thin';
}>;

/** Icons used only in the user portal nav (subset of dashboard nav icons). */
export const userPortalNavIcons = {
  'squares-four': SquaresFourIcon,
  buildings: BuildingsIcon,
  'list-bullets': ListBulletsIcon,
  bookmark: BookmarkSimpleIcon,
  'user-gear': UserGearIcon,
} as Record<string, UserPortalNavIconComponent>;

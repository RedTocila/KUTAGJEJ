import type * as React from 'react';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { ListBullets as ListBulletsIcon } from '@phosphor-icons/react/dist/ssr/ListBullets';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';
import { UserGear as UserGearIcon } from '@phosphor-icons/react/dist/ssr/UserGear';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';

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
  'chats-circle': ChatsCircleIcon,
  handshake: HandshakeIcon,
  coins: BoostCoinIcon,
  receipt: ReceiptIcon,
  'user-gear': UserGearIcon,
} as Record<string, UserPortalNavIconComponent>;

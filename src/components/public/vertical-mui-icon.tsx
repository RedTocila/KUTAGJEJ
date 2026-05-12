'use client';

import * as React from 'react';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import DirectionsCarOutlined from '@mui/icons-material/DirectionsCarOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import Work from '@mui/icons-material/Work';

import type { HomeVerticalId } from '@/lib/home-categories';

const ICONS: Record<HomeVerticalId, React.ElementType<SvgIconProps>> = {
  'real-estate': HomeOutlined,
  cars: DirectionsCarOutlined,
  jobs: Work,
  marketplace: ShoppingCartOutlined,
  businesses: TrendingUpOutlined,
  professionals: GroupsOutlined,
};

export interface VerticalMuiIconProps {
  verticalId: HomeVerticalId;
  fontSize?: SvgIconProps['fontSize'];
  sx?: SvgIconProps['sx'];
}

export function VerticalMuiIcon({ verticalId, fontSize = 'medium', sx }: VerticalMuiIconProps) {
  const Cmp = ICONS[verticalId];
  return <Cmp aria-hidden sx={sx} fontSize={fontSize} />;
}

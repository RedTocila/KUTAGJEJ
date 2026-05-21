'use client';

import * as React from 'react';
import DirectionsCarOutlined from '@mui/icons-material/DirectionsCarOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import Work from '@mui/icons-material/Work';
import type { SvgIconProps } from '@mui/material/SvgIcon';

import type { HomeVerticalId } from '@/lib/home-categories';

export interface VerticalMuiIconProps {
  verticalId: HomeVerticalId;
  fontSize?: SvgIconProps['fontSize'];
  sx?: SvgIconProps['sx'];
}

export function VerticalMuiIcon({ verticalId, fontSize = 'medium', sx }: VerticalMuiIconProps) {
  const shared = { 'aria-hidden': true as const, sx, fontSize };

  switch (verticalId) {
    case 'real-estate':
      return <HomeOutlined {...shared} />;
    case 'cars':
      return <DirectionsCarOutlined {...shared} />;
    case 'jobs':
      return <Work {...shared} />;
    case 'marketplace':
      return <ShoppingCartOutlined {...shared} />;
    case 'businesses':
      return <StorefrontOutlined {...shared} />;
    case 'professionals':
      return <GroupsOutlined {...shared} />;
    default:
      return <HomeOutlined {...shared} />;
  }
}

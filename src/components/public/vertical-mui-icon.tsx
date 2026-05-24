'use client';

import type { SvgIconProps } from '@mui/material/SvgIcon';

import type { HomeVerticalId } from '@/lib/home-categories';

import { HomeVerticalIcon } from './home-vertical-icon';

export interface VerticalMuiIconProps {
  verticalId: HomeVerticalId;
  fontSize?: SvgIconProps['fontSize'];
  sx?: SvgIconProps['sx'];
}

/** @deprecated Name kept for callers — renders {@link HomeVerticalIcon} (Phosphor bold). */
export function VerticalMuiIcon({ verticalId, fontSize = 'medium', sx }: VerticalMuiIconProps) {
  const sizeFromFontSize =
    typeof fontSize === 'number'
      ? fontSize
      : fontSize === 'small'
        ? 20
        : fontSize === 'large'
          ? 35
          : 24;

  const sizeFromSx =
    sx && typeof sx === 'object' && !Array.isArray(sx) && typeof sx.fontSize === 'number'
      ? sx.fontSize
      : undefined;

  return <HomeVerticalIcon verticalId={verticalId} size={sizeFromSx ?? sizeFromFontSize} />;
}

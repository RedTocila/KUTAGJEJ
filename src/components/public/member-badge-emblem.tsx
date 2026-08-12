'use client';

import * as React from 'react';
import { Box } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ChartLineUp as ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { CirclesThreePlus as CirclesThreePlusIcon } from '@phosphor-icons/react/dist/ssr/CirclesThreePlus';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { Crown as CrownIcon } from '@phosphor-icons/react/dist/ssr/Crown';
import { CurrencyCircleDollar as CurrencyCircleDollarIcon } from '@phosphor-icons/react/dist/ssr/CurrencyCircleDollar';
import { Handshake as HandshakeIcon } from '@phosphor-icons/react/dist/ssr/Handshake';
import { Lightning as LightningIcon } from '@phosphor-icons/react/dist/ssr/Lightning';
import { Megaphone as MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { Plant as PlantIcon } from '@phosphor-icons/react/dist/ssr/Plant';
import { RocketLaunch as RocketLaunchIcon } from '@phosphor-icons/react/dist/ssr/RocketLaunch';
import { SealCheck as SealCheckIcon } from '@phosphor-icons/react/dist/ssr/SealCheck';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { Trophy as TrophyIcon } from '@phosphor-icons/react/dist/ssr/Trophy';

export type BadgeShape = 'circle' | 'hexagon' | 'shield' | 'diamond' | 'octagon' | 'crest';

interface BadgeEmblemSpec {
  Icon: PhosphorIcon;
  shape: BadgeShape;
  fill: string;
  stroke: string;
  icon: string;
}

function spec(
  Icon: PhosphorIcon,
  shape: BadgeShape,
  fill: string,
  stroke: string,
  icon: string,
): BadgeEmblemSpec {
  return { Icon, shape, fill, stroke, icon };
}

export function getBadgeEmblemSpec(kind: string, level?: number): BadgeEmblemSpec {
  const lvl = Number(level) || 0;
  switch (kind) {
    case 'platform-dominator':
      return spec(CrownIcon, 'crest', '#6b2fd4', '#c9a227', '#ffe9a8');
    case 'trusted-reviewer':
      return spec(SealCheckIcon, 'shield', '#1e5ad4', '#8eb4ff', '#e8f0ff');
    case 'review-tier':
      if (lvl >= 100) return spec(TrophyIcon, 'circle', '#d4a017', '#ffe08a', '#2a1c04');
      if (lvl >= 35) return spec(SparkleIcon, 'hexagon', '#8a96aa', '#e8eef8', '#1a2030');
      return spec(StarIcon, 'circle', '#c47a3a', '#f0d0a8', '#2a1808');
    case 'network-builder':
      return spec(CirclesThreePlusIcon, 'hexagon', '#12965a', '#8affc8', '#e8fff4');
    case 'revenue-driver':
      return spec(CurrencyCircleDollarIcon, 'diamond', '#c02820', '#ffb0a0', '#fff0e8');
    case 'paid-tier':
      if (lvl >= 3) return spec(TrophyIcon, 'crest', '#c87810', '#ffd060', '#2a1804');
      if (lvl === 2) return spec(ChartLineUpIcon, 'shield', '#2a9a58', '#b8f0c8', '#062018');
      return spec(CoinsIcon, 'octagon', '#c88820', '#ffe08a', '#2a1808');
    case 'free-tier':
      if (lvl >= 5) return spec(LightningIcon, 'octagon', '#2aa8d4', '#c8f4ff', '#042030');
      if (lvl === 4) return spec(SparkleIcon, 'diamond', '#9a40c8', '#f0c8ff', '#fff4e0');
      if (lvl === 3) return spec(MegaphoneIcon, 'shield', '#2a62c8', '#b8d4ff', '#eef4ff');
      if (lvl === 2) return spec(RocketLaunchIcon, 'hexagon', '#d05020', '#ffc090', '#2a1008');
      return spec(PlantIcon, 'circle', '#4a8a20', '#c8e878', '#f4ffe8');
    default:
      return spec(HandshakeIcon, 'circle', '#6a7080', '#d0d4dc', '#f4f6f8');
  }
}

const SHAPE_PATH: Record<BadgeShape, string> = {
  circle:
    'M32 3.5 C47.7 3.5 60.5 16.3 60.5 32 C60.5 47.7 47.7 60.5 32 60.5 C16.3 60.5 3.5 47.7 3.5 32 C3.5 16.3 16.3 3.5 32 3.5 Z',
  hexagon: 'M32 4 L56.5 18 L56.5 46 L32 60 L7.5 46 L7.5 18 Z',
  shield: 'M32 4.5 L54 13.5 L54 33 C54 46 43 55 32 59.5 C21 55 10 46 10 33 L10 13.5 Z',
  diamond: 'M32 5 L59 32 L32 59 L5 32 Z',
  octagon: 'M23 5 L41 5 L59 23 L59 41 L41 59 L23 59 L5 41 L5 23 Z',
  crest: 'M32 4 L51.5 11 L54 28 C54 42.5 42 52 32 59 C22 52 10 42.5 10 28 L12.5 11 Z',
};

function MedalSvg({
  shape,
  fill,
  stroke,
  earned,
}: {
  shape: BadgeShape;
  fill: string;
  stroke: string;
  earned: boolean;
}) {
  const d = SHAPE_PATH[shape];
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden focusable="false">
      <path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={earned ? 2.4 : 1.8}
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke={earned ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.08)'}
        strokeWidth="1.1"
        transform="translate(32 32) scale(0.78) translate(-32 -32)"
      />
    </svg>
  );
}

export function MemberBadgeEmblem({
  kind,
  level,
  earned,
  size,
}: {
  kind: string;
  level?: number;
  earned: boolean;
  size: number;
}) {
  const emblem = getBadgeEmblemSpec(kind, level);
  const Icon = emblem.Icon;
  const iconSize = Math.round(size * (emblem.shape === 'diamond' || emblem.shape === 'crest' ? 0.38 : 0.42));
  const fill = earned ? emblem.fill : '#2a2e34';
  const stroke = earned ? emblem.stroke : '#5a6068';
  const iconColor = earned ? emblem.icon : '#8a9098';

  return (
    <Box
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <MedalSvg shape={emblem.shape} fill={fill} stroke={stroke} earned={earned} />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          color: iconColor,
          pointerEvents: 'none',
        }}
      >
        <Icon size={iconSize} weight={earned ? 'fill' : 'regular'} />
      </Box>
    </Box>
  );
}

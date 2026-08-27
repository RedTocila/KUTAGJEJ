'use client';

import * as React from 'react';
import { Box, type BoxProps } from '@mui/material';

export interface PlatformErrorIllustrationProps extends BoxProps {
  /** Optional status code badge displayed inside the illustration or subtle context. */
  statusCode?: string | number;
}

/**
 * Custom vector illustration tailored for KuTaGjej (search, discovery, map pin, marketplace).
 * Adapts dynamically to light and dark theme modes using brand colors and CSS variables.
 */
export function PlatformErrorIllustration({
  statusCode = '404',
  sx,
  ...rest
}: PlatformErrorIllustrationProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 340,
        mx: 'auto',
        ...sx,
      }}
      {...rest}
    >
      <svg
        viewBox="0 0 340 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        aria-hidden="true"
      >
        <defs>
          {/* Brand Gradients */}
          <linearGradient id="kg-lime-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c0ff3e" />
            <stop offset="50%" stopColor="#82c91e" />
            <stop offset="100%" stopColor="#5f9816" />
          </linearGradient>

          <linearGradient id="kg-pin-grad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#a6e22e" />
            <stop offset="60%" stopColor="#82c91e" />
            <stop offset="100%" stopColor="#2b540a" />
          </linearGradient>

          <linearGradient id="kg-lens-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#a6e22e" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="kg-puddle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#142a0a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#081404" stopOpacity="0.95" />
          </linearGradient>

          <radialGradient id="kg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#82c91e" stopOpacity="0.28" />
            <stop offset="70%" stopColor="#82c91e" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#82c91e" stopOpacity="0" />
          </radialGradient>

          <filter id="kg-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#081404" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Ambient Glow Background */}
        <circle cx="170" cy="130" r="95" fill="url(#kg-glow)" />

        {/* Radar / Search Range Circles */}
        <ellipse
          cx="170"
          cy="158"
          rx="125"
          ry="44"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <ellipse
          cx="170"
          cy="158"
          rx="85"
          ry="30"
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1.5"
        />

        {/* Organic Base / Puddle Surface (echoing the spilled base in reference) */}
        <path
          d="M68 162C58 174 72 188 95 186C120 184 142 195 180 194C225 193 274 186 282 170C289 156 260 148 226 148C185 148 162 142 130 146C96 150 78 150 68 162Z"
          fill="url(#kg-puddle-grad)"
          style={{
            fill: 'var(--mui-palette-mode, dark) === "light" ? "rgba(35, 56, 20, 0.16)" : undefined',
          }}
          opacity="0.85"
        />

        {/* Folded Map / Paper Ground Grid */}
        <g filter="url(#kg-soft-shadow)">
          <polygon
            points="105,152 165,134 225,152 165,172"
            fill="#ffffff"
            fillOpacity="0.06"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line
            x1="165"
            y1="134"
            x2="165"
            y2="172"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="1.5"
          />
          <line
            x1="135"
            y1="143"
            x2="195"
            y2="162"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        </g>

        {/* Tilted / Resting KuTaGjej Location Pin (Searching / Lost state) */}
        <g transform="translate(198, 142) rotate(32)" filter="url(#kg-soft-shadow)">
          {/* Pin Body */}
          <path
            d="M0 0C-18 -18 -18 -44 0 -62C18 -44 18 -18 0 0Z"
            fill="url(#kg-pin-grad)"
            stroke="#1a4301"
            strokeWidth="2"
          />
          {/* Pin Center Hole */}
          <circle cx="0" cy="-38" r="9" fill="#081404" />
          <circle cx="0" cy="-38" r="5" fill="#c0ff3e" opacity="0.9" />
          {/* Pin Highlight Specular */}
          <path
            d="M-8 -48C-12 -42 -12 -34 -8 -28"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Stylized Magnifying Glass scanning for items */}
        <g transform="translate(125, 120) rotate(-18)" filter="url(#kg-soft-shadow)">
          {/* Handle */}
          <rect
            x="-6"
            y="42"
            width="12"
            height="38"
            rx="6"
            fill="#2b540a"
            stroke="#1a4301"
            strokeWidth="2"
          />
          <rect x="-3" y="46" width="6" height="28" rx="3" fill="#82c91e" opacity="0.7" />

          {/* Rim Outer */}
          <circle
            cx="0"
            cy="0"
            r="44"
            fill="url(#kg-lens-grad)"
            stroke="url(#kg-lime-grad)"
            strokeWidth="6"
          />

          {/* Rim Inner Accent */}
          <circle
            cx="0"
            cy="0"
            r="41"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />

          {/* Lens Glass Glare */}
          <path
            d="M-26 -20C-18 -32 2 -36 18 -30"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d="M-30 -8C-28 -14 -22 -22 -14 -26"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Mini Search Target / Compass Inside Lens */}
          <circle cx="6" cy="4" r="10" stroke="#c0ff3e" strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="6" y1="-8" x2="6" y2="16" stroke="#c0ff3e" strokeWidth="1.5" strokeOpacity="0.8" />
          <line x1="-6" y1="4" x2="18" y2="4" stroke="#c0ff3e" strokeWidth="1.5" strokeOpacity="0.8" />
          <circle cx="6" cy="4" r="3" fill="#c0ff3e" />
        </g>

        {/* Marketplace Package / Parcel (Floating item) */}
        <g transform="translate(62, 112) rotate(-12)" filter="url(#kg-soft-shadow)">
          <rect
            x="0"
            y="0"
            width="32"
            height="26"
            rx="4"
            fill="#16340e"
            stroke="#82c91e"
            strokeWidth="2"
          />
          {/* Ribbon */}
          <line x1="16" y1="0" x2="16" y2="26" stroke="#c0ff3e" strokeWidth="3" />
          <line x1="0" y1="13" x2="32" y2="13" stroke="#c0ff3e" strokeWidth="3" />
          {/* Bow */}
          <circle cx="16" cy="0" r="3" fill="#c0ff3e" />
        </g>

        {/* Decorative Sparkles / Floating Stars (KuTaGjej Discovery) */}
        {/* Top Right Sparkle */}
        <g transform="translate(254, 76)">
          <path
            d="M0 -10 Q0 0 10 0 Q0 0 0 10 Q0 0 -10 0 Q0 0 0 -10Z"
            fill="#ffd049"
          />
          <circle cx="0" cy="0" r="2" fill="#ffffff" />
        </g>

        {/* Top Left Sparkle */}
        <g transform="translate(86, 72) scale(0.7)">
          <path
            d="M0 -10 Q0 0 10 0 Q0 0 0 10 Q0 0 -10 0 Q0 0 0 -10Z"
            fill="#c0ff3e"
          />
        </g>

        {/* Middle Right Small Sparkle */}
        <g transform="translate(276, 128) scale(0.55)">
          <path
            d="M0 -10 Q0 0 10 0 Q0 0 0 10 Q0 0 -10 0 Q0 0 0 -10Z"
            fill="#82c91e"
          />
        </g>

        {/* Small floating dots */}
        <circle cx="102" cy="54" r="2" fill="#82c91e" opacity="0.6" />
        <circle cx="236" cy="50" r="2.5" fill="#c0ff3e" opacity="0.7" />
        <circle cx="270" cy="98" r="1.5" fill="#ffd049" opacity="0.8" />
      </svg>
    </Box>
  );
}

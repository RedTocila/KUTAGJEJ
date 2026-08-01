'use client';

import * as React from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { Coins as CoinsIcon } from '@phosphor-icons/react/dist/ssr/Coins';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

type ExtraSection = {
  id: string;
  title: string;
  badge?: string;
  icon: PhosphorIcon;
  items: ExtraItem[];
};

type ExtraItem =
  | { kind: 'priced'; label: string; priceEur: number }
  | { kind: 'dual'; label: string; priceBc: number; priceEur: number }
  | { kind: 'rate'; label: string; priceBc: number };

const EXTRA_SECTIONS: ExtraSection[] = [
  {
    id: 'auto-refresh',
    title: 'AUTO-REFRESH',
    icon: ArrowClockwiseIcon,
    items: [
      { kind: 'priced', label: '0/10 Listings Auto-Refresh', priceEur: 14.9 },
      { kind: 'priced', label: '0/20 Listings Auto-Refresh', priceEur: 24.9 },
    ],
  },
  {
    id: 'premium',
    title: 'PREMIUM LISTING',
    badge: 'BC150',
    icon: SparkleIcon,
    items: [
      { kind: 'dual', label: '5 Days Premium Listing', priceBc: 100, priceEur: 9 },
      { kind: 'dual', label: '15 Days Premium Listing', priceBc: 200, priceEur: 18 },
      { kind: 'dual', label: '30 Days Premium Listing', priceBc: 300, priceEur: 27 },
    ],
  },
  {
    id: 'convert',
    title: 'CONVERT LISTING',
    badge: 'BOOST COINS',
    icon: CoinsIcon,
    items: [
      { kind: 'rate', label: '1 Car', priceBc: 2 },
      { kind: 'rate', label: '1 Product', priceBc: 2 },
      { kind: 'rate', label: '1 Apartment', priceBc: 0.5 },
      { kind: 'rate', label: '1 Job Listing', priceBc: 0.5 },
    ],
  },
];

function formatEur(n: number) {
  return `€${n.toFixed(2).replace(/\.00$/, '')}`;
}

function formatBc(n: number) {
  return Number.isInteger(n) ? String(n) : String(n);
}

function PriceLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      component="span"
      sx={{
        fontWeight: 800,
        fontSize: '0.95rem',
        whiteSpace: 'nowrap',
        color: 'text.primary',
      }}
    >
      {children}
    </Typography>
  );
}

function ExtraItemRow({ item }: { item: ExtraItem }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        py: 1.25,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, flex: '1 1 160px' }}>
        {item.label}
      </Typography>
      {item.kind === 'priced' ? (
        <PriceLabel>{formatEur(item.priceEur)}</PriceLabel>
      ) : null}
      {item.kind === 'dual' ? (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            size="small"
            label={`BC${formatBc(item.priceBc)}`}
            sx={{ fontWeight: 700, bgcolor: (t) => `${t.palette.warning.main}18` }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            or
          </Typography>
          <PriceLabel>{formatEur(item.priceEur)}</PriceLabel>
        </Stack>
      ) : null}
      {item.kind === 'rate' ? (
        <PriceLabel>
          = BC {formatBc(item.priceBc)}
        </PriceLabel>
      ) : null}
    </Stack>
  );
}

export function ExtraPackagesPanel() {
  return (
    <Stack spacing={2}>
      {EXTRA_SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <Box
            key={section.id}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 1.5,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  bgcolor: (t) => `${t.palette.primary.main}18`,
                  color: 'primary.main',
                }}
              >
                {React.createElement(Icon, { size: 20, weight: 'duotone' })}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: 0.4 }}>
                    {section.title}
                  </Typography>
                  {section.badge ? (
                    <Chip
                      size="small"
                      label={section.badge}
                      color={section.id === 'premium' || section.id === 'convert' ? 'warning' : 'default'}
                      sx={{ fontWeight: 700, height: 22 }}
                    />
                  ) : null}
                </Stack>
              </Box>
            </Stack>

            <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
              {section.items.map((item) => (
                <ExtraItemRow key={item.label} item={item} />
              ))}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

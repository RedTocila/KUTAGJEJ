'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';

import type { HomeVerticalId } from '@/lib/home-categories';
import { HOME_SUBCATEGORIES } from '@/lib/home-subcategories';
import { ProductTag } from '@/components/public/product-browse-chrome';

const PRIMARY_FILTER_KEY: Record<HomeVerticalId, string> = {
  'real-estate': 'cat',
  cars: 'type',
  jobs: 'industry',
  marketplace: 'cat',
  businesses: 'type',
  professionals: 'type',
};

const SECTION_TITLE: Record<HomeVerticalId, string> = {
  'real-estate': 'Lloji i pronës',
  cars: 'Lloji i mjetit',
  jobs: 'Industria',
  marketplace: 'Kategoria',
  businesses: 'Lloji i biznesit',
  professionals: 'Lloji i shërbimit',
};

function valueFromHref(href: string): string {
  const [, query = ''] = href.split('?');
  if (!query) return '';
  const params = new URLSearchParams(query);
  return params.values().next().value ?? '';
}

export function FilterQuickPicks({
  verticalId,
  selectedValue,
  onSelect,
}: {
  verticalId: HomeVerticalId;
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const items = HOME_SUBCATEGORIES[verticalId];
  if (!items?.length) return null;

  return (
    <Box>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          fontSize: '0.68rem',
        }}
      >
        {SECTION_TITLE[verticalId]}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.75,
        }}
      >
        {items.map((item) => {
          const value = valueFromHref(item.href);
          const active = value ? selectedValue === value : !selectedValue;
          return (
            <ProductTag
              key={item.href}
              label={item.label}
              icon={item.Icon}
              active={active}
              onClick={() => onSelect(active && value ? '' : value)}
            />
          );
        })}
      </Box>
    </Box>
  );
}

export function getPrimaryFilterKey(verticalId: HomeVerticalId): string {
  return PRIMARY_FILTER_KEY[verticalId];
}

export function getPrimaryFilterValue(verticalId: HomeVerticalId, draft: Record<string, string | undefined>): string {
  const key = PRIMARY_FILTER_KEY[verticalId];
  return String(draft[key] ?? '');
}

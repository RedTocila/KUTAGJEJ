'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';

import type { HomeVerticalId } from '@/lib/home-categories';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { HOME_SUBCATEGORIES } from '@/lib/home-subcategories';

const PRIMARY_FILTER_KEY: Record<HomeVerticalId, string> = {
  'real-estate': 'cat',
  cars: 'fuel',
  jobs: 'industry',
  marketplace: 'cat',
  businesses: 'type',
  professionals: 'type',
};

const SECTION_TITLE: Record<HomeVerticalId, string> = {
  'real-estate': 'Lloji i pronës',
  cars: 'Karburanti',
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
          const Icon = item.Icon;
          return (
            <Box
              key={item.href}
              component="button"
              type="button"
              onClick={() => onSelect(active && value ? '' : value)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.65,
                px: 1.15,
                py: 0.65,
                borderRadius: 999,
                border: '1px solid',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? primaryMainAlpha(0.12) : 'background.paper',
                color: active ? 'primary.main' : 'text.primary',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: primaryMainAlpha(0.08),
                },
              }}
            >
              <Icon size={15} weight="duotone" />
              {item.label}
            </Box>
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

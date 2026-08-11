'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';

import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import type { HomeVerticalId } from '@/lib/home-categories';
import { localizeSubcategories } from '@/lib/home-subcategories';
import { ProductTag } from '@/components/public/product-browse-chrome';

const PRIMARY_FILTER_KEY: Record<HomeVerticalId, string> = {
  'real-estate': 'cat',
  cars: 'type',
  jobs: 'industry',
  marketplace: 'cat',
  businesses: 'type',
  professionals: 'type',
};

const SECTION_TITLE_KEY: Record<HomeVerticalId, 'propertyType' | 'vehicleType' | 'industry' | 'category' | 'businessType' | 'serviceType'> = {
  'real-estate': 'propertyType',
  cars: 'vehicleType',
  jobs: 'industry',
  marketplace: 'category',
  businesses: 'businessType',
  professionals: 'serviceType',
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
  const t = useCopy();
  const { language } = useLanguage();
  const items = localizeSubcategories(verticalId, language);
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
        {t.browse[SECTION_TITLE_KEY[verticalId]]}
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

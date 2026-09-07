'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';

import { MarketplaceCategoryIcon } from '@/components/public/home-vertical-icon';
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

const SECTION_ICON: Record<HomeVerticalId, PhosphorIcon> = {
  'real-estate': HouseIcon,
  cars: CarIcon,
  jobs: BriefcaseIcon,
  marketplace: MarketplaceCategoryIcon,
  businesses: StorefrontIcon,
  professionals: WrenchIcon,
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

  const SectionIcon = SECTION_ICON[verticalId];

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', color: 'primary.main', flexShrink: 0 }}>
          <SectionIcon size={14} weight="duotone" />
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            fontSize: '0.7rem',
          }}
        >
          {t.browse[SECTION_TITLE_KEY[verticalId]]}
        </Typography>
      </Stack>
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

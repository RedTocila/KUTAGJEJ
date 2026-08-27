'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Grid, IconButton, Stack, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';

import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { localizeHomeVerticals, type HomeVerticalId } from '@/lib/home-categories';
import { AddListingPickerDialog } from '@/components/user/add-listing-picker-dialog';

import { VerticalIcon } from './vertical-icon';

export interface CategoryTilesProps {
  totals?: Partial<Record<HomeVerticalId, number>>;
}

export function CategoryTiles({ totals }: CategoryTilesProps) {
  const { language } = useLanguage();
  const t = useCopy();
  const verticals = React.useMemo(() => localizeHomeVerticals(language), [language]);
  const [activeVertical, setActiveVertical] = React.useState<HomeVerticalId | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  return (
    <>
      <Grid container spacing={{ xs: 1.25, md: 2 }}>
        {verticals.map((vertical) => {
          const total = totals?.[vertical.id] ?? 0;
          return (
            <Grid key={vertical.id} size={{ xs: 6, md: 3 }}>
              <Box
                component={RouterLink}
                href={vertical.href}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: { xs: 1.5, sm: 2 },
                  py: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: primaryMainAlpha(0.04),
                    '& .category-tile-add-btn': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                    },
                  },
                }}
              >
                <VerticalIcon verticalId={vertical.id} size={46} decorative />
                <Stack spacing={0.1} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.25, color: 'text.primary' }}
                    noWrap
                  >
                    {vertical.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {total > 0 ? t.browse.listingsCount(total) : t.browse.noListingsYet}
                  </Typography>
                </Stack>
                <IconButton
                  className="category-tile-add-btn"
                  size="small"
                  aria-label={`${t.picker.title} · ${vertical.label}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveVertical(vertical.id);
                    setPickerOpen(true);
                  }}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                      color: 'primary.contrastText',
                      transform: 'scale(1.1)',
                    },
                    '&:active': { transform: 'scale(0.92)' },
                  }}
                >
                  <PlusIcon size={16} weight="bold" />
                </IconButton>
              </Box>
            </Grid>
          );
        })}
      </Grid>
      <AddListingPickerDialog
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setActiveVertical(null);
        }}
        category={activeVertical ? (activeVertical === 'jobs' ? 'job-listings' : activeVertical) : null}
      />
    </>
  );
}

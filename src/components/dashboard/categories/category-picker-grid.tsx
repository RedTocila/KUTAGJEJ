'use client';

import * as React from 'react';
import {
  alpha,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Typography,
  useTheme,
} from '@mui/material';

import { CATEGORY_VISUAL, TAB_ORDER } from '@/components/dashboard/categories/category-config';
import type { ListingCategory } from '@/types/listing-category';

export interface CategoryPickerGridProps {
  categories: ListingCategory[];
  loading: boolean;
  selectedTab: number;
  onSelectTab: (index: number) => void;
}

export function CategoryPickerGrid({ categories, loading, selectedTab, onSelectTab }: CategoryPickerGridProps) {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
        Zgjidh vertikalin
      </Typography>
      <Grid container spacing={2}>
        {TAB_ORDER.map((key, i) => {
          const c = categories.find((x) => x.key === key);
          const label = c?.title ?? (key === 'real-estate' ? 'Pasuri' : key);
          const slugPreview = c?.slug ? `/${c.slug}` : '—';
          const count = c?.listingTypes?.length ?? 0;
          const { Icon, accent } = CATEGORY_VISUAL[key];
          const selected = selectedTab === i;
          const accentColor = theme.palette[accent].main;

          return (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={key}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '2px solid',
                  borderColor: selected ? accentColor : 'divider',
                  borderRadius: 2,
                  bgcolor: selected ? alpha(accentColor, theme.palette.mode === 'dark' ? 0.12 : 0.06) : 'background.paper',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
                  boxShadow: selected ? `0 8px 24px ${alpha(accentColor, 0.2)}` : 'none',
                  '&:hover': {
                    borderColor: selected ? accentColor : alpha(accentColor, 0.45),
                  },
                }}
              >
                <CardActionArea
                  onClick={() => onSelectTab(i)}
                  sx={{ height: '100%', alignItems: 'stretch', display: 'block', p: 0 }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(accentColor, 0.18),
                          color: accentColor,
                        }}
                      >
                        {React.createElement(Icon, { size: 26, weight: 'duotone' })}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                          {loading ? <Skeleton width={120} /> : label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.5, fontFamily: 'monospace' }}
                        >
                          {loading ? <Skeleton width={80} /> : slugPreview}
                        </Typography>
                        <Chip
                          size="small"
                          label={loading ? '…' : `${count} lloje`}
                          sx={{
                            mt: 1.5,
                            height: 24,
                            fontWeight: 600,
                            bgcolor: alpha(accentColor, 0.12),
                            color: accentColor,
                            border: 'none',
                          }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

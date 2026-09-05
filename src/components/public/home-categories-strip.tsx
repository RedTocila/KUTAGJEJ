'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';

import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import {
  OKAZION_ACCENT,
  localizeHomeBrowseCategories,
} from '@/lib/home-categories';
import { paths } from '@/paths';
import { MOTION } from '@/styles/motion';

import { HomeVerticalIcon } from './home-vertical-icon';
import { productChromeSubtleBg } from './product-browse-chrome';

export function HomeCategoriesStrip() {
  const { language } = useLanguage();
  const t = useCopy();
  const verticals = React.useMemo(() => localizeHomeBrowseCategories(language), [language]);

  return (
    <Box
      component="section"
      aria-labelledby="home-categories-title"
      sx={{ display: { xs: 'none', md: 'block' }, py: 3 }}
    >
      <Container maxWidth="xl" sx={{ px: { md: 3, lg: 4 } }}>
        <Stack direction="row" sx={{ mb: 2.5, alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography
            id="home-categories-title"
            component="h2"
            sx={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.02em' }}
          >
            {t.home.browseByCategory}
          </Typography>
          <Button
            component={RouterLink}
            href={paths.public.search}
            size="small"
            endIcon={<ArrowForward sx={{ fontSize: 18 }} />}
            sx={{ textTransform: 'none', fontWeight: 700, color: 'primary.main' }}
          >
            {t.common.browseAll}
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {verticals.map((v) => {
            const isOkazion = v.id === 'okazion';
            const accent = isOkazion ? OKAZION_ACCENT : 'primary.main';
            return (
            <Grid key={v.id} size={{ xs: 12, sm: 6, md: 4, lg: 'grow' }}>
              <Stack
                component="a"
                href={v.href}
                spacing={1.75}
                direction="row"
                sx={{
                  height: '100%',
                  p: 2,
                  borderRadius: 3,
                  textDecoration: 'none',
                  color: 'inherit',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: `transform ${MOTION.release} ${MOTION.ease}, border-color ${MOTION.fast} ${MOTION.ease}, box-shadow ${MOTION.fast} ${MOTION.ease}, background-color ${MOTION.fast} ease`,
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                  '&:hover': {
                    borderColor: accent,
                    transform: 'translateY(-3px)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark'
                        ? '0 10px 24px rgba(0,0,0,0.28)'
                        : '0 10px 24px rgba(15, 23, 10, 0.08)',
                  },
                  '&:active': {
                    transform: 'scale(0.985)',
                    transitionDuration: MOTION.press,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    color: isOkazion ? OKAZION_ACCENT : 'primary.main',
                    bgcolor: productChromeSubtleBg,
                    transition: `background-color ${MOTION.fast} ${MOTION.ease}`,
                  }}
                >
                  <HomeVerticalIcon
                    verticalId={v.id}
                    size={32}
                    color={isOkazion ? OKAZION_ACCENT : 'var(--mui-palette-primary-main)'}
                  />
                </Box>
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: '1rem',
                    }}
                  >
                    {v.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4, fontWeight: 500 }}>
                    {v.tagline}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}

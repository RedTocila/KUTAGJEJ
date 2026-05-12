'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import ArrowForward from '@mui/icons-material/ArrowForward';
import DirectionsCarOutlined from '@mui/icons-material/DirectionsCarOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import Work from '@mui/icons-material/Work';
import { Box, Button, Container, Stack, Typography } from '@mui/material';

import type { HomeBannerDto } from '@/lib/home-banners-client';
import { paths } from '@/paths';

const FALLBACK_HERO_IMAGE =
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=2000&q=80';

export interface HomeDesktopHeroStats {
  realEstate: number;
  cars: number;
  jobs: number;
}

export interface HomeDesktopHeroProps {
  banners: HomeBannerDto[];
  stats: HomeDesktopHeroStats;
}

export function HomeDesktopHero({ banners, stats }: HomeDesktopHeroProps) {
  const primaryBanner = banners[0];
  const bgImage =
    primaryBanner?.imageUrl && /^https?:\/\//i.test(primaryBanner.imageUrl)
      ? primaryBanner.imageUrl
      : FALLBACK_HERO_IMAGE;

  const ctaHref = primaryBanner?.ctaHref || paths.user.realEstateListing;
  const ctaLabel = primaryBanner?.ctaLabel || 'Posto tani';

  return (
    <Box
      component="section"
      aria-labelledby="home-desktop-hero-title"
      sx={{ display: { xs: 'none', md: 'block' }, pt: 3, pb: 2 }}
    >
      <Container maxWidth="xl" disableGutters sx={{ px: { md: 3, lg: 4 } }}>
        <Box
          sx={{
            position: 'relative',
            borderRadius: 4,
            overflow: 'hidden',
            minHeight: { md: 420, lg: 460 },
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(105deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 42%, rgba(0,0,0,0.2) 100%)',
            }}
          />

          <Stack
            spacing={2.5}
            sx={{
              position: 'relative',
              zIndex: 1,
              p: { md: 5, lg: 6 },
              maxWidth: 560,
              minHeight: { md: 420, lg: 460 },
              justifyContent: 'center',
            }}
          >
            <Typography id="home-desktop-hero-title" component="h1" sx={{ m: 0 }}>
              <Box component="span" sx={{ display: 'block', fontWeight: 800, fontSize: '2.65rem', color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                Gjej më shpejt.
              </Box>
              <Box
                component="span"
                sx={{
                  display: 'block',
                  fontWeight: 800,
                  fontSize: '2.65rem',
                  lineHeight: 1.1,
                  letterSpacing: '-0.03em',
                  color: 'primary.main',
                  mt: 0.5,
                }}
              >
                Jeto më mirë.
              </Box>
            </Typography>

            <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.55, maxWidth: 440 }}>
              Mijëra njoftime, gjithçka në një vend të vetëm.
            </Typography>

            <Box>
              <Button
                component={RouterLink}
                href={ctaHref}
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: 3,
                  px: 3,
                  py: 1.4,
                  fontSize: '1rem',
                  boxShadow: '0 10px 28px -8px rgba(var(--mui-palette-primary-mainChannel) / 0.65)',
                }}
              >
                {ctaLabel}
              </Button>
            </Box>

            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap', rowGap: 2, pt: 1 }}>
              <Stat icon={HomeOutlined} value={stats.realEstate} label="Prona" />
              <Stat icon={DirectionsCarOutlined} value={stats.cars} label="Makina" />
              <Stat icon={Work} value={stats.jobs} label="Punë" />
            </Stack>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

function Stat({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>
        <Icon sx={{ fontSize: 28 }} />
      </Box>
      <Stack spacing={0.25}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.35rem', color: '#fff', lineHeight: 1 }}>
          {value > 0 ? value.toLocaleString('en-GB') : '—'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
          {label}
        </Typography>
      </Stack>
    </Stack>
  );
}

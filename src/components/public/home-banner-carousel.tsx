'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { alpha, Box, Button, Stack, Typography } from '@mui/material';
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';

import type { HomeBannerDto } from '@/lib/home-banners-client';

export interface HomeBannerCarouselProps {
  banners?: HomeBannerDto[];
}

export function HomeBannerCarousel({ banners = [] }: HomeBannerCarouselProps) {
  const slides = banners.length > 0 ? banners.slice(0, 3) : FALLBACK_BANNERS;
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const safeIdx = slides.length > 0 ? idx % slides.length : 0;
  const active = slides[safeIdx] ?? FALLBACK_BANNERS[0];
  const visual = VISUALS[safeIdx % VISUALS.length];

  return (
    <Box component="section" aria-label="Banner kryesor" sx={{ width: '100%' }}>
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: 3, md: 4 },
          overflow: 'hidden',
          minHeight: { xs: 210, md: 290 },
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          backgroundImage: visual.bg,
          '@keyframes particleFloat': {
            '0%': { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 0.2 },
            '50%': { transform: 'translate3d(10px, -22px, 0) scale(1.2)', opacity: 0.75 },
            '100%': { transform: 'translate3d(-8px, -45px, 0) scale(0.95)', opacity: 0.1 },
          },
          '@keyframes pulseGlow': {
            '0%,100%': { opacity: 0.36 },
            '50%': { opacity: 0.66 },
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 34%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.14), transparent 32%)',
            animation: 'pulseGlow 4.8s ease-in-out infinite',
          }}
        />
        {PARTICLES.map((p, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              bgcolor: p.color,
              filter: 'blur(0.4px)',
              animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        ))}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: (theme) =>
              `linear-gradient(95deg, ${alpha(theme.palette.common.black, 0.58)} 0%, ${alpha(theme.palette.common.black, 0.24)} 52%, ${alpha(theme.palette.common.black, 0.14)} 100%)`,
          }}
        />

        <Stack
          spacing={1.4}
          sx={{
            position: 'relative',
            zIndex: 1,
            color: 'common.white',
            p: { xs: 2.2, sm: 2.8, md: 3.8 },
            maxWidth: { xs: '100%', md: '62%' },
          }}
        >
          <Typography component="h2" sx={{ fontWeight: 900, fontSize: { xs: '1.25rem', md: '2.05rem' }, lineHeight: 1.12 }}>
            {active.title}
          </Typography>
          {active.subtitle ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.92)', fontSize: { xs: '0.94rem', md: '1.05rem' } }}>
              {active.subtitle}
            </Typography>
          ) : null}
          {active.ctaLabel && active.ctaHref ? (
            <Box>
              <Button
                component={RouterLink}
                href={active.ctaHref}
                variant="contained"
                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 99, px: 3, py: 1.1 }}
              >
                {active.ctaLabel}
              </Button>
            </Box>
          ) : null}
        </Stack>

        {slides.length > 1 ? (
          <>
            <Button
              aria-label="Banner i mëparshëm"
              onClick={() => setIdx((prev) => (prev - 1 + slides.length) % slides.length)}
              sx={{
                minWidth: 0,
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.58)',
                color: 'white',
                p: 0,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.24)',
                backdropFilter: 'blur(6px)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.72)' },
              }}
            >
              <CaretLeftIcon size={24} weight="fill" />
            </Button>
            <Button
              aria-label="Banner i ardhshëm"
              onClick={() => setIdx((prev) => (prev + 1) % slides.length)}
              sx={{
                minWidth: 0,
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: 'rgba(0,0,0,0.58)',
                color: 'white',
                p: 0,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.24)',
                backdropFilter: 'blur(6px)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.72)' },
              }}
            >
              <CaretRightIcon size={24} weight="fill" />
            </Button>
            <Stack
              direction="row"
              spacing={0.8}
              sx={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 2 }}
            >
              {slides.map((_, i) => (
                <Box
                  key={i}
                  onClick={() => setIdx(i)}
                  sx={{
                    width: i === safeIdx ? 20 : 8,
                    height: 8,
                    borderRadius: 99,
                    bgcolor: i === safeIdx ? 'white' : 'rgba(255,255,255,0.45)',
                    cursor: 'pointer',
                    transition: 'all .2s ease',
                  }}
                />
              ))}
            </Stack>
          </>
        ) : null}
      </Box>
    </Box>
  );
}

const FALLBACK_BANNERS: HomeBannerDto[] = [
  {
    id: 'fallback-1',
    title: 'Posto njoftime falas në KuTaGjej',
    subtitle: 'Prona, makina, punë dhe tregu - të gjitha në një vend modern.',
    imageUrl: '',
    ctaLabel: 'Posto tani',
    ctaHref: '/user/dashboard/prona',
    order: 1,
  },
  {
    id: 'fallback-2',
    title: 'Eksploro mijëra njoftime çdo ditë',
    subtitle: 'Kërko sipas kategorisë dhe gjej saktësisht atë që të duhet.',
    imageUrl: '',
    ctaLabel: 'Shiko njoftimet',
    ctaHref: '/prona',
    order: 2,
  },
  {
    id: 'fallback-3',
    title: 'Gjithçka në një platformë të vetme',
    subtitle: 'Dizajn i pastër, shpejtësi e lartë dhe eksperiencë e thjeshtë.',
    imageUrl: '',
    ctaLabel: 'Fillo tani',
    ctaHref: '/makina',
    order: 3,
  },
];

const VISUALS = [
  {
    bg: 'radial-gradient(1200px 380px at 8% 12%, #8DFF2A 0%, transparent 45%), linear-gradient(135deg, #285d00 0%, #3a8c00 46%, #75be14 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 95% 10%, #7dd3fc 0%, transparent 42%), linear-gradient(135deg, #0b2f6d 0%, #1748a8 45%, #2563eb 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 15% 85%, #fef08a 0%, transparent 42%), linear-gradient(135deg, #6a11cb 0%, #8b2cf5 48%, #b270ff 100%)',
  },
] as const;

const PARTICLES = [
  { left: 8, top: 72, size: 4, duration: 6.2, delay: 0, color: 'rgba(255,255,255,0.56)' },
  { left: 14, top: 40, size: 6, duration: 8, delay: 0.5, color: 'rgba(255,255,255,0.4)' },
  { left: 27, top: 80, size: 5, duration: 7.4, delay: 1.1, color: 'rgba(255,255,255,0.52)' },
  { left: 35, top: 34, size: 4, duration: 6.8, delay: 0.3, color: 'rgba(255,255,255,0.46)' },
  { left: 52, top: 75, size: 6, duration: 8.2, delay: 1.4, color: 'rgba(255,255,255,0.38)' },
  { left: 64, top: 32, size: 5, duration: 6.5, delay: 0.8, color: 'rgba(255,255,255,0.5)' },
  { left: 74, top: 78, size: 4, duration: 7.8, delay: 1.7, color: 'rgba(255,255,255,0.44)' },
  { left: 85, top: 45, size: 5, duration: 8.4, delay: 0.2, color: 'rgba(255,255,255,0.42)' },
  { left: 92, top: 70, size: 4, duration: 7.1, delay: 1, color: 'rgba(255,255,255,0.48)' },
] as const;

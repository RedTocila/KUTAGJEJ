'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';

import type { HomeBannerDto } from '@/lib/home-banners-client';

export interface HomeBannerCarouselProps {
  banners?: HomeBannerDto[];
}

const SLIDE_MS = 480;
const SWIPE_THRESHOLD = 48;

function resolveSlides(banners: HomeBannerDto[]): HomeBannerDto[] {
  const fromApi = banners.slice(0, 3);
  if (fromApi.length >= 2) return fromApi;
  if (fromApi.length === 1) {
    const extra = FALLBACK_BANNERS.find((b) => b.title !== fromApi[0].title) ?? FALLBACK_BANNERS[1];
    return [fromApi[0], { ...extra, id: `pad-${extra.id}` }];
  }
  return FALLBACK_BANNERS.slice(0, 2);
}

function BannerSlidePanel({ slide, visualIndex }: { slide: HomeBannerDto; visualIndex: number }) {
  const visual = VISUALS[visualIndex % VISUALS.length];

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: { xs: 210, md: 290 },
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
          background:
            'linear-gradient(95deg, rgba(0, 0, 0, 0.58) 0%, rgba(0, 0, 0, 0.24) 52%, rgba(0, 0, 0, 0.14) 100%)',
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
        <Typography
          component="h2"
          sx={{ fontWeight: 900, fontSize: { xs: '1.25rem', md: '2.05rem' }, lineHeight: 1.12 }}
        >
          {slide.title}
        </Typography>
        {slide.subtitle ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.92)', fontSize: { xs: '0.94rem', md: '1.05rem' } }}>
            {slide.subtitle}
          </Typography>
        ) : null}
        {slide.ctaLabel && slide.ctaHref ? (
          <Box>
            <Button
              component={RouterLink}
              href={slide.ctaHref}
              variant="contained"
              sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 99, px: 3, py: 1.1 }}
            >
              {slide.ctaLabel}
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

export function HomeBannerCarousel({ banners = [] }: HomeBannerCarouselProps) {
  const slides = React.useMemo(() => resolveSlides(banners), [banners]);
  const [idx, setIdx] = React.useState(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const startAutoPlay = React.useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (slides.length < 2) return;
    timerRef.current = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % slides.length);
    }, 5000);
  }, [slides.length]);

  React.useEffect(() => {
    startAutoPlay();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [startAutoPlay]);

  const goToSlide = React.useCallback(
    (next: number) => {
      setIdx(((next % slides.length) + slides.length) % slides.length);
      startAutoPlay();
    },
    [slides.length, startAutoPlay],
  );

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (touchStartX.current == null || slides.length < 2) return;
    const currentX = event.touches[0]?.clientX;
    if (currentX == null) return;
    setDragOffset(currentX - touchStartX.current);
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX != null) {
      const delta = endX - touchStartX.current;
      if (delta <= -SWIPE_THRESHOLD) {
        goToSlide(idx + 1);
      } else if (delta >= SWIPE_THRESHOLD) {
        goToSlide(idx - 1);
      }
    }
    touchStartX.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleTouchCancel = () => {
    touchStartX.current = null;
    setDragOffset(0);
    setIsDragging(false);
  };

  const safeIdx = slides.length > 0 ? idx % slides.length : 0;
  const slideBasis = slides.length > 0 ? 100 / slides.length : 100;

  return (
    <Box component="section" aria-label="Banner kryesor" sx={{ width: '100%' }}>
      <Stack spacing={1.25} sx={{ width: '100%' }}>
        <Box
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          sx={{
            position: 'relative',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            touchAction: 'pan-y',
            cursor: slides.length > 1 ? 'grab' : undefined,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              width: `${slides.length * 100}%`,
              transform: `translate3d(calc(-${safeIdx * slideBasis}% + ${dragOffset}px), 0, 0)`,
              transition: isDragging
                ? 'none'
                : `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              willChange: 'transform',
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none',
              },
            }}
          >
            {slides.map((slide, i) => (
              <Box
                key={slide.id}
                sx={{
                  flex: `0 0 ${slideBasis}%`,
                  minWidth: 0,
                }}
              >
                <BannerSlidePanel slide={slide} visualIndex={i} />
              </Box>
            ))}
          </Box>
        </Box>

        {slides.length > 1 ? (
          <Stack
            direction="row"
            spacing={0.8}
            role="tablist"
            aria-label="Banner slides"
            sx={{ justifyContent: 'center', pt: 0.25 }}
          >
            {slides.map((_, i) => (
              <Box
                key={i}
                component="button"
                type="button"
                role="tab"
                aria-selected={i === safeIdx}
                aria-label={`Banner ${i + 1}`}
                onClick={() => goToSlide(i)}
                sx={{
                  width: i === safeIdx ? 20 : 8,
                  height: 8,
                  borderRadius: 99,
                  border: 0,
                  p: 0,
                  cursor: 'pointer',
                  transition: 'all .25s cubic-bezier(0.22, 1, 0.36, 1)',
                  bgcolor: i === safeIdx ? 'primary.main' : 'action.disabled',
                  '&:hover': {
                    bgcolor: i === safeIdx ? 'primary.dark' : 'action.active',
                  },
                }}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
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

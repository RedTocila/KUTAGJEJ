'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import { ArrowUpRight as ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';

import type { HomeBannerDto } from '@/lib/home-banners-client';
import { useCopy } from '@/hooks/use-copy';
import type { AppMessages } from '@/lib/i18n/messages';

export interface HomeBannerCarouselProps {
  banners?: HomeBannerDto[];
}

const SLIDE_MS = 480;
const SWIPE_THRESHOLD = 48;

const MAX_SLIDES = 7;

function fallbackBanners(home: AppMessages['home']): HomeBannerDto[] {
  return [
    {
      id: 'fallback-1',
      title: home.banner1,
      subtitle: '',
      imageUrl: '',
      ctaLabel: '',
      ctaHref: '/user/dashboard/prona',
      order: 1,
    },
    {
      id: 'fallback-2',
      title: home.banner2,
      subtitle: '',
      imageUrl: '',
      ctaLabel: '',
      ctaHref: '/prona',
      order: 2,
    },
    {
      id: 'fallback-3',
      title: home.banner3,
      subtitle: '',
      imageUrl: '',
      ctaLabel: '',
      ctaHref: '/prona',
      order: 3,
    },
    {
      id: 'fallback-4',
      title: home.banner4,
      subtitle: '',
      imageUrl: '',
      ctaLabel: '',
      ctaHref: '/makina',
      order: 4,
    },
    {
      id: 'fallback-5',
      title: home.banner5,
      subtitle: '',
      imageUrl: '',
      ctaLabel: '',
      ctaHref: '/pune',
      order: 5,
    },
    {
      id: 'fallback-6',
      title: home.banner6,
      subtitle: '',
      imageUrl: '',
      ctaLabel: '',
      ctaHref: '/tregu',
      order: 6,
    },
    {
      id: 'fallback-7',
      title: home.banner7,
      subtitle: '',
      imageUrl: '',
      ctaLabel: '',
      ctaHref: '/biznese',
      order: 7,
    },
  ];
}

function resolveSlides(banners: HomeBannerDto[], home: AppMessages['home']): HomeBannerDto[] {
  const fallbacks = fallbackBanners(home);
  const fromApi = banners.slice(0, MAX_SLIDES);
  if (fromApi.length >= MAX_SLIDES) return fromApi;

  const usedTitles = new Set(fromApi.map((b) => b.title));
  const pads = fallbacks
    .filter((b) => !usedTitles.has(b.title))
    .slice(0, MAX_SLIDES - fromApi.length)
    .map((b) => ({ ...b, id: `pad-${b.id}` }));

  const merged = [...fromApi, ...pads];
  if (merged.length > 0) return merged;
  return fallbacks.slice(0, MAX_SLIDES);
}

function slideHref(slide: HomeBannerDto): string | null {
  const href = slide.ctaHref?.trim();
  return href || null;
}

function BannerSlidePanel({
  slide,
  visualIndex,
  suppressNavRef,
}: {
  slide: HomeBannerDto;
  visualIndex: number;
  suppressNavRef: React.MutableRefObject<boolean>;
}) {
  const visual = VISUALS[visualIndex % VISUALS.length];
  const href = slideHref(slide);
  const imageBg =
    slide.imageUrl && /^https?:\/\//i.test(slide.imageUrl) ? slide.imageUrl : null;

  const content = (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: { xs: 240, sm: 260 },
        backgroundColor: 'background.paper',
        backgroundImage: imageBg
          ? `linear-gradient(115deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.2) 100%), url(${imageBg})`
          : visual.bg,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        '@keyframes particleFloat': {
          '0%': { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 0.2 },
          '50%': { transform: 'translate3d(10px, -22px, 0) scale(1.2)', opacity: 0.75 },
          '100%': { transform: 'translate3d(-8px, -45px, 0) scale(0.95)', opacity: 0.1 },
        },
        '@keyframes pulseGlow': {
          '0%,100%': { opacity: 0.36 },
          '50%': { opacity: 0.66 },
        },
        transition: 'transform 0.25s ease, filter 0.25s ease',
        ...(href
          ? {
              '&:hover': {
                filter: 'brightness(1.04)',
              },
              '&:active': {
                transform: 'scale(0.992)',
              },
            }
          : null),
      }}
    >
      {!imageBg ? (
        <>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 34%), radial-gradient(circle at 85% 70%, rgba(255,255,255,0.14), transparent 32%)',
              animation: 'pulseGlow 4.8s ease-in-out infinite',
              pointerEvents: 'none',
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
                'linear-gradient(95deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.18) 52%, rgba(0, 0, 0, 0.1) 100%)',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : null}

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '55%',
          background:
            'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.38) 42%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          position: 'relative',
          zIndex: 1,
          color: 'common.white',
          p: { xs: 2.4, sm: 3 },
          minHeight: { xs: 240, sm: 260 },
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <Stack spacing={0} sx={{ maxWidth: '88%', flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
          <Typography
            component="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.2rem', sm: '1.35rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              textAlign: 'left',
              textShadow: '0 1px 18px rgba(0,0,0,0.35)',
            }}
          >
            {slide.title}
          </Typography>
        </Stack>

        {href ? (
          <Box
            aria-hidden
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.28)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              mb: 0.25,
            }}
          >
            <ArrowUpRightIcon size={18} weight="bold" />
          </Box>
        ) : null}
      </Stack>
    </Box>
  );

  if (!href) return content;

  return (
    <Box
      component={RouterLink}
      href={href}
      onClick={(event: React.MouseEvent) => {
        if (suppressNavRef.current) {
          event.preventDefault();
          suppressNavRef.current = false;
        }
      }}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {content}
    </Box>
  );
}

export function HomeBannerCarousel({ banners = [] }: HomeBannerCarouselProps) {
  const t = useCopy();
  const slides = React.useMemo(() => resolveSlides(banners, t.home), [banners, t.home]);
  const [idx, setIdx] = React.useState(0);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const touchStartX = React.useRef<number | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const suppressNavRef = React.useRef(false);

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
      if (Math.abs(delta) >= SWIPE_THRESHOLD) {
        suppressNavRef.current = true;
        if (delta <= -SWIPE_THRESHOLD) {
          goToSlide(idx + 1);
        } else {
          goToSlide(idx - 1);
        }
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
      <Stack spacing={1.35} sx={{ width: '100%' }}>
        <Box
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          sx={{
            position: 'relative',
            // Full-bleed clip so cards enter/leave at the screen edge.
            mx: -2,
            overflow: 'hidden',
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
                  px: 2,
                  boxSizing: 'border-box',
                }}
              >
                <Box
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
                  }}
                >
                  <BannerSlidePanel slide={slide} visualIndex={i} suppressNavRef={suppressNavRef} />
                </Box>
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
            sx={{ justifyContent: 'center', pt: 0.15 }}
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
                  width: i === safeIdx ? 22 : 8,
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
  {
    bg: 'radial-gradient(900px 320px at 80% 20%, #fb923c 0%, transparent 42%), linear-gradient(135deg, #9a3412 0%, #c2410c 48%, #f97316 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 10% 80%, #67e8f9 0%, transparent 42%), linear-gradient(135deg, #0e7490 0%, #0891b2 48%, #22d3ee 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 90% 75%, #f9a8d4 0%, transparent 42%), linear-gradient(135deg, #9d174d 0%, #db2777 48%, #f472b6 100%)',
  },
  {
    bg: 'radial-gradient(900px 320px at 20% 15%, #a3e635 0%, transparent 42%), linear-gradient(135deg, #365314 0%, #4d7c0f 48%, #84cc16 100%)',
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

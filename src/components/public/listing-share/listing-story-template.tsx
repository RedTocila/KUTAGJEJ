'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Bathtub as BathtubIcon } from '@phosphor-icons/react/dist/ssr/Bathtub';
import { Bed as BedIcon } from '@phosphor-icons/react/dist/ssr/Bed';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Calendar as CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { Car as CarIcon } from '@phosphor-icons/react/dist/ssr/Car';
import { CheckCircle as CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { Couch as CouchIcon } from '@phosphor-icons/react/dist/ssr/Couch';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { GasPump as GasPumpIcon } from '@phosphor-icons/react/dist/ssr/GasPump';
import { Gauge as GaugeIcon } from '@phosphor-icons/react/dist/ssr/Gauge';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { GraduationCap as GraduationCapIcon } from '@phosphor-icons/react/dist/ssr/GraduationCap';
import { House as HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { PaintBucket as PaintBucketIcon } from '@phosphor-icons/react/dist/ssr/PaintBucket';
import { Path as PathIcon } from '@phosphor-icons/react/dist/ssr/Path';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { PaperPlaneTilt as PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { Ruler as RulerIcon } from '@phosphor-icons/react/dist/ssr/Ruler';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Stairs as StairsIcon } from '@phosphor-icons/react/dist/ssr/Stairs';
import { Star as StarIcon } from '@phosphor-icons/react/dist/ssr/Star';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { Tag as TagIcon } from '@phosphor-icons/react/dist/ssr/Tag';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { relativeAlbanianDate } from '@/components/public/listing-cards/format-helpers';
import { brandLogoSrc, config } from '@/config';
import { formatRatingDisplay } from '@/lib/format-rating';
import { MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import { brandWordmarkFontFamily } from '@/styles/brand-font';
import {
  resolveStoryImageSrc,
  type ListingSharePayload,
  type ListingShareSpec,
  type ListingShareSpecIcon,
} from '@/lib/listing-share';
import {
  DEFAULT_SHARE_THEME_COLOR,
  normalizeShareThemeColor,
  shareThemeContrastText,
  shareThemeToRgba,
} from '@/lib/share-theme-color';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
/** Instagram portrait feed post (4:5) — fills the feed without cropping. */
export const FEED_WIDTH = 1080;
export const FEED_HEIGHT = 1350;

const CARD_W = 760;
const CARD_H = Math.round((CARD_W * 5) / 4);
const STAR_GOLD = '#f5b400';
const STAR_EMPTY = 'rgba(255,255,255,0.28)';
/** Saved JPEG fill — keep in sync with feed capture `backgroundColor`. */
export const CARD_BG = '#000000';
const STORY_CARD_BG = '#141414';
/** Scale factor vs ~360px mobile card (760/360). */
const S = 2.1;
/** MUI `borderRadius` units (`n` × theme.shape.borderRadius). */
const CARD_RADIUS = 2.25 * S;

const RATING_STAR_PATH =
  'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';

const SPEC_ICONS: Record<ListingShareSpecIcon, PhosphorIcon> = {
  bed: BedIcon,
  bath: BathtubIcon,
  ruler: RulerIcon,
  stairs: StairsIcon,
  calendar: CalendarIcon,
  couch: CouchIcon,
  car: CarIcon,
  gauge: GaugeIcon,
  gas: GasPumpIcon,
  gear: GearSixIcon,
  paint: PaintBucketIcon,
  tag: TagIcon,
  check: CheckCircleIcon,
  sparkle: SparkleIcon,
  clock: ClockIcon,
  briefcase: BriefcaseIcon,
  buildings: BuildingsIcon,
  house: HouseIcon,
  star: StarIcon,
  graduation: GraduationCapIcon,
  'map-pin': MapPinIcon,
  storefront: StorefrontIcon,
  path: PathIcon,
};

/** Dark branded backdrop matching the share-story template art. */
export function StoryBackground({ accent }: { accent?: string }) {
  const color = normalizeShareThemeColor(accent || DEFAULT_SHARE_THEME_COLOR);
  const glow = shareThemeToRgba(color, 0.14);
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, overflow: 'hidden', bgcolor: '#0a0a0a' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 40% at 50% 0%, ${glow} 0%, transparent 55%),
            linear-gradient(180deg, #0c0c0c 0%, #101010 50%, #0a0a0a 100%)
          `,
        }}
      />

      {[
        { top: '16%', left: '6%', size: 110, opacity: 0.16 },
        { top: '22%', right: '5%', size: 130, opacity: 0.12 },
        { top: '48%', left: '3%', size: 95, opacity: 0.14 },
        { top: '52%', right: '4%', size: 120, opacity: 0.11 },
        { top: '68%', left: '10%', size: 80, opacity: 0.1 },
      ].map((pin, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            top: pin.top,
            left: pin.left,
            right: pin.right,
            width: pin.size,
            height: pin.size,
            opacity: pin.opacity,
            color: color,
          }}
        >
          <MapPinIcon size={pin.size} weight="fill" />
        </Box>
      ))}

      <Box
        component="svg"
        viewBox="0 0 1080 1920"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.22 }}
      >
        <g stroke={color} strokeWidth="1.5" fill="none">
          <path d="M70 220 L240 380 L150 600" />
          <path d="M1010 260 L840 420 L940 660" />
          <path d="M90 1100 L280 1280 L160 1520" />
          <path d="M990 1180 L800 1380 L920 1600" />
          <path d="M200 800 L400 920 L320 1100" />
          <path d="M880 780 L700 940 L820 1120" />
        </g>
        <g fill={color}>
          <circle cx="240" cy="380" r="5" />
          <circle cx="840" cy="420" r="5" />
          <circle cx="280" cy="1280" r="5" />
          <circle cx="800" cy="1380" r="5" />
          <circle cx="400" cy="920" r="4" />
          <circle cx="700" cy="940" r="4" />
        </g>
      </Box>

      <Box
        component="svg"
        viewBox="0 0 1080 280"
        preserveAspectRatio="none"
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 280,
        }}
      >
        <path
          fill="#151515"
          d="M0 280 V160 H35 V95 H75 V160 H115 V55 H165 V160 H210 V110 H255 V40 H310 V160 H360 V85 H410 V160 H460 V25 H530 V160 H580 V100 H630 V160 H680 V70 H730 V160 H790 V45 H850 V160 H900 V105 H950 V160 H1000 V120 H1040 V160 H1080 V280 Z"
        />
        <path
          fill="#1c1c1c"
          d="M0 280 V195 H55 V150 H110 V195 H175 V165 H240 V195 H320 V140 H390 V195 H470 V170 H540 V195 H620 V155 H700 V195 H780 V145 H860 V195 H940 V175 H1080 V280 Z"
        />
        <g fill={color} opacity="0.55">
          <circle cx="50" cy="120" r="2.2" />
          <circle cx="60" cy="135" r="2.2" />
          <circle cx="140" cy="80" r="2.2" />
          <circle cx="150" cy="100" r="2.2" />
          <circle cx="280" cy="70" r="2.2" />
          <circle cx="290" cy="90" r="2.2" />
          <circle cx="490" cy="55" r="2.2" />
          <circle cx="505" cy="75" r="2.2" />
          <circle cx="710" cy="95" r="2.2" />
          <circle cx="820" cy="70" r="2.2" />
          <circle cx="830" cy="90" r="2.2" />
          <circle cx="80" cy="170" r="1.8" />
          <circle cx="200" cy="175" r="1.8" />
          <circle cx="350" cy="160" r="1.8" />
          <circle cx="650" cy="170" r="1.8" />
          <circle cx="900" cy="165" r="1.8" />
        </g>
      </Box>
    </Box>
  );
}

function MediaActionChip({
  icon,
  count,
  iconColor,
}: {
  icon: React.ReactNode;
  count: number;
  iconColor?: string;
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0.5 * S,
        height: 32 * S,
        px: 1 * S,
        borderRadius: 999,
        bgcolor: 'rgba(18,18,18,0.92)',
        border: '1px solid rgba(255,255,255,0.14)',
        color: '#fff',
      }}
    >
      <Box sx={{ color: iconColor ?? 'inherit', display: 'inline-flex', lineHeight: 0 }}>{icon}</Box>
      <Typography sx={{ fontSize: 11.5 * S, fontWeight: 700, lineHeight: 1, color: '#fff' }}>
        {new Intl.NumberFormat('en-GB').format(count)}
      </Typography>
    </Box>
  );
}

function StoryRatingStar({ size, fill }: { size: number; fill: 'full' | 'half' | 'empty' }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'block',
        overflow: 'hidden',
        lineHeight: 0,
        position: 'relative',
      }}
    >
      <Box component="svg" viewBox="0 0 24 24" sx={{ width: size, height: size, display: 'block' }}>
        <path d={RATING_STAR_PATH} fill={STAR_EMPTY} />
      </Box>
      {fill !== 'empty' ? (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            width: fill === 'half' ? '50%' : '100%',
            overflow: 'hidden',
          }}
        >
          <Box component="svg" viewBox="0 0 24 24" sx={{ width: size, height: size, display: 'block' }}>
            <path d={RATING_STAR_PATH} fill={STAR_GOLD} />
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

function StoryRatingRow({
  ratingAverage,
  reviewCount,
}: {
  ratingAverage?: number | null;
  reviewCount?: number;
}) {
  const count = reviewCount ?? 0;
  if (count <= 0 && (ratingAverage == null || !Number.isFinite(ratingAverage))) {
    return null;
  }

  const numeric =
    count > 0 && ratingAverage != null && Number.isFinite(ratingAverage) ? ratingAverage : 0;
  const clamped = Math.min(5, Math.max(0, numeric));
  const label = formatRatingDisplay(clamped);
  const starSize = 26;

  return (
    <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center', pt: 0.25, flexWrap: 'nowrap' }}>
      <Typography sx={{ fontWeight: 800, fontSize: 28, lineHeight: 1, color: '#fff' }}>{label}</Typography>
      <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center', lineHeight: 0 }}>
        {Array.from({ length: 5 }, (_, index) => {
          const diff = clamped - index;
          const fill = diff >= 0.875 ? 'full' : diff >= 0.125 ? 'half' : 'empty';
          return <StoryRatingStar key={index} size={starSize} fill={fill} />;
        })}
      </Stack>
      <Typography sx={{ fontWeight: 650, fontSize: 24, lineHeight: 1, color: 'rgba(255,255,255,0.5)' }}>
        ({count})
      </Typography>
    </Stack>
  );
}

function SpecChip({
  icon,
  label,
  accent,
}: {
  icon: ListingShareSpecIcon;
  label: string;
  accent: string;
}) {
  const Icon = SPEC_ICONS[icon] ?? TagIcon;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2.75,
        py: 1.65,
        borderRadius: 2,
        border: `2px solid ${shareThemeToRgba(accent, 0.5)}`,
        bgcolor: shareThemeToRgba(accent, 0.14),
        color: accent,
      }}
    >
      <Icon size={30} weight="bold" />
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 28, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
    </Box>
  );
}

function StoryListingImage({
  src,
  fallbackSrc,
  objectPosition = 'center',
}: {
  src: string;
  fallbackSrc?: string | null;
  objectPosition?: string;
}) {
  const [currentSrc, setCurrentSrc] = React.useState(src);

  React.useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <Box
      component="img"
      data-story-listing-image=""
      src={currentSrc}
      alt=""
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => {
        const fallback = String(fallbackSrc || '').trim();
        if (fallback && fallback !== currentSrc && fallback !== src) {
          setCurrentSrc(fallback);
        }
      }}
      sx={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition,
      }}
    />
  );
}

function ListingPhoto({
  imageSrc,
  fallbackSrc,
  accent,
  badge,
  topRight,
}: {
  imageSrc: string | null;
  fallbackSrc?: string | null;
  accent: string;
  badge?: string;
  topRight: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        flex: 1,
        minHeight: 0,
        bgcolor: shareThemeToRgba(accent, 0.06),
        overflow: 'hidden',
      }}
    >
      {imageSrc ? (
        <StoryListingImage src={imageSrc} fallbackSrc={fallbackSrc} />
      ) : (
        <Stack
          sx={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            opacity: 0.5,
          }}
        >
          <BuildingsIcon size={42 * S} weight="duotone" />
        </Stack>
      )}

      {badge ? (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            px: 1.6,
            py: 0.7,
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            bgcolor: 'rgba(12,12,12,0.88)',
            border: '1px solid rgba(255,255,255,0.16)',
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#fff', lineHeight: 1, letterSpacing: '0.02em' }}>
            {badge}
          </Typography>
        </Box>
      ) : null}

      <Box sx={{ position: 'absolute', top: 14, right: 14 }}>{topRight}</Box>
    </Box>
  );
}

function isSaveConditionLabel(label: string): boolean {
  const n = label.trim().toLowerCase();
  if (!n) return false;
  return MARKETPLACE_CONDITION_OPTIONS.some((option) => {
    const text = option.label.toLowerCase();
    return n === text || n === option.value || n === text.split(' (')[0];
  });
}

const SAVE_INSET = 22;
/** Black chrome at ~18% transparency so the photo shows through slightly. */
const SAVE_BAR_BG = 'rgba(17, 17, 17, 0.82)';
const SAVE_WORDMARK = config.site.wordmarkSegments ?? (['KuTa', 'Gjej'] as const);

function SaveSpecChip({ spec, accent }: { spec: ListingShareSpec; accent: string }) {
  const Icon = SPEC_ICONS[spec.icon] ?? TagIcon;
  return (
    <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center' }}>
      <Box sx={{ color: accent, display: 'inline-flex', lineHeight: 0, flexShrink: 0 }}>
        <Icon size={22} weight="bold" />
      </Box>
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 20, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
        {spec.label}
      </Typography>
    </Stack>
  );
}

/**
 * Saved photo (Ruaj foton): Instagram 4:5 post — clean photo + split info bar (image2).
 */
function SavePhotoCard({ payload }: { payload: ListingSharePayload }) {
  const imageSrc = resolveStoryImageSrc(payload.imageUrl);
  const location = payload.location?.trim() || '';
  const contactPhone = payload.contactPhone?.trim() || '';
  const accent = normalizeShareThemeColor(payload.themeColor);
  const accentText = shareThemeContrastText(accent);
  const labeledSpecs = (payload.specs ?? []).filter((spec) => spec.label);
  const conditionLabel =
    labeledSpecs.find(
      (spec) =>
        (spec.icon === 'sparkle' || spec.icon === 'check') && isSaveConditionLabel(spec.label),
    )?.label?.trim() ||
    (isSaveConditionLabel(payload.badge || '') ? String(payload.badge).trim() : '');
  const specs = labeledSpecs
    .filter((spec) => spec.icon !== 'tag' && !isSaveConditionLabel(spec.label))
    .slice(0, 3);

  return (
    <Box
      data-listing-share-card=""
      sx={{
        width: CARD_W,
        height: CARD_H,
        aspectRatio: '4 / 5',
        overflow: 'hidden',
        bgcolor: CARD_BG,
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {imageSrc ? (
        <StoryListingImage src={imageSrc} fallbackSrc={payload.imageUrl} objectPosition="center" />
      ) : (
        <Stack
          sx={{
            position: 'absolute',
            inset: 0,
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            opacity: 0.5,
          }}
        >
          <BuildingsIcon size={42 * S} weight="duotone" />
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          position: 'absolute',
          top: SAVE_INSET,
          left: SAVE_INSET,
          zIndex: 1,
          alignItems: 'center',
          px: 1.25,
          py: 0.75,
          borderRadius: 2.5,
          bgcolor: SAVE_BAR_BG,
        }}
      >
        <Box
          component="img"
          src={brandLogoSrc}
          alt=""
          sx={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0, mr: -0.5 }}
        />
        <Stack spacing={0} sx={{ minWidth: 0, lineHeight: 1.02 }}>
          <Typography
            sx={{
              fontFamily: brandWordmarkFontFamily,
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: '-0.05em',
              lineHeight: 1.02,
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            {SAVE_WORDMARK[0]}
          </Typography>
          <Typography
            sx={{
              fontFamily: brandWordmarkFontFamily,
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '-0.05em',
              lineHeight: 1.02,
              color: accent,
            }}
          >
            {SAVE_WORDMARK[1]}
          </Typography>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={1.15}
        sx={{
          position: 'absolute',
          top: SAVE_INSET,
          right: SAVE_INSET,
          zIndex: 1,
          alignItems: 'center',
          px: 2.15,
          py: 1.25,
          borderRadius: 2.5,
          bgcolor: SAVE_BAR_BG,
        }}
      >
        <Box sx={{ color: accent, display: 'inline-flex', lineHeight: 0, flexShrink: 0 }}>
          <PhoneIcon size={28} weight="fill" />
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 24,
            lineHeight: 1,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            color: '#fff',
          }}
        >
          {contactPhone || '—'}
        </Typography>
      </Stack>

      <Box
        sx={{
          position: 'absolute',
          left: SAVE_INSET,
          right: SAVE_INSET,
          bottom: SAVE_INSET,
          zIndex: 1,
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          borderRadius: 2.5,
        }}
      >
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0, bgcolor: SAVE_BAR_BG, px: 2.5, py: 2 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 30,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {payload.title}
          </Typography>

          {location || conditionLabel ? (
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}
            >
              {location ? (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
                  <Box sx={{ color: accent, display: 'inline-flex', lineHeight: 0, flexShrink: 0 }}>
                    <MapPinIcon size={22} weight="fill" />
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: 650,
                      fontSize: 20,
                      lineHeight: 1.2,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {location}
                  </Typography>
                </Stack>
              ) : (
                <Box sx={{ flex: 1 }} />
              )}
              {conditionLabel ? (
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: 1.2,
                    color: accent,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {conditionLabel}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          {specs.length > 0 ? (
            <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', rowGap: 0.75 }}>
              {specs.map((spec, index) => (
                <SaveSpecChip key={`${spec.label}-${index}`} spec={spec} accent={accent} />
              ))}
            </Stack>
          ) : null}
        </Stack>

        {payload.priceLabel ? (
          <Box
            sx={{
              flexShrink: 0,
              minWidth: 168,
              px: 2.75,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: accent,
              color: accentText,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 34,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                whiteSpace: 'nowrap',
              }}
            >
              {payload.priceLabel}
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

/**
 * Share Story card — same layout as home/dashboard listing cards.
 */
function StoryDashboardCard({ payload }: { payload: ListingSharePayload }) {
  const specs = (payload.specs ?? []).filter((s) => s.label).slice(0, 5);
  const saveCount = payload.saveCount ?? 0;
  const viewCount = payload.viewCount ?? 0;
  const posted = payload.createdAt ? relativeAlbanianDate(payload.createdAt) : null;
  const imageSrc = resolveStoryImageSrc(payload.imageUrl);
  const accent = normalizeShareThemeColor(payload.themeColor);

  return (
    <Box
      data-listing-share-card=""
      sx={{
        width: CARD_W,
        height: CARD_H,
        aspectRatio: '4 / 5',
        borderRadius: CARD_RADIUS,
        overflow: 'hidden',
        bgcolor: STORY_CARD_BG,
        border: `${2.5 * S}px solid ${accent}`,
        boxShadow: '0 28px 80px rgba(0,0,0,0.55)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', flex: 1, minHeight: 0, display: 'flex' }}>
        <ListingPhoto
          imageSrc={imageSrc}
          fallbackSrc={payload.imageUrl}
          accent={accent}
          badge={payload.badge}
          topRight={
            <Stack direction="row" spacing={0.75 * S} sx={{ alignItems: 'center' }}>
              <MediaActionChip icon={<PaperPlaneTiltIcon size={17 * S} weight="bold" />} count={0} />
              <MediaActionChip
                icon={<BookmarkSimpleIcon size={17 * S} weight="fill" />}
                count={saveCount}
                iconColor={accent}
              />
            </Stack>
          }
        />
      </Box>

      <Stack spacing={2.1} sx={{ px: 3.5, py: 3.1, bgcolor: STORY_CARD_BG, flexShrink: 0 }}>
        {payload.category ? (
          <Typography
            sx={{
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: 22,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.1,
            }}
          >
            {payload.category}
          </Typography>
        ) : null}

        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 40,
            lineHeight: 1.2,
            color: '#fff',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {payload.title}
        </Typography>

        <StoryRatingRow ratingAverage={payload.ratingAverage} reviewCount={payload.reviewCount} />

        {payload.priceLabel ? (
          <Typography sx={{ fontWeight: 900, fontSize: 50, color: accent, lineHeight: 1.05 }}>
            {payload.priceLabel}
          </Typography>
        ) : null}

        {specs.length > 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              rowGap: 1.5,
              columnGap: 1.5,
              alignItems: 'center',
              pt: 0.5,
            }}
          >
            {specs.map((spec, i) => (
              <SpecChip key={`${spec.label}-${i}`} icon={spec.icon} label={spec.label} accent={accent} />
            ))}
          </Box>
        ) : null}

        {payload.location ? (
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', color: 'rgba(255,255,255,0.92)', pt: 0.5 }}>
            <Box sx={{ color: accent, display: 'inline-flex', lineHeight: 0 }}>
              <MapPinIcon size={28} weight="fill" />
            </Box>
            <Typography sx={{ fontWeight: 650, fontSize: 26, lineHeight: 1.25 }}>{payload.location}</Typography>
          </Stack>
        ) : null}

        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 0.75 }}>
          <Typography sx={{ fontSize: 22, color: 'rgba(255,255,255,0.42)', fontWeight: 550 }}>
            {posted ?? ''}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'rgba(255,255,255,0.42)' }}>
            <EyeIcon size={24} weight="regular" />
            <Typography sx={{ fontSize: 22, fontWeight: 650 }}>
              {new Intl.NumberFormat('en-GB').format(viewCount)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

export const ListingShareCard = React.forwardRef<
  HTMLDivElement,
  { payload: ListingSharePayload; variant?: 'story' | 'feed' }
>(function ListingShareCard({ payload, variant = 'story' }, ref) {
  return (
    <Box ref={ref} sx={{ flexShrink: 0 }}>
      {variant === 'feed' ? <SavePhotoCard payload={payload} /> : <StoryDashboardCard payload={payload} />}
    </Box>
  );
});

/**
 * Full Instagram-story template: branded dark backdrop + home-style listing card.
 */
export const ListingStoryTemplate = React.forwardRef<HTMLDivElement, { payload: ListingSharePayload }>(
  function ListingStoryTemplate({ payload }, ref) {
    const accent = normalizeShareThemeColor(payload.themeColor);
    const contactPhone = payload.contactPhone?.trim() || '';
    return (
      <Box
        ref={ref}
        sx={{
          position: 'relative',
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          overflow: 'hidden',
          bgcolor: '#0a0a0a',
          color: '#fff',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <StoryBackground accent={accent} />

        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            px: 7,
            pt: 12,
            pb: 8,
            display: 'grid',
            gridTemplateRows: '1.2fr auto 0.75fr',
            alignItems: 'center',
            justifyItems: 'center',
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0,
            }}
          >
            <Stack spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Box
                component="img"
                src={brandLogoSrc}
                alt={config.site.name}
                sx={{ width: 108, height: 108, objectFit: 'contain' }}
              />
              <Typography
                sx={{
                  fontFamily: brandWordmarkFontFamily,
                  fontWeight: 700,
                  fontSize: 56,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  color: '#fff',
                }}
              >
                {config.site.name}
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 500, fontSize: 28, color: 'rgba(255,255,255,0.82)' }}>
                  Gjithçka në një vend.
                </Typography>
                <Box sx={{ color: accent, display: 'inline-flex', lineHeight: 0 }}>
                  <MapPinIcon size={26} weight="fill" />
                </Box>
              </Stack>
            </Stack>
          </Box>

          <Stack spacing={4} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <ListingShareCard payload={payload} variant="story" />
            {contactPhone ? (
              <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', color: accent }}>
                <Box sx={{ display: 'inline-flex', lineHeight: 0 }}>
                  <PhoneIcon size={48} weight="fill" />
                </Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 52,
                    lineHeight: 1,
                    letterSpacing: '0.02em',
                    color: accent,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {contactPhone}
                </Typography>
              </Stack>
            ) : null}
          </Stack>

          <Box aria-hidden sx={{ width: '100%', height: '100%', minHeight: 0 }} />
        </Box>
      </Box>
    );
  },
);

/**
 * Saved photo: Instagram 4:5 feed post (full-bleed, no border / rounded corners).
 */
export const ListingFeedTemplate = React.forwardRef<HTMLDivElement, { payload: ListingSharePayload }>(
  function ListingFeedTemplate({ payload }, ref) {
    const scale = FEED_WIDTH / CARD_W;

    return (
      <Box
        ref={ref}
        data-listing-feed-template=""
        sx={{
          position: 'relative',
          width: FEED_WIDTH,
          height: FEED_HEIGHT,
          overflow: 'hidden',
          bgcolor: CARD_BG,
          color: '#fff',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <Box
          sx={{
            width: CARD_W,
            height: CARD_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            backfaceVisibility: 'hidden',
          }}
        >
          <ListingShareCard payload={payload} variant="feed" />
        </Box>
      </Box>
    );
  },
);

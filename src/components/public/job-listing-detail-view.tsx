'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ShareOutlined from '@mui/icons-material/ShareOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';

import { JobCard } from '@/components/public/listing-cards/job-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { JobListingDetailCountdown } from '@/components/public/job-listing-detail-countdown';
import { findOptionLabel, formatPrice } from '@/components/public/listing-cards/format-helpers';
import { JOB_INDUSTRY_OPTIONS } from '@/lib/job-constants';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import {
  buildJobDetailSections,
  formatJobListingId,
  isJobListingNew,
  jobDetailMetaRows,
  type JobDetailBenefit,
} from '@/lib/job-listing-detail-content';
import { whatsappHref } from '@/lib/listing-contact';
import type { PublicJobListing, PublicJobListingDetail } from '@/lib/public-listings-client';
import { JobListingDetailDesktop } from '@/components/public/job-listing-detail-desktop';
import { MOBILE_BOTTOM_NAV_OFFSET } from '@/lib/mobile-layout';
import { paths } from '@/paths';

const SAVED_JOBS_KEY = 'kutagjej-saved-jobs';

/** 14px body — standard readable size on mobile. */
const FONT_BODY = '0.875rem';
const FONT_CAPTION = '0.75rem';
const FONT_SECTION = '1rem';

const surfaceCardSx = {
  p: 2,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.45)',
} as const;

function benefitIcon(id: JobDetailBenefit['id']) {
  const iconSx = { fontSize: 28, color: 'primary.main' };
  switch (id) {
    case 'pay':
      return <PaymentsOutlined sx={iconSx} />;
    case 'growth':
      return <TrendingUpOutlined sx={iconSx} />;
    case 'health':
      return <ShieldOutlined sx={iconSx} />;
    default:
      return <ScheduleOutlined sx={iconSx} />;
  }
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
      <Box sx={{ color: 'primary.main', display: 'flex', '& svg': { fontSize: 22 } }}>{icon}</Box>
      <Typography sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.3 }}>{title}</Typography>
    </Stack>
  );
}

function BulletList({
  items,
  variant,
}: {
  items: string[];
  variant: 'check' | 'dot';
}) {
  return (
    <Stack component="ul" spacing={1.25} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {items.map((item) => (
        <Stack
          key={item}
          component="li"
          direction="row"
          spacing={1}
          sx={{ alignItems: 'flex-start' }}
        >
          {variant === 'check' ? (
            <CheckCircleOutlined sx={{ fontSize: 18, color: 'primary.main', mt: 0.15, flexShrink: 0 }} />
          ) : (
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                mt: 0.6,
                flexShrink: 0,
              }}
            />
          )}
          <Typography component="span" sx={{ fontSize: FONT_BODY, lineHeight: 1.5, color: 'text.secondary' }}>
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function JobListingDetailView({
  listing,
  canonicalUrl,
  similar = [],
}: {
  listing: PublicJobListingDetail;
  canonicalUrl: string;
  similar?: PublicJobListing[];
}) {
  const router = useRouter();
  const [saved, setSaved] = React.useState(false);

  const expiresAt = listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString();
  const sections = React.useMemo(() => buildJobDetailSections(listing), [listing]);
  const metaRows = React.useMemo(() => jobDetailMetaRows(listing), [listing]);
  const companyName = listing.seller?.displayName ?? findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  const phone = listing.contactPhone ?? listing.seller?.phone ?? null;
  const applyHref = phone ? `tel:${phone.replace(/\s/g, '')}` : whatsappHref(listing.contactPhone ?? listing.seller?.phone);
  const heroImage = listing.imageUrl ?? listing.imageUrls[0] ?? null;
  const isNew = isJobListingNew(listing.createdAt);

  const metaIcons = [
    LocationOnOutlined,
    WorkOutlineOutlined,
    CalendarTodayOutlined,
    ScheduleOutlined,
  ] as const;

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_JOBS_KEY);
      const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      setSaved(ids.includes(listing.id));
    } catch {
      /* noop */
    }
  }, [listing.id]);

  const toggleSave = () => {
    try {
      const raw = localStorage.getItem(SAVED_JOBS_KEY);
      const ids = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      if (ids.has(listing.id)) ids.delete(listing.id);
      else ids.add(listing.id);
      localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify([...ids]));
      setSaved(ids.has(listing.id));
    } catch {
      /* noop */
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, text: listing.title, url: canonicalUrl });
        return;
      }
    } catch {
      /* noop */
    }
    try {
      await navigator.clipboard.writeText(canonicalUrl);
    } catch {
      /* noop */
    }
  };

  /** Sticky Ruaj/Apliko bar — safe-area counted once via nav offset on mobile. */
  const stickyFooterHeight = '96px';
  const scrollPadBottom = {
    xs: `calc(${stickyFooterHeight} + ${MOBILE_BOTTOM_NAV_OFFSET})`,
    md: `calc(${stickyFooterHeight} + env(safe-area-inset-bottom, 0px))`,
  };

  return (
    <>
      <JobListingDetailDesktop
        listing={listing}
        similar={similar}
        saved={saved}
        onToggleSave={toggleSave}
        onShare={() => void handleShare()}
        applyHref={applyHref}
      />

      <Box
        sx={{
          display: { xs: 'block', md: 'none' },
          bgcolor: 'background.default',
          minHeight: '100vh',
          pb: scrollPadBottom,
        }}
      >
      {/* Top bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          px: 2,
          py: 1.25,
          bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton aria-label="Kthehu" onClick={() => router.back()} edge="start" size="small">
            <ArrowBackOutlined />
          </IconButton>
          <Typography sx={{ fontWeight: 800, fontSize: FONT_BODY }}>Detajet e punës</Typography>
          <Stack direction="row" spacing={0.25}>
            <IconButton aria-label="Ndaj" onClick={() => void handleShare()} size="small">
              <ShareOutlined fontSize="small" />
            </IconButton>
            <IconButton
              aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj'}
              onClick={toggleSave}
              size="small"
              sx={{ color: saved ? 'primary.main' : 'text.primary' }}
            >
              <BookmarkSimpleIcon size={20} weight={saved ? 'fill' : 'regular'} />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Scrollable content */}
      <Box sx={{ px: 2, pt: 1.5, pb: 0, maxWidth: 560, mx: 'auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <Stack spacing={2} sx={{ minWidth: 0, width: '100%' }}>
          {/* Hero */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: 'grey.900',
            }}
          >
            <Box sx={{ position: 'relative', minHeight: 200 }}>
              {heroImage ? (
                <Box
                  component="img"
                  src={heroImage}
                  alt={listing.title}
                  sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'grey.900',
                    color: 'primary.main',
                    opacity: 0.35,
                  }}
                >
                  <BriefcaseIcon size={64} weight="duotone" />
                </Box>
              )}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.88) 100%)',
                }}
              />
              <Stack spacing={1.25} sx={{ position: 'relative', zIndex: 1, p: 2, pt: 2.5 }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      color: 'primary.main',
                      fontWeight: 800,
                      fontSize: FONT_BODY,
                    }}
                  >
                    {companyName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: FONT_BODY,
                        color: 'rgba(255,255,255,0.95)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {companyName}
                    </Typography>
                    {listing.seller?.kind === 'business' ? (
                      <CheckCircleOutlined sx={{ fontSize: 18, color: 'primary.main', flexShrink: 0 }} />
                    ) : null}
                  </Stack>
                </Stack>

                <Typography
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: '1.375rem', sm: '1.5rem' },
                    lineHeight: 1.2,
                    color: '#fff',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {listing.title}
                </Typography>

                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                  {isNew ? (
                    <Chip
                      label="E re"
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: FONT_CAPTION,
                        fontWeight: 700,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                      }}
                    />
                  ) : null}
                  <Chip
                    label={`ID: ${formatJobListingId(listing.id)}`}
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: FONT_CAPTION,
                      fontWeight: 600,
                      bgcolor: 'rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.9)',
                      border: '1px solid rgba(255,255,255,0.18)',
                    }}
                  />
                </Stack>
              </Stack>
            </Box>

            {/* Meta 2×2 grid */}
            <Grid
              container
              sx={{
                bgcolor: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {metaRows.map((row, index) => {
                const Icon = metaIcons[index];
                return (
                  <Grid
                    key={row.label}
                    size={6}
                    sx={{
                      py: 1.5,
                      px: 1.5,
                      borderRight: index % 2 === 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      borderBottom: index < 2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    }}
                  >
                    <Stack spacing={0.5}>
                      <Icon sx={{ fontSize: 20, color: 'primary.main' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: FONT_BODY, color: '#fff', lineHeight: 1.3 }}>
                        {row.value}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: FONT_CAPTION }}>
                        {row.label}
                      </Typography>
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          <JobListingDetailCountdown expiresAt={expiresAt} />

          {/* Description */}
          <Box sx={surfaceCardSx}>
            <SectionHeader icon={<DescriptionOutlined />} title="Përshkrimi i punës" />
            <RealEstateListingExpandableText
              text={sections.intro}
              readMoreLabel="Lexo më shumë"
              readLessLabel="Mbyll"
              fontSize={FONT_BODY}
            />
            {listing.salary != null ? (
              <Typography sx={{ mt: 1.5, color: 'primary.main', fontWeight: 700, fontSize: FONT_BODY }}>
                Pagë: {formatPrice(listing.salary, listing.currency)} / muaj
              </Typography>
            ) : null}
          </Box>

          {/* Responsibilities — full width, stacked above requirements */}
          <Box sx={surfaceCardSx}>
            <SectionHeader icon={<GroupsOutlined />} title="Përgjegjësitë kryesore" />
            <BulletList items={sections.responsibilities} variant="check" />
          </Box>

          <Box sx={surfaceCardSx}>
            <SectionHeader icon={<SchoolOutlined />} title="Kërkesat" />
            <BulletList items={sections.requirements} variant="dot" />
          </Box>

          {/* Benefits 2×2 */}
          <Box sx={surfaceCardSx}>
            <SectionHeader icon={<EventAvailableOutlined />} title="Çfarë ofrojmë" />
            <Grid container spacing={2}>
              {sections.benefits.map((benefit) => (
                <Grid key={benefit.id} size={6}>
                  <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', px: 0.5 }}>
                    {benefitIcon(benefit.id)}
                    <Typography sx={{ fontWeight: 600, fontSize: FONT_BODY, lineHeight: 1.35 }}>
                      {benefit.label}
                    </Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Box>

          {similar.length > 0 ? (
            <Stack
              spacing={1.5}
              component="aside"
              aria-labelledby="job-similar-heading"
              sx={{ mb: 0, pb: 0 }}
            >
              <Typography id="job-similar-heading" sx={{ fontWeight: 800, fontSize: FONT_SECTION, lineHeight: 1.3 }}>
                Punë të ngjashme
              </Typography>
              <Box
                sx={{
                  mx: { xs: -2, sm: 0 },
                  mb: 0,
                  '& > div > div': { py: '8px 0 0 !important' },
                }}
              >
                <ListingsCarousel slotWidth={{ xs: 260, sm: 280, md: 300 }}>
                  {similar.map((item) => (
                    <JobCard key={item.id} listing={item} />
                  ))}
                </ListingsCarousel>
              </Box>
            </Stack>
          ) : null}

          <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'center' }}>
            <Button
              component={Link}
              href={paths.public.jobs}
              variant="text"
              sx={{ fontWeight: 700, textTransform: 'none', fontSize: FONT_BODY }}
            >
              Kthehu te lista e punëve
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* Sticky footer */}
      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: { xs: MOBILE_BOTTOM_NAV_OFFSET, md: 0 },
          zIndex: 25,
          px: 2,
          pt: 1.5,
          pb: 1.5,
          bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.96)',
          backdropFilter: 'blur(14px)',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={1} sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
          <Stack direction="row" spacing={1.25}>
            <Button
              variant="outlined"
              onClick={toggleSave}
              startIcon={<BookmarkSimpleIcon size={18} weight={saved ? 'fill' : 'regular'} />}
              sx={{
                flex: 1,
                py: 1.25,
                borderRadius: 2.5,
                fontWeight: 800,
                textTransform: 'none',
                fontSize: FONT_BODY,
                borderWidth: 2,
                ...(saved
                  ? { borderColor: 'primary.main', color: 'primary.main' }
                  : {}),
              }}
            >
              Ruaj
            </Button>
            {applyHref ? (
              <Button
                component="a"
                href={applyHref}
                variant="contained"
                endIcon={<ArrowForwardOutlined />}
                sx={{
                  flex: 1.35,
                  py: 1.25,
                  borderRadius: 2.5,
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: FONT_BODY,
                  boxShadow: 'none',
                }}
              >
                Apliko tani
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled
                sx={{ flex: 1.35, py: 1.25, borderRadius: 2.5, textTransform: 'none', fontSize: FONT_BODY }}
              >
                Apliko tani
              </Button>
            )}
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'center', alignItems: 'center' }}>
            <LockOutlined sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography sx={{ fontSize: FONT_CAPTION, color: 'text.disabled' }}>
              Kjo punë është e verifikuar dhe e sigurt
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Box>
    </>
  );
}

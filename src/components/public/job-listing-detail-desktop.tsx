'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { BookmarkSimple as BookmarkSimpleIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import { ListingMediaActionButton } from '@/components/public/listing-media-action-button';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { RealEstateListingExpandableText } from '@/components/public/real-estate-listing-expandable-text';
import { JobListingDetailCountdown } from '@/components/public/job-listing-detail-countdown';
import { findOptionLabel, formatPrice } from '@/components/public/listing-cards/format-helpers';
import { JOB_INDUSTRY_OPTIONS } from '@/lib/job-constants';
import { getJobListingExpiresAt } from '@/lib/job-listing-expiry';
import {
  buildJobDetailSections,
  isJobListingNew,
  jobDetailMetaRows,
  type JobDetailBenefit,
} from '@/lib/job-listing-detail-content';
import { JobVerifiedBadge } from '@/components/public/professional-listing-detail-ui';
import type { PublicJobListing, PublicJobListingDetail } from '@/lib/public-listings-client';
import { LISTING_DETAIL_STICKY_TOP_MD } from '@/lib/listing-detail-layout';
import { paths } from '@/paths';

const surfaceCardSx = {
  p: 2.5,
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'rgba(var(--mui-palette-background-paperChannel) / 0.55)',
} as const;

function benefitIcon(id: JobDetailBenefit['id']) {
  const iconSx = { fontSize: 28, color: 'primary.main' };
  switch (id) {
    case 'pay':
    case 'negotiable-pay':
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
      <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.3 }}>{title}</Typography>
    </Stack>
  );
}

function BulletList({ items, variant }: { items: string[]; variant: 'check' | 'dot' }) {
  return (
    <Stack component="ul" spacing={1.25} sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {items.map((item) => (
        <Stack key={item} component="li" direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
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
          <Typography component="span" sx={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'text.secondary' }}>
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

const metaIcons = [LocationOnOutlined, WorkOutlineOutlined, CalendarTodayOutlined, ScheduleOutlined] as const;

export function JobListingDetailDesktop({
  listing,
  similar,
  saved,
  saveCount,
  shareCount,
  onToggleSave,
  onShare,
  applyHref,
}: {
  listing: PublicJobListingDetail;
  similar: PublicJobListing[];
  saved: boolean;
  saveCount: number;
  shareCount: number;
  onToggleSave: () => void;
  onShare: () => void;
  applyHref: string | null | undefined;
}) {
  const sections = React.useMemo(() => buildJobDetailSections(listing), [listing]);
  const metaRows = React.useMemo(() => jobDetailMetaRows(listing), [listing]);
  const companyName =
    listing.seller?.displayName?.trim() || findOptionLabel(JOB_INDUSTRY_OPTIONS, listing.industry);
  const heroImage = listing.imageUrl ?? listing.imageUrls[0] ?? null;
  const isNew = isJobListingNew(listing.createdAt);
  const expiresAt = listing.expiresAt ?? getJobListingExpiresAt(listing.createdAt).toISOString();

  const heroControlButtonSx = {
    bgcolor: alpha('#000', 0.45),
    color: '#fff',
    backdropFilter: 'blur(10px)',
    '&:hover': { bgcolor: alpha('#000', 0.62) },
  } as const;

  return (
    <Box component="article" sx={{ bgcolor: 'background.default', pb: 6, display: { xs: 'none', md: 'block' } }}>
      <Container maxWidth="lg" sx={{ px: { md: 3 }, pt: 2, pb: 2 }}>
        <Stack spacing={4}>
          <Box
            sx={(theme) => ({
              width: '100%',
              borderRadius: 3,
              overflow: 'hidden',
              border: 'none',
              bgcolor: 'background.paper',
              boxShadow:
                theme.palette.mode === 'dark'
                  ? `0 20px 50px ${alpha(theme.palette.common.black, 0.35)}`
                  : '0 12px 40px rgba(0, 0, 0, 0.08)',
            })}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '21 / 9',
                maxHeight: 360,
                minHeight: 240,
                overflow: 'hidden',
                bgcolor: 'grey.900',
              }}
            >
            {heroImage ? (
              <Box
                component="img"
                src={heroImage}
                alt=""
                sx={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block',
                }}
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
                <BriefcaseIcon size={72} weight="duotone" />
              </Box>
            )}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.88) 100%)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                pointerEvents: 'none',
                '& [data-hero-control]': { pointerEvents: 'auto' },
              }}
            >
              <Stack
                direction="row"
                sx={{
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  p: { xs: 1.5, sm: 2.5 },
                }}
              >
                <IconButton
                  component={Link}
                  href={paths.public.jobs}
                  aria-label="Prapa te lista e punëve"
                  size="medium"
                  data-hero-control
                  sx={heroControlButtonSx}
                >
                  <ArrowLeftIcon size={22} weight="regular" />
                </IconButton>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box data-hero-control component="span" sx={{ display: 'inline-flex' }}>
                    <ListingMediaActionButton
                      aria-label="Ndaj njoftimin"
                      count={shareCount}
                      surface="glass"
                      icon={<ShareNetworkIcon size={17} weight="regular" />}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onShare();
                      }}
                    />
                  </Box>
                  <Box data-hero-control component="span" sx={{ display: 'inline-flex' }}>
                    <ListingMediaActionButton
                      aria-label={saved ? 'Hiq nga të ruajturat' : 'Ruaj njoftimin'}
                      count={saveCount}
                      surface="glass"
                      active={saved}
                      icon={<BookmarkSimpleIcon size={17} weight={saved ? 'fill' : 'regular'} />}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleSave();
                      }}
                    />
                  </Box>
                </Stack>
              </Stack>
            </Box>
            <Stack
              spacing={1.5}
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                p: 3,
                justifyContent: 'flex-end',
                pointerEvents: 'none',
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: 'background.paper',
                    color: 'primary.main',
                    fontWeight: 800,
                  }}
                >
                  {companyName.charAt(0).toUpperCase()}
                </Avatar>
                {isNew ? (
                  <Chip
                    label="E re"
                    size="small"
                    sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'primary.contrastText' }}
                  />
                ) : null}
              </Stack>
              <Typography
                component="h1"
                sx={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1.15, color: '#fff', letterSpacing: '-0.02em', maxWidth: 720 }}
              >
                {listing.title}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Box
                  sx={{
                    width: 'max-content',
                    flexShrink: 0,
                    height: 28,
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    borderRadius: 999,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                      lineHeight: 1,
                      color: 'inherit',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {companyName}
                  </Typography>
                </Box>
                {listing.seller?.verified ? <JobVerifiedBadge size={20} /> : null}
              </Stack>
              {listing.seller ? (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <LockOutlined sx={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }} />
                  <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>
                    Kjo punë është e verifikuar dhe e sigurt
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
            </Box>

          <Grid container sx={{ bgcolor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', width: '100%' }}>
            {metaRows.map((row, index) => {
              const Icon = metaIcons[index];
              return (
                <Grid
                  key={row.label}
                  size={3}
                  sx={{
                    py: 2,
                    px: 2,
                    borderRight: index < metaRows.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}
                >
                  <Stack spacing={0.5}>
                    <Icon sx={{ fontSize: 22, color: 'primary.main' }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{row.value}</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem' }}>{row.label}</Typography>
                  </Stack>
                </Grid>
              );
            })}
          </Grid>
          </Box>

          <Grid container spacing={4} sx={{ width: '100%' }}>
          <Grid size={{ md: 8 }}>
            <Stack spacing={3}>
              <Box sx={surfaceCardSx}>
                <SectionHeader icon={<DescriptionOutlined />} title="Përshkrimi i punës" />
                <RealEstateListingExpandableText
                  text={sections.intro}
                  readMoreLabel="Lexo më shumë"
                  readLessLabel="Mbyll"
                  fontSize="0.9rem"
                />
                {listing.salary != null ? (
                  <Typography sx={{ mt: 2, color: 'primary.main', fontWeight: 700, fontSize: '1rem' }}>
                    Pagë: {formatPrice(listing.salary, listing.currency)} / muaj
                  </Typography>
                ) : null}
              </Box>

              <Grid container spacing={2.5}>
                <Grid size={6}>
                  <Box sx={{ ...surfaceCardSx, height: '100%' }}>
                    <SectionHeader icon={<GroupsOutlined />} title="Përgjegjësitë kryesore" />
                    <BulletList items={sections.responsibilities} variant="check" />
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Box sx={{ ...surfaceCardSx, height: '100%' }}>
                    <SectionHeader icon={<SchoolOutlined />} title="Kërkesat" />
                    <BulletList items={sections.requirements} variant="dot" />
                  </Box>
                </Grid>
              </Grid>

              <Box sx={surfaceCardSx}>
                <SectionHeader icon={<EventAvailableOutlined />} title="Çfarë ofrojmë" />
                <Grid container spacing={2}>
                  {sections.benefits.map((benefit) => (
                    <Grid key={benefit.id} size={3}>
                      <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', px: 1 }}>
                        {benefitIcon(benefit.id)}
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.35 }}>
                          {benefit.label}
                        </Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {similar.length > 0 ? (
                <Stack spacing={2} component="aside" aria-labelledby="job-similar-heading-desktop">
                  <Typography id="job-similar-heading-desktop" sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    Punë të ngjashme
                  </Typography>
                  <ListingsCarousel slotWidth={{ md: 300 }}>
                    {similar.map((item) => (
                      <JobCard key={item.id} listing={item} />
                    ))}
                  </ListingsCarousel>
                </Stack>
              ) : null}

              <Box sx={{ textAlign: 'center', pt: 1 }}>
                <Button component={Link} href={paths.public.jobs} variant="text" sx={{ fontWeight: 700, textTransform: 'none' }}>
                  Kthehu te lista e punëve
                </Button>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ md: 4 }} sx={{ alignSelf: 'stretch' }}>
            <Box sx={{ position: 'sticky', top: LISTING_DETAIL_STICKY_TOP_MD, zIndex: 1 }}>
              <Stack spacing={2.5}>
                <Paper variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', p: 2.5 }}>
                  <Stack spacing={2}>
                    <JobListingDetailCountdown expiresAt={expiresAt} />
                    <Divider />
                    <Stack direction="row" spacing={1.25}>
                      <Button
                        variant="outlined"
                        onClick={onToggleSave}
                        startIcon={<BookmarkSimpleIcon size={18} weight={saved ? 'fill' : 'regular'} />}
                        sx={{
                          flex: 1,
                          py: 1.35,
                          borderRadius: 2.5,
                          fontWeight: 800,
                          textTransform: 'none',
                          borderWidth: 2,
                          ...(saved ? { borderColor: 'primary.main', color: 'primary.main' } : {}),
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
                            py: 1.35,
                            borderRadius: 2.5,
                            fontWeight: 800,
                            textTransform: 'none',
                            boxShadow: 'none',
                          }}
                        >
                          Apliko tani
                        </Button>
                      ) : (
                        <Button variant="contained" disabled sx={{ flex: 1.35, py: 1.35, borderRadius: 2.5, textTransform: 'none' }}>
                          Apliko tani
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Stack>
            </Box>
          </Grid>
        </Grid>
        </Stack>
      </Container>
    </Box>
  );
}

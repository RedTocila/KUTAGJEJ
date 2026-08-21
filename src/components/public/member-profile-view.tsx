'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { ListingKeywordSearchInput } from '@/components/public/listing-filters/listing-keyword-search-input';
import { MemberLeaveReviewButton } from '@/components/public/member-leave-review-button';
import { ProductBackButton, ProductTag } from '@/components/public/product-browse-chrome';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { CalendarBlank as CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { ChatsCircle as ChatsCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatsCircle';
import { ListingTrustBadge } from '@/components/public/listing-trust-badge';
import { MemberReferralBadgesRow, MemberReferralBadgesSkeleton } from '@/components/public/member-referral-badges';
import { ShieldCheck as ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { User as UserIcon } from '@phosphor-icons/react/dist/ssr/User';

import {
  HomepageMixedListingCard,
  mixedListingKey,
} from '@/components/public/homepage-mixed-listing-card';
import {
  MemberReviewsDialog,
  MemberSeeReviewsButton,
} from '@/components/public/member-reviews-dialog';
import { BrandCover } from '@/components/brand/brand-cover';
import {
  ListingVerifiedBadge,
  ProfessionalRatingSummary,
} from '@/components/public/professional-listing-detail-ui';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { formatRatingDisplay } from '@/lib/format-rating';
import type { HomepageMixedListing } from '@/lib/homepage-latest-listings';
import { startConversationWithMember } from '@/lib/conversations-client';
import { clientFetch } from '@/lib/api-client';
import { hasStoredAccessToken } from '@/lib/auth/storage';
import { listMemberReviews } from '@/lib/member-reviews-client';
import {
  memberInitials,
  mergeMemberReferralBadges,
  type PublicMemberListingsBundle,
  type PublicMemberReferralBadge,
} from '@/lib/public-member-client';
import type { PublicRealEstateListingSeller } from '@/lib/public-listings-client';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

type FilterKey = 'all' | HomepageMixedListing['kind'];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function matchesSearch(query: string, parts: Array<string | number | null | undefined>): boolean {
  if (!query) return true;
  const haystack = normalizeSearch(
    parts.filter((p) => p != null && String(p).trim() !== '').join(' '),
  );
  return haystack.includes(query);
}

function mixedListingMatches(item: HomepageMixedListing, query: string): boolean {
  const listing = item.listing;
  switch (item.kind) {
    case 'real-estate':
      return matchesSearch(query, [
        listing.title,
        listing.description,
        listing.cityName,
        listing.zoneName,
        listing.propertyCategory,
        listing.transactionType,
        listing.price,
        listing.currency,
      ]);
    case 'cars':
      return matchesSearch(query, [
        listing.make,
        listing.model,
        listing.variant,
        listing.year,
        listing.fuelType,
        listing.vehicleType,
        listing.color,
        listing.cityName,
        listing.description,
        listing.price,
        listing.currency,
      ]);
    case 'jobs':
      return matchesSearch(query, [
        listing.title,
        listing.description,
        listing.cityName,
        listing.industry,
        listing.jobType,
        listing.workLocation,
        listing.education,
        listing.experience,
      ]);
    case 'marketplace':
      return matchesSearch(query, [
        listing.title,
        listing.description,
        listing.cityName,
        listing.category,
        listing.condition,
        listing.price,
        listing.currency,
      ]);
    case 'businesses':
    case 'professionals':
      return matchesSearch(query, [
        listing.title,
        listing.description,
        listing.cityName,
        listing.zoneName,
        listing.category,
        listing.categoryLabel,
        listing.servicesHighlight,
        listing.announcementTitle,
        listing.announcementSubtitle,
      ]);
  }
}

const FILTERS: { key: FilterKey; label: string; totalKey?: keyof PublicMemberListingsBundle['totals'] }[] = [
  { key: 'all', label: 'Të gjitha' },
  { key: 'real-estate', label: 'Prona', totalKey: 'realEstate' },
  { key: 'cars', label: 'Makina', totalKey: 'cars' },
  { key: 'jobs', label: 'Punë', totalKey: 'jobs' },
  { key: 'marketplace', label: 'Tregu', totalKey: 'marketplace' },
  { key: 'businesses', label: 'Biznese', totalKey: 'businesses' },
  { key: 'professionals', label: 'Profesionistë', totalKey: 'professionals' },
];

function memberSinceParts(iso: string | undefined): { year: number; monthYear: string } | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getFullYear(),
    monthYear: date.toLocaleDateString('sq-AL', { month: 'long', year: 'numeric' }),
  };
}

function MemberContactButton({
  memberId,
  pill = false,
}: {
  memberId: string;
  pill?: boolean;
}) {
  const router = useRouter();
  const { user, isLoading, checkSession } = useUser();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    if (isLoading) return;

    const hasToken = typeof window !== 'undefined' && hasStoredAccessToken();
    if (!user && !hasToken) {
      router.push(paths.user.auth);
      return;
    }

    if (!user && hasToken) {
      await checkSession();
    }

    setLoading(true);
    try {
      const res = await startConversationWithMember(memberId);
      if (res.error || !res.conversation) {
        const message = res.error ?? 'Nuk u krijua biseda.';
        if (/auth required|invalid token|çaktivizuar/i.test(message)) {
          router.push(paths.user.auth);
          return;
        }
        setError(message);
        return;
      }
      router.push(`${paths.user.messages}?c=${encodeURIComponent(res.conversation.id)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Button
        type="button"
        variant="contained"
        disableElevation
        fullWidth
        disabled={loading || isLoading}
        onClick={() => void handleClick()}
        startIcon={
          loading || isLoading ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            <ChatsCircleIcon size={20} weight="fill" />
          )
        }
        sx={{
          borderRadius: pill ? 999 : 2.5,
          fontWeight: 800,
          textTransform: 'none',
          color: 'primary.contrastText',
          boxShadow: 'none',
          py: pill ? 1.5 : 1.5,
          fontSize: pill ? '1rem' : undefined,
          '&:hover': { color: 'primary.contrastText' },
          '& .MuiButton-startIcon': { color: 'inherit' },
        }}
      >
        Kontakto
      </Button>
      {error ? (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, fontWeight: 600, textAlign: 'center' }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}

export function MemberProfileView({
  member,
  listings,
  mixed,
  badges = [],
}: {
  member: PublicRealEstateListingSeller;
  listings: PublicMemberListingsBundle;
  mixed: HomepageMixedListing[];
  badges?: PublicMemberReferralBadge[];
}) {
  const router = useRouter();
  const { user } = useUser();
  const [filter, setFilter] = React.useState<FilterKey>('all');
  const [search, setSearch] = React.useState('');
  const [reviewsOpen, setReviewsOpen] = React.useState(false);
  const [viewerHasReviewed, setViewerHasReviewed] = React.useState(false);
  const [liveBadges, setLiveBadges] = React.useState<PublicMemberReferralBadge[] | null>(null);
  const [badgesLoading, setBadgesLoading] = React.useState(true);

  const name = member.displayName?.trim() || 'Përdorues KuTaGjej';
  const initials = memberInitials(name);
  const since = memberSinceParts(member.memberSince);
  const isBusiness = member.kind === 'business';
  const totalActive = listings.totals.all;
  const memberId = member.id?.trim() || '';
  const reviewCount = member.reviewCount ?? 0;
  const isOwnProfile = Boolean(user?.id && memberId && String(user.id) === String(memberId));
  const showLeaveReview = Boolean(memberId) && !isOwnProfile && !viewerHasReviewed;
  const displayBadges = React.useMemo(
    () => mergeMemberReferralBadges(liveBadges ?? badges),
    [liveBadges, badges],
  );

  React.useEffect(() => {
    if (!memberId) {
      setBadgesLoading(false);
      return;
    }
    let cancelled = false;
    setBadgesLoading(true);
    void clientFetch<{ badges?: PublicMemberReferralBadge[] }>(
      `/public/members/${encodeURIComponent(memberId)}`,
    ).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setLiveBadges(Array.isArray(res.data?.badges) ? res.data.badges : []);
      }
      setBadgesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  React.useEffect(() => {
    if (!memberId || isOwnProfile) {
      setViewerHasReviewed(false);
      return;
    }
    let cancelled = false;
    void listMemberReviews(memberId).then((res) => {
      if (cancelled) return;
      setViewerHasReviewed(Boolean(res.viewerHasReviewed));
    });
    return () => {
      cancelled = true;
    };
  }, [memberId, isOwnProfile, user?.id]);

  const visibleFilters = FILTERS.filter((f) => {
    if (f.key === 'all') return true;
    if (!f.totalKey) return false;
    return (listings.totals[f.totalKey] ?? 0) > 0;
  });

  const searchQuery = React.useMemo(() => normalizeSearch(search), [search]);
  const filtered = React.useMemo(() => {
    const byCategory = filter === 'all' ? mixed : mixed.filter((item) => item.kind === filter);
    if (!searchQuery) return byCategory;
    return byCategory.filter((item) => mixedListingMatches(item, searchQuery));
  }, [mixed, filter, searchQuery]);

  const showOwner =
    isBusiness &&
    member.businessOwner?.trim() &&
    member.businessOwner.trim().toLowerCase() !== name.toLowerCase();

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        pb: { xs: 6, md: 8 },
        minHeight: '60vh',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: { xs: '0 0 24px 24px', md: 4 },
          border: '1px solid',
          borderColor: 'divider',
          borderTop: { xs: 'none', md: '1px solid' },
          borderTopColor: { md: 'divider' },
          bgcolor: 'background.paper',
          mb: { xs: 3, md: 4 },
          mt: { md: 3 },
          mx: { md: 'auto' },
          maxWidth: { md: 900 },
          width: { md: 'calc(100% - 48px)' },
        }}
      >
        <BrandCover sx={{ height: { xs: 148, sm: 176 } }}>
          <ProductBackButton
            href={paths.home}
            aria-label="Kthehu"
            sx={{
              position: 'absolute',
              top: { xs: 'max(10px, env(safe-area-inset-top, 0px))', sm: 14 },
              left: { xs: 8, sm: 12 },
              zIndex: 2,
            }}
          />
        </BrandCover>

        <Stack
          spacing={2.5}
          sx={{
            px: { xs: 2.25, sm: 3.5 },
            pb: { xs: 2.75, sm: 3.5 },
            mt: { xs: -5, sm: -6 },
          }}
        >
            <Box sx={{ position: 'relative' }}>
              <ButtonBase
                onClick={() => setReviewsOpen(true)}
                aria-label={`Shiko vlerësimet (${reviewCount})`}
                sx={(theme) => ({
                  position: 'absolute',
                  top: {
                    xs: `calc(${theme.spacing(5)} + 4px)`,
                    sm: `calc(${theme.spacing(6)} + 4px)`,
                  },
                  right: 0,
                  zIndex: 1,
                  borderRadius: 999,
                  px: 0.5,
                  py: 0.25,
                  '&:hover': { bgcolor: 'action.hover' },
                })}
              >
                <ProfessionalRatingSummary
                  rating={formatRatingDisplay(member.ratingAverage)}
                  reviewCount={reviewCount}
                  starSize={18}
                />
              </ButtonBase>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 2, sm: 2.5 }}
              sx={{ alignItems: { sm: 'flex-end' } }}
            >
              <Avatar
                src={member.avatarUrl || undefined}
                alt={name}
                sx={{
                  width: { xs: 88, sm: 104 },
                  height: { xs: 88, sm: 104 },
                  bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.18 : 0.14),
                  color: 'primary.main',
                  fontWeight: 800,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                  border: '3px solid',
                  borderColor: 'background.paper',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 8px 24px rgba(0,0,0,0.45)'
                      : '0 8px 24px rgba(0,0,0,0.08)',
                }}
              >
                {initials}
              </Avatar>

              <Stack spacing={1} sx={{ flex: '1 1 auto', minWidth: 0, pb: { sm: 0.5 }, pr: { sm: 12 } }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75 }}
                >
                  <Typography
                    component="h1"
                    sx={{
                      fontWeight: 850,
                      fontSize: { xs: '1.45rem', sm: '1.75rem' },
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {name}
                    {member.verified ? (
                      <Box
                        component="span"
                        sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.5, lineHeight: 0 }}
                      >
                        <ListingVerifiedBadge size={22} aria-label="Profil i verifikuar" />
                      </Box>
                    ) : null}
                    {member.trustBadge ? (
                      <Box
                        component="span"
                        sx={{ display: 'inline-flex', verticalAlign: 'middle', ml: 0.5, lineHeight: 0 }}
                      >
                        <ListingTrustBadge size={22} />
                      </Box>
                    ) : null}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 0.75, minWidth: 0 }}>
                    <Chip
                      size="small"
                      icon={
                        isBusiness ? (
                          <BuildingsIcon size={14} weight="fill" />
                        ) : (
                          <UserIcon size={14} weight="fill" />
                        )
                      }
                      label={isBusiness ? 'Biznes' : 'Individ'}
                      sx={{
                        fontWeight: 700,
                        bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.14 : 0.1),
                        color: 'primary.main',
                        border: 'none',
                        '& .MuiChip-icon': { color: 'inherit', ml: 0.75 },
                      }}
                    />
                    {member.verified ? (
                      <Chip
                        size="small"
                        icon={<ShieldCheckIcon size={14} weight="fill" />}
                        label="Ky profil është i verifikuar"
                        sx={{
                          fontWeight: 700,
                          bgcolor: 'rgba(var(--mui-palette-success-mainChannel) / 0.14)',
                          border: '1px solid',
                          borderColor: 'rgba(var(--mui-palette-success-mainChannel) / 0.45)',
                          color: 'success.main',
                          '& .MuiChip-icon': { color: 'success.main', ml: 0.75 },
                        }}
                      />
                    ) : null}
                </Stack>

                <Stack spacing={1.25}>
                  {since ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                      <CalendarBlankIcon size={18} weight="duotone" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Anëtar që prej {since.year}
                        <Box component="span" sx={{ opacity: 0.7, fontWeight: 500 }}>
                          {' '}
                          · {since.monthYear}
                        </Box>
                      </Typography>
                    </Stack>
                  ) : null}

                  {showOwner ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                      <UserIcon size={18} weight="duotone" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Pronar: {member.businessOwner}
                      </Typography>
                    </Stack>
                  ) : null}

                  {member.businessCategory?.trim() ? (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                      <StorefrontIcon size={18} weight="duotone" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {member.businessCategory.trim()}
                      </Typography>
                    </Stack>
                  ) : null}
                </Stack>

                {badgesLoading ? (
                  <MemberReferralBadgesSkeleton columns={5} count={5} />
                ) : displayBadges.length > 0 ? (
                  <Box sx={{ width: '100%', pt: 0.25 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', fontWeight: 700, mb: 1, textAlign: 'center' }}
                    >
                      Badges
                    </Typography>
                    <MemberReferralBadgesRow
                      badges={displayBadges}
                      selfView={isOwnProfile}
                      layout="grid"
                      columns={5}
                    />
                  </Box>
                ) : null}
              </Stack>
            </Stack>
            </Box>

            <Box
              sx={{
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                px: 2,
                py: 1.5,
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  fontWeight: 850,
                  fontSize: '1.35rem',
                  color: 'primary.main',
                  lineHeight: 1.2,
                }}
              >
                {totalActive}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                Njoftime aktive
              </Typography>
            </Box>

            {memberId ? (
              <Stack spacing={1}>
                <MemberContactButton memberId={memberId} pill />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {showLeaveReview ? (
                    <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                      <MemberLeaveReviewButton
                        memberId={memberId}
                        memberName={name}
                        pill
                        hasReviewed={viewerHasReviewed}
                        onSubmitted={() => {
                          setViewerHasReviewed(true);
                          router.refresh();
                        }}
                      />
                    </Box>
                  ) : null}
                  <Box sx={{ flex: showLeaveReview ? '1 1 0' : '1 1 auto', minWidth: 0, width: showLeaveReview ? undefined : '100%' }}>
                    <MemberSeeReviewsButton
                      onClick={() => setReviewsOpen(true)}
                      pill
                    />
                  </Box>
                </Stack>
              </Stack>
            ) : null}
          </Stack>

          {memberId ? (
            <MemberReviewsDialog
              memberId={memberId}
              memberName={name}
              open={reviewsOpen}
              onClose={() => setReviewsOpen(false)}
              ratingAverage={member.ratingAverage}
              reviewCount={reviewCount}
              onReviewSubmitted={() => {
                setViewerHasReviewed(true);
                router.refresh();
              }}
            />
          ) : null}
      </Box>

      <Container maxWidth="md">
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { sm: 'baseline' }, justifyContent: 'space-between' }}
          >
            <Typography
              component="h2"
              sx={{
                fontWeight: 850,
                fontSize: { xs: '1.15rem', sm: '1.25rem' },
                letterSpacing: '-0.01em',
              }}
            >
              Njoftime aktive
            </Typography>
            {totalActive > 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {filtered.length} {filtered.length === 1 ? 'njoftim' : 'njoftime'}
                {filter !== 'all' && !searchQuery ? ' në këtë kategori' : ''}
              </Typography>
            ) : null}
          </Stack>

          {totalActive === 0 ? (
            <Box
              sx={{
                borderRadius: 3,
                border: '1px dashed',
                borderColor: 'divider',
                px: 3,
                py: 5,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Nuk ka njoftime aktive</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Ky anëtar nuk ka publikuar ende njoftime publike.
              </Typography>
            </Box>
          ) : (
            <>
              <ListingKeywordSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Kërko njoftimet…"
              />

              {visibleFilters.length > 2 ? (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    overflowX: 'auto',
                    pb: 0.5,
                    mx: { xs: -0.25, sm: 0 },
                    px: { xs: 0.25, sm: 0 },
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {visibleFilters.map((f) => {
                    const count =
                      f.key === 'all' ? totalActive : f.totalKey ? listings.totals[f.totalKey] : 0;
                    const selected = filter === f.key;
                    return (
                      <ProductTag
                        key={f.key}
                        label={`${f.label} · ${count}`}
                        active={selected}
                        onClick={() => setFilter(f.key)}
                        sx={{ flexShrink: 0 }}
                      />
                    );
                  })}
                </Stack>
              ) : null}

              {filtered.length === 0 ? (
                <Box
                  sx={{
                    borderRadius: 3,
                    border: '1px dashed',
                    borderColor: 'divider',
                    px: 3,
                    py: 4,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {searchQuery
                      ? 'Nuk u gjet asnjë njoftim për këtë kërkim.'
                      : 'Nuk ka njoftime në këtë kategori.'}
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gap: { xs: 1.75, sm: 2 },
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                    },
                  }}
                >
                  {filtered.map((item) => (
                    <HomepageMixedListingCard
                      key={mixedListingKey(item)}
                      item={item}
                      sellerRating={{
                        ratingAverage: member.ratingAverage ?? null,
                        reviewCount: member.reviewCount ?? 0,
                      }}
                    />
                  ))}
                </Box>
              )}
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

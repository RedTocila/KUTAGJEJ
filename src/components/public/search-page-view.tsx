'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import RouterLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { MemberProfileCard } from '@/components/public/listing-cards/member-profile-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { HeroCategoryCircles } from '@/components/public/hero-category-circles';
import { ListingCardsSkeleton } from '@/components/core/content-skeletons';
import {
  ProductSearchIcon,
  productSearchBarSx,
} from '@/components/public/product-browse-chrome';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useHistoryBackProps } from '@/hooks/use-navigate-back';
import { useScrollRevealHidden } from '@/hooks/use-scroll-reveal-hidden';
import { fetchAiSearch, type AiSearchResult } from '@/lib/ai-search-client';
import { hardRefreshToTop } from '@/lib/hard-navigate';
import {
  MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
  MOBILE_BOTTOM_NAV_FLOAT_INSET_PX,
  MOBILE_SEARCH_BAR_PADDING,
  MOBILE_SEARCH_DOCK_BOTTOM_PADDING_PX,
  MOBILE_SEARCH_DOCK_PADDING,
} from '@/lib/mobile-layout';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_SOFT,
  findVertical,
  isHomeVerticalId,
  isProfilesSearchCategory,
  isSearchCategoryId,
  localizeSearchCategories,
  type HomeVerticalId,
  type SearchCategoryId,
} from '@/lib/home-categories';
import { buildBrowseUrlQuery, type BrowseFilters } from '@/lib/listing-filters';
import {
  fetchBrowseBusinesses,
  fetchBrowseCars,
  fetchBrowseJobs,
  fetchBrowseMarketplace,
  fetchBrowseProfessionals,
  fetchBrowseRealEstate,
  type PublicCarListing,
  type PublicDirectoryListing,
  type PublicJobListing,
  type PublicMarketplaceListing,
  type PublicRealEstateListing,
} from '@/lib/public-listings-client';
import { fetchPublicMemberSearch, type PublicMemberSearchHit } from '@/lib/public-member-client';
import { paths } from '@/paths';
import { MOTION } from '@/styles/motion';

const PAGE_SIZE = 24;

type SearchItem =
  | { kind: 'real-estate'; listing: PublicRealEstateListing }
  | { kind: 'car'; listing: PublicCarListing }
  | { kind: 'job'; listing: PublicJobListing }
  | { kind: 'marketplace'; listing: PublicMarketplaceListing }
  | { kind: 'businesses'; listing: PublicDirectoryListing }
  | { kind: 'professionals'; listing: PublicDirectoryListing }
  | { kind: 'profile'; member: PublicMemberSearchHit };

function searchItemKey(item: SearchItem): string {
  if (item.kind === 'profile') return `profile-${item.member.id}`;
  return `${item.kind}-${item.listing.id}`;
}

function buildAiBrowseHref(intent: AiSearchResult['intent']): string | null {
  const verticalId = intent.verticals.find((v): v is HomeVerticalId => isHomeVerticalId(v));
  if (!verticalId) return null;

  const vertical = findVertical(verticalId);
  const raw = { ...(intent.filters || {}) } as Record<string, string | string[] | undefined>;
  if (intent.q && !raw.q) raw.q = intent.q;

  // Browse URLs accept repeated `zone` keys; normalize a single zone id.
  if (typeof raw.zone === 'string' && raw.zone.trim()) {
    raw.zone = [raw.zone.trim()];
  }

  const qs = buildBrowseUrlQuery(raw as BrowseFilters);
  return `${vertical.href}${qs}`;
}

async function fetchVerticalResults(
  verticalId: HomeVerticalId,
  query: string,
): Promise<{ items: SearchItem[]; total: number }> {
  const filters = { q: query.trim() || undefined };
  switch (verticalId) {
    case 'real-estate': {
      const res = await fetchBrowseRealEstate(PAGE_SIZE, filters);
      return {
        items: res.listings.map((listing) => ({ kind: 'real-estate' as const, listing })),
        total: res.total,
      };
    }
    case 'cars': {
      const res = await fetchBrowseCars(PAGE_SIZE, filters);
      return {
        items: res.listings.map((listing) => ({ kind: 'car' as const, listing })),
        total: res.total,
      };
    }
    case 'jobs': {
      const res = await fetchBrowseJobs(PAGE_SIZE, filters);
      return {
        items: res.listings.map((listing) => ({ kind: 'job' as const, listing })),
        total: res.total,
      };
    }
    case 'marketplace': {
      const res = await fetchBrowseMarketplace(PAGE_SIZE, filters);
      return {
        items: res.listings.map((listing) => ({ kind: 'marketplace' as const, listing })),
        total: res.total,
      };
    }
    case 'businesses': {
      const res = await fetchBrowseBusinesses(PAGE_SIZE, filters);
      return {
        items: res.listings.map((listing) => ({ kind: 'businesses' as const, listing })),
        total: res.total,
      };
    }
    case 'professionals': {
      const res = await fetchBrowseProfessionals(PAGE_SIZE, filters);
      return {
        items: res.listings.map((listing) => ({ kind: 'professionals' as const, listing })),
        total: res.total,
      };
    }
    default:
      return { items: [], total: 0 };
  }
}

/** Pins the /kerko dock to `document.body` on mobile so listing cards cannot paint over it. */
function SearchDockLayer({
  children,
  portaled = true,
}: {
  children: React.ReactNode;
  portaled?: boolean;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [host, setHost] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setHost(document.body);
  }, []);

  if (portaled && isMobile && host) return createPortal(children, host);
  return children;
}

function ResultCard({ item }: { item: SearchItem }) {
  switch (item.kind) {
    case 'real-estate':
      return <RealEstateCard listing={item.listing} />;
    case 'car':
      return <CarCard listing={item.listing} />;
    case 'job':
      return <JobCard listing={item.listing} />;
    case 'marketplace':
      return <MarketplaceCard listing={item.listing} />;
    case 'businesses':
    case 'professionals':
      return <DirectoryListingCard listing={item.listing} />;
    case 'profile':
      return <MemberProfileCard member={item.member} />;
    default:
      return null;
  }
}

export function SearchPageView({
  variant = 'page',
  onClose,
  onNavigate,
}: {
  variant?: 'page' | 'overlay';
  onClose?: () => void;
  onNavigate?: () => void;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const historyBack = useHistoryBackProps(paths.home);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  const t = useCopy();
  const isOverlay = variant === 'overlay';
  const localizedCategories = React.useMemo(() => localizeSearchCategories(language), [language]);

  const urlCat = searchParams.get('cat');
  const urlQ = searchParams.get('q') ?? '';
  const initialCategory =
    urlCat && urlCat !== 'okazion' && isSearchCategoryId(urlCat) ? urlCat : null;

  const [categoryId, setCategoryId] = React.useState<SearchCategoryId | null>(initialCategory);
  const [query, setQuery] = React.useState(urlQ);
  const [submittedQuery, setSubmittedQuery] = React.useState(urlQ);
  const [hasSearched, setHasSearched] = React.useState(
    Boolean(initialCategory && initialCategory !== 'ai' && urlQ.trim()),
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<SearchItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [aiReply, setAiReply] = React.useState<string | null>(null);
  const [inputExpanded, setInputExpanded] = React.useState(false);
  const [entered, setEntered] = React.useState(isOverlay);
  const categoriesHidden = useScrollRevealHidden({ alwaysShowBelowY: 24 });

  const selectedIndex = categoryId
    ? localizedCategories.findIndex((v) => v.id === categoryId)
    : -1;
  const activeCategory = categoryId
    ? (localizedCategories.find((v) => v.id === categoryId) ?? null)
    : null;
  const isAi = categoryId === 'ai';
  const isProfiles = categoryId === 'profiles';

  React.useEffect(() => {
    if (isOverlay) {
      setEntered(true);
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setEntered(true);
      return;
    }
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, [isOverlay]);

  React.useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || !query) {
      setInputExpanded(false);
      return;
    }
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
      setInputExpanded(el.scrollHeight > lineHeight + 4);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [query, categoryId]);

  const goTo = React.useCallback(
    (href: string) => {
      onNavigate?.();
      if (isOverlay) {
        router.replace(href);
        return;
      }
      router.push(href);
    },
    [isOverlay, onNavigate, router],
  );

  const syncUrl = React.useCallback(
    (nextCat: SearchCategoryId | null, nextQ: string) => {
      if (isOverlay) return;
      const params = new URLSearchParams();
      if (nextCat) params.set('cat', nextCat);
      const trimmed = nextQ.trim();
      if (trimmed) params.set('q', trimmed);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [isOverlay, pathname, router],
  );

  const runVerticalSearch = React.useCallback(
    async (cat: HomeVerticalId, q: string) => {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      setSubmittedQuery(q.trim());
      setAiReply(null);
      try {
        const res = await fetchVerticalResults(cat, q);
        setItems(res.items);
        setTotal(res.total);
      } catch {
        setItems([]);
        setTotal(0);
        setError(t.search.failed);
      } finally {
        setLoading(false);
      }
    },
    [t.search.failed],
  );

  const runProfileSearch = React.useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      setSubmittedQuery(q.trim());
      setAiReply(null);
      try {
        const res = await fetchPublicMemberSearch(q, PAGE_SIZE);
        if (!res.ok) {
          setItems([]);
          setTotal(0);
          setError(t.search.failed);
          return;
        }
        setItems(res.members.map((member) => ({ kind: 'profile' as const, member })));
        setTotal(res.total);
      } catch {
        setItems([]);
        setTotal(0);
        setError(t.search.failed);
      } finally {
        setLoading(false);
      }
    },
    [t.search.failed],
  );

  const runAiNavigate = React.useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      setLoading(true);
      setError(null);
      setHasSearched(true);
      setSubmittedQuery(trimmed);
      setAiReply(null);
      setItems([]);
      setTotal(0);
      syncUrl('ai', trimmed);

      try {
        const res = await fetchAiSearch(trimmed, { language, interpretOnly: true });
        setAiReply(res.reply || null);
        const href = buildAiBrowseHref(res.intent);
        if (!href) {
          setError(t.search.failed);
          setLoading(false);
          return;
        }
        goTo(href);
      } catch {
        setAiReply(null);
        setError(t.search.failed);
        setLoading(false);
      }
    },
    [goTo, language, syncUrl, t.search.failed],
  );

  React.useEffect(() => {
    if (!initialCategory || initialCategory === 'ai') return;
    if (!urlQ.trim()) return;
    if (isProfilesSearchCategory(initialCategory)) {
      void runProfileSearch(urlQ);
      return;
    }
    if (!isHomeVerticalId(initialCategory)) return;
    void runVerticalSearch(initialCategory, urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-link: /kerko?cat=ai&q=… → interpret once and jump to the browse page.
  React.useEffect(() => {
    if (initialCategory !== 'ai') return;
    if (!urlQ.trim()) return;
    void runAiNavigate(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!categoryId) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [categoryId]);

  // Live results while typing (debounced). AI only runs on explicit submit.
  React.useEffect(() => {
    if (!categoryId || categoryId === 'ai') return;
    if (!isHomeVerticalId(categoryId) && !isProfilesSearchCategory(categoryId)) return;
    const trimmed = query.trim();

    if (!trimmed) {
      setItems([]);
      setTotal(0);
      setHasSearched(false);
      setSubmittedQuery('');
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const handle = window.setTimeout(() => {
      syncUrl(categoryId, trimmed);
      if (isProfilesSearchCategory(categoryId)) {
        void runProfileSearch(trimmed);
        return;
      }
      void runVerticalSearch(categoryId, trimmed);
    }, 280);

    return () => window.clearTimeout(handle);
  }, [query, categoryId, runProfileSearch, runVerticalSearch, syncUrl]);

  const handleSelectCategory = (index: number) => {
    const next = localizedCategories[index];
    if (!next) return;
    if (categoryId === next.id) {
      if (!isOverlay) hardRefreshToTop();
      return;
    }
    setCategoryId(next.id);
    setQuery('');
    setItems([]);
    setTotal(0);
    setHasSearched(false);
    setSubmittedQuery('');
    setError(null);
    setLoading(false);
    setAiReply(null);
    syncUrl(next.id, '');
  };

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!categoryId || !activeCategory) return;
    const trimmed = query.trim();
    if (categoryId === 'ai') {
      if (!trimmed) return;
      void runAiNavigate(trimmed);
      return;
    }
    if (categoryId === 'profiles') {
      if (!trimmed) return;
      syncUrl('profiles', trimmed);
      void runProfileSearch(trimmed);
      return;
    }
    const base = activeCategory.href.split('?')[0];
    const href = trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
    goTo(href);
  };

  const searchAccent = isAi ? { color: AI_SEARCH_BLUE, soft: AI_SEARCH_BLUE_SOFT } : undefined;

  return (
    <Container
      maxWidth="xl"
      sx={{
        pt: { xs: 1.5, md: 2.5 },
        pb: { xs: categoriesHidden ? MOBILE_SEARCH_BAR_PADDING : MOBILE_SEARCH_DOCK_PADDING, lg: 4 },
        px: { xs: 2, sm: 3 },
        display: 'flex',
        flexDirection: 'column',
        flex: isOverlay ? 1 : undefined,
        minHeight: isOverlay ? '100%' : '100dvh',
        height: isOverlay ? '100%' : 'auto',
        overflow: isOverlay ? 'auto' : 'visible',
        transition: `padding-bottom ${MOTION.base} ${MOTION.ease}`,
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
          {t.search.title}
        </Typography>
        <IconButton
          {...(onClose
            ? { onClick: onClose }
            : { component: RouterLink, ...historyBack })}
          aria-label={t.common.close}
          edge="end"
          size="small"
        >
          <XIcon size={22} weight="bold" />
        </IconButton>
      </Stack>

      <SearchDockLayer portaled={!isOverlay}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: categoriesHidden ? 0 : 1.5, lg: 2 },
          mt: { xs: 0, lg: 2 },
          width: { xs: '100%', lg: 'auto' },
          position: { xs: 'fixed', lg: 'static' },
          left: { xs: 0, lg: 'auto' },
          right: { xs: 0, lg: 'auto' },
          bottom: {
            xs: 0,
            lg: 'auto',
          },
          zIndex: { xs: 4000, lg: 'auto' },
          isolation: { xs: 'isolate', lg: 'auto' },
          px: { xs: 2, sm: 3, lg: 0 },
          pt: { xs: categoriesHidden ? 0 : 1.25, lg: 0 },
          pb: {
            xs: `calc(${MOBILE_SEARCH_DOCK_BOTTOM_PADDING_PX}px + ${MOBILE_BOTTOM_NAV_FLOAT_INSET_PX}px + env(safe-area-inset-bottom, 0px))`,
            lg: 0,
          },
          alignItems: { xs: 'center', lg: 'stretch' },
          bgcolor: { xs: 'background.default', lg: 'transparent' },
          transform: {
            xs: entered ? 'translate3d(0, 0, 0)' : 'translate3d(0, 100%, 0)',
            lg: 'none',
          },
          transition: {
            xs: `transform ${MOTION.enter} ${MOTION.ease}, gap ${MOTION.base} ${MOTION.ease}, padding-top ${MOTION.base} ${MOTION.ease}`,
            lg: 'none',
          },
          willChange: { xs: 'transform', lg: 'auto' },
          '@media (prefers-reduced-motion: reduce)': {
            transform: 'none',
            transition: 'none',
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: { xs: 'grid', lg: 'block' },
            gridTemplateRows: { xs: categoriesHidden ? '0fr' : '1fr', lg: 'none' },
            opacity: { xs: categoriesHidden ? 0 : 1, lg: 1 },
            pointerEvents: { xs: categoriesHidden ? 'none' : 'auto', lg: 'auto' },
            transition: `grid-template-rows ${MOTION.base} ${MOTION.ease}, opacity ${MOTION.fast} ${MOTION.ease}`,
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
            },
          }}
        >
          <Box
            sx={{
              minHeight: 0,
              overflow: 'hidden',
              transform: {
                xs: categoriesHidden ? 'translate3d(0, 16px, 0)' : 'translate3d(0, 0, 0)',
                lg: 'none',
              },
              transition: `transform ${MOTION.base} ${MOTION.ease}`,
              '@media (prefers-reduced-motion: reduce)': {
                transform: 'none',
                transition: 'none',
              },
            }}
          >
            <HeroCategoryCircles variant="tabs" selectedIndex={selectedIndex} onSelect={handleSelectCategory} />
          </Box>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          aria-disabled={!categoryId}
          sx={(theme) => ({
            display: 'flex',
            flexDirection: 'row',
            alignItems: inputExpanded ? 'flex-end' : 'center',
            width: '100%',
            maxWidth: { xs: 420, lg: 'none' },
            [theme.breakpoints.up('lg')]: {
              ...productSearchBarSx(Boolean(categoryId && query.trim()), searchAccent),
              gap: 1,
              p: 1,
              height: 'auto',
              minHeight: 40,
              borderRadius: inputExpanded ? 2.5 : 999,
              ...(!categoryId
                ? {
                    opacity: 0.48,
                    cursor: 'not-allowed',
                    bgcolor: 'action.hover',
                  }
                : null),
            },
            [theme.breakpoints.down('lg')]: {
              gap: 1.25,
              p: 0,
              bgcolor: 'transparent',
              border: 'none',
              overflow: 'visible',
              height: 'auto',
              minHeight: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
            },
          })}
        >
          <Box
            sx={(theme) => ({
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: inputExpanded ? 'flex-end' : 'center',
              [theme.breakpoints.down('lg')]: {
                ...productSearchBarSx(Boolean(categoryId && query.trim()), searchAccent),
                height: inputExpanded ? 'auto' : MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
                minHeight: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
                px: 1.5,
                py: 0.5,
                overflow: 'hidden',
                opacity: categoryId ? 1 : 0.55,
              },
            })}
          >
            <TextField
              fullWidth
              size="small"
              autoComplete="off"
              disabled={!categoryId}
              inputRef={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (!categoryId) {
                  event.preventDefault();
                  return;
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={activeCategory?.searchPlaceholder ?? t.search.genericPlaceholder}
              multiline
              minRows={1}
              maxRows={4}
              slotProps={{
                input: {
                  readOnly: !categoryId,
                  startAdornment: (
                    <InputAdornment
                      position="start"
                      sx={{
                        alignSelf: inputExpanded ? 'flex-start' : 'center',
                        mt: inputExpanded ? 0.75 : 0,
                      }}
                    >
                      {isAi ? (
                        <SparkleIcon size={18} color={AI_SEARCH_BLUE} />
                      ) : (
                        <ProductSearchIcon />
                      )}
                    </InputAdornment>
                  ),
                  endAdornment: query ? (
                    <InputAdornment
                      position="end"
                      sx={{ alignSelf: inputExpanded ? 'flex-start' : 'center', mt: inputExpanded ? 0.5 : 0 }}
                    >
                      <IconButton
                        size="small"
                        aria-label={t.search.clear}
                        onClick={() => setQuery('')}
                        edge="end"
                        disabled={!categoryId}
                      >
                        <XIcon size={14} weight="bold" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'transparent',
                  alignItems: inputExpanded ? 'flex-start' : 'center',
                  py: 0.25,
                  cursor: categoryId ? 'text' : 'not-allowed',
                  '& fieldset': { border: 'none' },
                  '&.Mui-disabled': {
                    bgcolor: 'transparent',
                    '& textarea': { WebkitTextFillColor: 'inherit', color: 'text.disabled' },
                  },
                },
                '& textarea': {
                  resize: 'none',
                  lineHeight: 1.4,
                  ...(!query
                    ? {
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden !important',
                      }
                    : null),
                },
              }}
            />
          </Box>
          <IconButton
            type="submit"
            aria-label={t.search.title}
            disabled={!categoryId || (loading && isAi)}
            sx={{
              flexShrink: 0,
              alignSelf: inputExpanded ? 'flex-end' : 'center',
              p: 0,
              width: { xs: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX, lg: 36 },
              height: { xs: MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX, lg: 36 },
              borderRadius: '50%',
              border: { xs: 'none', lg: '1px solid' },
              color: isAi ? '#fff' : 'primary.contrastText',
              bgcolor: isAi ? AI_SEARCH_BLUE : 'primary.main',
              borderColor: {
                lg: isAi ? AI_SEARCH_BLUE : categoryId ? 'primary.main' : 'divider',
              },
              boxShadow: 'none',
              opacity: categoryId ? 1 : 0.72,
              transition: 'background-color 160ms ease, transform 160ms ease, opacity 160ms ease',
              '&:hover': {
                bgcolor: isAi ? AI_SEARCH_BLUE_HOVER : 'primary.dark',
              },
              '&:active': { transform: 'scale(0.96)' },
              '&.Mui-disabled': {
                bgcolor: isAi ? AI_SEARCH_BLUE : 'primary.main',
                color: isAi ? '#fff' : 'primary.contrastText',
                opacity: 0.72,
              },
            }}
          >
            {loading && isAi ? (
              <CircularProgress size={18} sx={{ color: 'inherit' }} />
            ) : isAi ? (
              <SparkleIcon size={24} weight="bold" />
            ) : (
              <MagnifyingGlassIcon size={24} weight="bold" />
            )}
          </IconButton>
        </Box>
      </Box>
      </SearchDockLayer>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          mt: 2,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 0,
        }}
      >
        {!categoryId ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 0,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t.search.pickCategory}
            </Typography>
          </Box>
        ) : null}

        {aiReply && isAi ? (
          <Alert
            icon={<SparkleIcon size={18} weight="fill" color={AI_SEARCH_BLUE} />}
            severity="info"
            sx={{
              borderRadius: 2,
              bgcolor: 'background.paper',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
              '& .MuiAlert-icon': { color: AI_SEARCH_BLUE },
            }}
          >
            {aiReply}
          </Alert>
        ) : null}

        {error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        {!hasSearched || isAi ? (
          isAi && loading ? (
            <Stack spacing={1.5}>
              <ListingCardsSkeleton count={4} />
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                {t.search.aiThinking}
              </Typography>
            </Stack>
          ) : null
        ) : loading && items.length === 0 ? (
          <ListingCardsSkeleton count={8} />
        ) : items.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t.search.emptyResults(submittedQuery, activeCategory?.label ?? '')}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {(isProfiles ? t.search.profileCount(total) : t.search.listingCount(total)) +
                t.search.resultsSuffix(submittedQuery, activeCategory?.label ?? '')}
            </Typography>
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid
                  key={searchItemKey(item)}
                  size={item.kind === 'profile' ? { xs: 12, md: 6 } : { xs: 12, sm: 6, md: 4, lg: 3 }}
                >
                  <ResultCard item={item} />
                </Grid>
              ))}
            </Grid>
            {activeCategory && !isProfiles && total > items.length ? (
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  component={RouterLink}
                  href={`${activeCategory.href.split('?')[0]}${submittedQuery ? `?q=${encodeURIComponent(submittedQuery)}` : ''}`}
                  variant="text"
                  sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                  {t.search.seeMore}
                </Button>
              </Box>
            ) : null}
          </Stack>
        )}
      </Box>
    </Container>
  );
}

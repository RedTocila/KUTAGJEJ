'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { createPortal } from 'react-dom';

import { paths } from '@/paths';
import { fetchAiSearch, type AiSearchResult } from '@/lib/ai-search-client';
import { hardRefreshToTop } from '@/lib/hard-navigate';
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
  MOBILE_BOTTOM_NAV_CONTENT_HEIGHT_PX,
  MOBILE_BOTTOM_NAV_FLOAT_INSET_PX,
  MOBILE_SEARCH_BAR_PADDING,
  MOBILE_SEARCH_DOCK_BOTTOM_PADDING_PX,
  MOBILE_SEARCH_DOCK_PADDING,
} from '@/lib/mobile-layout';
import {
  fetchBrowseBusinesses,
  fetchBrowseCars,
  fetchBrowseJobs,
  fetchBrowseMarketplace,
  fetchBrowseProfessionals,
  fetchBrowseRealEstate,
} from '@/lib/public-listings-client';
import { fetchPublicMemberSearch, type PublicMemberSearchHit } from '@/lib/public-member-client';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useHistoryBackProps } from '@/hooks/use-navigate-back';
import { useScrollRevealHidden } from '@/hooks/use-scroll-reveal-hidden';
import { TransientNotification } from '@/components/core/transient-success-alert';
import { HeroCategoryCircles } from '@/components/public/hero-category-circles';
import { MemberProfileCard } from '@/components/public/listing-cards/member-profile-card';
import { SearchListingCard, type SearchListingItem } from '@/components/public/listing-cards/search-listing-card';
import { productSearchBarSx, ProductSearchIcon } from '@/components/public/product-browse-chrome';
import { MOTION } from '@/styles/motion';

const PAGE_SIZE = 24;

type SearchItem = SearchListingItem | { kind: 'profile'; member: PublicMemberSearchHit };

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

function isLiveSearchCategory(value: string | null | undefined): value is 'profiles' | HomeVerticalId {
  return isProfilesSearchCategory(value) || isHomeVerticalId(value);
}

async function fetchVerticalResults(
  verticalId: HomeVerticalId,
  query: string,
  page = 1
): Promise<{ items: SearchItem[]; total: number }> {
  const filters = { q: query.trim() ? [query.trim()] : undefined };
  switch (verticalId) {
    case 'real-estate': {
      const res = await fetchBrowseRealEstate(PAGE_SIZE, filters, page);
      return {
        items: res.listings.map((listing) => ({ kind: 'real-estate' as const, listing })),
        total: res.total,
      };
    }
    case 'cars': {
      const res = await fetchBrowseCars(PAGE_SIZE, filters, page);
      return {
        items: res.listings.map((listing) => ({ kind: 'car' as const, listing })),
        total: res.total,
      };
    }
    case 'jobs': {
      const res = await fetchBrowseJobs(PAGE_SIZE, filters, page);
      return {
        items: res.listings.map((listing) => ({ kind: 'job' as const, listing })),
        total: res.total,
      };
    }
    case 'marketplace': {
      const res = await fetchBrowseMarketplace(PAGE_SIZE, filters, page);
      return {
        items: res.listings.map((listing) => ({ kind: 'marketplace' as const, listing })),
        total: res.total,
      };
    }
    case 'businesses': {
      const res = await fetchBrowseBusinesses(PAGE_SIZE, filters, page);
      return {
        items: res.listings.map((listing) => ({ kind: 'businesses' as const, listing })),
        total: res.total,
      };
    }
    case 'professionals': {
      const res = await fetchBrowseProfessionals(PAGE_SIZE, filters, page);
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
function SearchDockLayer({ children, portaled = true }: { children: React.ReactNode; portaled?: boolean }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [host, setHost] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setHost(document.body);
  }, []);

  if (portaled && isMobile && host) return createPortal(children, host);
  return children;
}

function SearchHitsSkeleton({ count = 8, circular = false }: { count?: number; circular?: boolean }) {
  return (
    <Stack spacing={0} aria-busy aria-label="Duke u ngarkuar" sx={{ mx: { xs: -2, sm: -3 } }}>
      {Array.from({ length: count }, (_, i) => (
        <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'center', px: { xs: 2, sm: 3 } }}>
          <Skeleton
            variant={circular ? 'circular' : 'rounded'}
            width={64}
            height={64}
            sx={{ flexShrink: 0, my: 1.15, borderRadius: circular ? undefined : 1.5 }}
          />
          <Stack
            spacing={0.6}
            sx={{
              flex: 1,
              minWidth: 0,
              py: 1.35,
              borderBottom: i === count - 1 ? 'none' : '1px solid',
              borderColor: 'divider',
            }}
          >
            <Skeleton variant="text" width="72%" height={22} />
            <Skeleton variant="text" width="48%" height={16} />
            <Skeleton variant="text" width="36%" height={16} />
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

function ResultCard({ item, divider }: { item: SearchItem; divider?: boolean }) {
  if (item.kind === 'profile') {
    return <MemberProfileCard member={item.member} variant="list" divider={divider} />;
  }
  return <SearchListingCard item={item} variant="list" divider={divider} />;
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
  const initialCategory = urlCat && urlCat !== 'okazion' && isSearchCategoryId(urlCat) ? urlCat : null;

  const [categoryId, setCategoryId] = React.useState<SearchCategoryId | null>(initialCategory);
  const [query, setQuery] = React.useState(urlQ);
  const [submittedQuery, setSubmittedQuery] = React.useState(urlQ);
  const [hasSearched, setHasSearched] = React.useState(
    Boolean(initialCategory && isLiveSearchCategory(initialCategory))
  );
  const [loading, setLoading] = React.useState(() => Boolean(initialCategory && isLiveSearchCategory(initialCategory)));
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<SearchItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [aiReply, setAiReply] = React.useState<string | null>(null);
  const [inputExpanded, setInputExpanded] = React.useState(false);
  const [entered, setEntered] = React.useState(isOverlay);
  const categoriesHidden = useScrollRevealHidden({ alwaysShowBelowY: 24 });
  const skipFirstLive = React.useRef(isLiveSearchCategory(initialCategory));
  const searchGeneration = React.useRef(0);

  const selectedIndex = categoryId ? localizedCategories.findIndex((v) => v.id === categoryId) : -1;
  const activeCategory = categoryId ? (localizedCategories.find((v) => v.id === categoryId) ?? null) : null;
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
    [isOverlay, onNavigate, router]
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
    [isOverlay, pathname, router]
  );

  const runVerticalSearch = React.useCallback(
    async (cat: HomeVerticalId, q: string) => {
      const generation = ++searchGeneration.current;
      setLoading(true);
      setError(null);
      setHasSearched(true);
      setSubmittedQuery(q.trim());
      setAiReply(null);
      try {
        const res = await fetchVerticalResults(cat, q, 1);
        if (generation !== searchGeneration.current) return;
        setItems(res.items);
        setTotal(res.total);
      } catch {
        if (generation !== searchGeneration.current) return;
        setItems([]);
        setTotal(0);
        setError(t.search.failed);
      } finally {
        if (generation === searchGeneration.current) setLoading(false);
      }
    },
    [t.search.failed]
  );

  const runProfileSearch = React.useCallback(
    async (q: string) => {
      const generation = ++searchGeneration.current;
      setLoading(true);
      setError(null);
      setHasSearched(true);
      setSubmittedQuery(q.trim());
      setAiReply(null);
      try {
        const res = await fetchPublicMemberSearch(q, PAGE_SIZE, 1);
        if (generation !== searchGeneration.current) return;
        if (!res.ok) {
          setItems([]);
          setTotal(0);
          setError(t.search.failed);
          return;
        }
        setItems(res.members.map((member) => ({ kind: 'profile' as const, member })));
        setTotal(res.total);
      } catch {
        if (generation !== searchGeneration.current) return;
        setItems([]);
        setTotal(0);
        setError(t.search.failed);
      } finally {
        if (generation === searchGeneration.current) setLoading(false);
      }
    },
    [t.search.failed]
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
    [goTo, language, syncUrl, t.search.failed]
  );

  React.useEffect(() => {
    if (!initialCategory || initialCategory === 'ai') return;
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
    if (!isLiveSearchCategory(categoryId)) return;
    if (skipFirstLive.current) {
      skipFirstLive.current = false;
      return;
    }
    const trimmed = query.trim();
    setLoading(true);
    const handle = window.setTimeout(
      () => {
        syncUrl(categoryId, trimmed);
        if (isProfilesSearchCategory(categoryId)) {
          void runProfileSearch(trimmed);
          return;
        }
        void runVerticalSearch(categoryId, trimmed);
      },
      trimmed ? 280 : 80
    );

    return () => window.clearTimeout(handle);
  }, [query, categoryId, runProfileSearch, runVerticalSearch, syncUrl]);

  const handleSelectCategory = (index: number) => {
    const next = localizedCategories[index];
    if (!next) return;
    if (categoryId === next.id) {
      if (!isOverlay) hardRefreshToTop();
      return;
    }
    searchGeneration.current += 1;
    setCategoryId(next.id);
    setQuery('');
    setItems([]);
    setTotal(0);
    setHasSearched(next.id !== 'ai');
    setSubmittedQuery('');
    setError(null);
    setLoading(next.id !== 'ai');
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
    const base = activeCategory.href.split('?')[0];
    const href = trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
    goTo(href);
  };

  const searchAccent = isAi ? { color: AI_SEARCH_BLUE, soft: AI_SEARCH_BLUE_SOFT } : undefined;
  const mobileDockPadding = categoriesHidden ? MOBILE_SEARCH_BAR_PADDING : MOBILE_SEARCH_DOCK_PADDING;

  return (
    <Container
      maxWidth="xl"
      sx={{
        pt: { xs: 1.5, md: 2.5 },
        pb: { xs: 0, lg: 4 },
        px: { xs: 2, sm: 3 },
        display: 'flex',
        flexDirection: 'column',
        flex: isOverlay ? 1 : undefined,
        minHeight: isOverlay ? 0 : '100dvh',
        height: isOverlay ? '100%' : 'auto',
        overflow: isOverlay ? 'auto' : 'visible',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
          {t.search.title}
        </Typography>
        <IconButton
          {...(onClose ? { onClick: onClose } : { component: RouterLink, ...historyBack })}
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
                        {isAi ? <SparkleIcon size={18} color={AI_SEARCH_BLUE} /> : <ProductSearchIcon />}
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
          flex: categoryId ? '0 0 auto' : 1,
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
          <TransientNotification
            severity="error"
            message={error}
            onDismiss={() => setError(null)}
            sx={{ borderRadius: 2 }}
          />
        ) : null}

        {!hasSearched || isAi ? (
          (isAi && loading) || (isLiveSearchCategory(categoryId) && loading && items.length === 0) ? (
            <Stack spacing={1.5}>
              <SearchHitsSkeleton count={isAi ? 4 : 8} circular={isProfiles} />
              {isAi ? (
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t.search.aiThinking}
                </Typography>
              ) : null}
            </Stack>
          ) : null
        ) : loading && items.length === 0 ? (
          <SearchHitsSkeleton count={8} circular={isProfiles} />
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
            <Box sx={{ mx: { xs: -2, sm: -3 } }}>
              {items.map((item, index) => (
                <ResultCard key={searchItemKey(item)} item={item} divider={index < items.length - 1} />
              ))}
            </Box>
            {total > items.length && isLiveSearchCategory(categoryId) && activeCategory ? (
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  onClick={() => {
                    const q = submittedQuery.trim();
                    const qs = q ? buildBrowseUrlQuery({ q: [q] }) : '';
                    goTo(`${activeCategory.href}${qs}`);
                  }}
                  disabled={loading}
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
      {/* In-flow spacer so the last listing can scroll above the fixed search dock. */}
      <Box
        aria-hidden
        sx={{
          display: { xs: 'block', lg: 'none' },
          flexShrink: 0,
          height: mobileDockPadding,
          transition: `height ${MOTION.base} ${MOTION.ease}`,
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      />
    </Container>
  );
}

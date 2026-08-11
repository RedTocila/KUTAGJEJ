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
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { CarCard } from '@/components/public/listing-cards/car-card';
import { DirectoryListingCard } from '@/components/public/listing-cards/directory-listing-card';
import { JobCard } from '@/components/public/listing-cards/job-card';
import { MarketplaceCard } from '@/components/public/listing-cards/marketplace-card';
import { RealEstateCard } from '@/components/public/listing-cards/real-estate-card';
import { HeroCategoryCircles } from '@/components/public/hero-category-circles';
import {
  ProductSearchIcon,
  productFilterButtonSx,
  productSearchBarSx,
} from '@/components/public/product-browse-chrome';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useHistoryBackProps } from '@/hooks/use-navigate-back';
import { fetchAiSearch, type AiSearchResult } from '@/lib/ai-search-client';
import { hardRefreshToTop } from '@/lib/hard-navigate';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_ON,
  AI_SEARCH_BLUE_SOFT,
  OKAZION_ACCENT,
  OKAZION_ACCENT_SOFT,
  OKAZION_RED,
  OKAZION_RED_DARK,
  findVertical,
  isHomeVerticalId,
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
  fetchBrowseOkazion,
  fetchBrowseProfessionals,
  fetchBrowseRealEstate,
  type PublicCarListing,
  type PublicDirectoryListing,
  type PublicJobListing,
  type PublicMarketplaceListing,
  type PublicOkazionListing,
  type PublicRealEstateListing,
} from '@/lib/public-listings-client';
import { paths } from '@/paths';

const PAGE_SIZE = 24;

type SearchItem =
  | { kind: 'real-estate'; listing: PublicRealEstateListing }
  | { kind: 'car'; listing: PublicCarListing }
  | { kind: 'job'; listing: PublicJobListing }
  | { kind: 'marketplace'; listing: PublicMarketplaceListing }
  | { kind: 'businesses'; listing: PublicDirectoryListing }
  | { kind: 'professionals'; listing: PublicDirectoryListing }
  | { kind: 'okazion'; listing: PublicOkazionListing };

function toOkazionSearchItem(listing: PublicOkazionListing): SearchItem {
  return { kind: 'okazion', listing };
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
    case 'okazion': {
      const listing = item.listing;
      switch (listing.kind) {
        case 'real-estate':
          return <RealEstateCard listing={listing} />;
        case 'car':
          return <CarCard listing={listing} />;
        case 'job':
          return <JobCard listing={listing} />;
        case 'marketplace':
          return <MarketplaceCard listing={listing} />;
        default:
          return null;
      }
    }
    default:
      return null;
  }
}

export function SearchPageView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const historyBack = useHistoryBackProps(paths.home);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  const t = useCopy();
  const localizedCategories = React.useMemo(() => localizeSearchCategories(language), [language]);

  const urlCat = searchParams.get('cat');
  const urlQ = searchParams.get('q') ?? '';
  const initialCategory = isSearchCategoryId(urlCat) ? urlCat : null;

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

  const selectedIndex = categoryId
    ? localizedCategories.findIndex((v) => v.id === categoryId)
    : -1;
  const activeCategory = categoryId
    ? (localizedCategories.find((v) => v.id === categoryId) ?? null)
    : null;
  const isAi = categoryId === 'ai';
  const isOkazion = categoryId === 'okazion';

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

  const syncUrl = React.useCallback(
    (nextCat: SearchCategoryId | null, nextQ: string) => {
      const params = new URLSearchParams();
      if (nextCat) params.set('cat', nextCat);
      const trimmed = nextQ.trim();
      if (trimmed) params.set('q', trimmed);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const runVerticalSearch = React.useCallback(
    async (cat: Exclude<SearchCategoryId, 'ai'>, q: string) => {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      setSubmittedQuery(q.trim());
      setAiReply(null);
      try {
        if (cat === 'okazion') {
          const res = await fetchBrowseOkazion(PAGE_SIZE, { q: q.trim() || undefined }, 1);
          setItems(res.listings.map(toOkazionSearchItem));
          setTotal(res.total);
        } else {
          const res = await fetchVerticalResults(cat, q);
          setItems(res.items);
          setTotal(res.total);
        }
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
        router.push(href);
      } catch {
        setAiReply(null);
        setError(t.search.failed);
        setLoading(false);
      }
    },
    [language, router, syncUrl, t.search.failed],
  );

  React.useEffect(() => {
    if (!initialCategory || initialCategory === 'ai') return;
    if (urlQ.trim()) {
      void runVerticalSearch(initialCategory, urlQ);
    }
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
      void runVerticalSearch(categoryId, trimmed);
    }, 280);

    return () => window.clearTimeout(handle);
  }, [query, categoryId, runVerticalSearch, syncUrl]);

  const handleSelectCategory = (index: number) => {
    const next = localizedCategories[index];
    if (!next) return;
    if (categoryId === next.id) {
      hardRefreshToTop();
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
    const base = activeCategory.href.split('?')[0];
    const href = trimmed ? `${base}?q=${encodeURIComponent(trimmed)}` : base;
    router.push(href);
  };

  return (
    <Container maxWidth="xl" sx={{ pt: { xs: 1.5, md: 2.5 }, pb: { xs: 2.5, md: 4 }, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
            {t.search.title}
          </Typography>
          <IconButton component={RouterLink} {...historyBack} aria-label={t.common.close} edge="end" size="small">
            <XIcon size={22} weight="bold" />
          </IconButton>
        </Stack>

        <HeroCategoryCircles variant="tabs" selectedIndex={selectedIndex} onSelect={handleSelectCategory} />

        {!categoryId ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
            {t.search.pickCategory}
          </Typography>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              display: 'flex',
              gap: 1,
              p: 1,
              alignItems: inputExpanded ? 'flex-end' : 'center',
              transition: 'border-radius 120ms ease',
              ...productSearchBarSx(
                Boolean(query.trim()),
                isAi
                  ? { color: AI_SEARCH_BLUE, soft: AI_SEARCH_BLUE_SOFT }
                  : isOkazion
                    ? { color: OKAZION_ACCENT, soft: OKAZION_ACCENT_SOFT }
                    : undefined,
              ),
              borderRadius: inputExpanded ? 2.5 : 999,
              height: 'auto',
              minHeight: 40,
            }}
          >
            <TextField
              fullWidth
              size="small"
              autoComplete="off"
              inputRef={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
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
                        <ProductSearchIcon color={isOkazion ? OKAZION_ACCENT : undefined} />
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
                  '& fieldset': { border: 'none' },
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
            <IconButton
              type="submit"
              aria-label={t.search.title}
              disabled={loading && isAi}
              sx={{
                flexShrink: 0,
                alignSelf: inputExpanded ? 'flex-end' : 'center',
                ...productFilterButtonSx(true),
                ...(isAi
                  ? {
                      bgcolor: AI_SEARCH_BLUE,
                      color: AI_SEARCH_BLUE_ON,
                      borderColor: AI_SEARCH_BLUE,
                      boxShadow: '0 2px 10px rgba(167, 139, 250, 0.45)',
                      '&:hover': { bgcolor: AI_SEARCH_BLUE_HOVER, borderColor: AI_SEARCH_BLUE_HOVER },
                      '&.Mui-disabled': {
                        bgcolor: AI_SEARCH_BLUE_SOFT,
                        color: AI_SEARCH_BLUE_ON,
                      },
                    }
                  : isOkazion
                    ? {
                        bgcolor: OKAZION_RED,
                        color: '#fff',
                        borderColor: OKAZION_RED,
                        boxShadow: '0 2px 10px rgba(247, 47, 53, 0.45)',
                        '&:hover': { bgcolor: OKAZION_RED_DARK, borderColor: OKAZION_RED_DARK },
                      }
                    : {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'primary.dark' },
                      }),
              }}
            >
              {loading && isAi ? (
                <CircularProgress size={18} sx={{ color: AI_SEARCH_BLUE_ON }} />
              ) : isAi ? (
                <SparkleIcon size={18} weight="bold" />
              ) : (
                <MagnifyingGlassIcon size={18} weight="bold" />
              )}
            </IconButton>
          </Box>
        )}

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
            <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={26} />
              <Typography variant="caption" color="text.secondary">
                {t.search.aiThinking}
              </Typography>
            </Box>
          ) : null
        ) : loading && items.length === 0 ? (
          <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={26} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {`Asnjë rezultat${submittedQuery ? ` për «${submittedQuery}»` : ''}${activeCategory ? ` në ${activeCategory.label}` : ''}.`}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {total} {total === 1 ? 'njoftim' : 'njoftime'}
              {submittedQuery ? ` për «${submittedQuery}»` : activeCategory ? ` · ${activeCategory.label}` : ''}
            </Typography>
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid key={`${item.kind}-${item.listing.id}`} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <ResultCard item={item} />
                </Grid>
              ))}
            </Grid>
            {activeCategory && total > items.length ? (
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  component={RouterLink}
                  href={`${activeCategory.href.split('?')[0]}${submittedQuery ? `?q=${encodeURIComponent(submittedQuery)}` : ''}`}
                  variant="text"
                  sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                  Shiko më shumë
                </Button>
              </Box>
            ) : null}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

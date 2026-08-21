'use client';

import * as React from 'react';
import { Box, Button, Grid } from '@mui/material';

import { ListingCardsSkeleton } from '@/components/core/content-skeletons';
import { useBrowseLoadContext } from '@/components/public/browse-load-context';
import { MemberProfileCard } from '@/components/public/listing-cards/member-profile-card';
import { useCopy } from '@/hooks/use-copy';
import { BROWSE_PAGE_SIZE } from '@/lib/listing-filters';
import { fetchPublicMemberSearch, type PublicMemberSearchHit } from '@/lib/public-member-client';

export function MembersBrowseGrid({
  query,
  initialMembers,
  initialPage,
  totalPages,
}: {
  query: string;
  initialMembers: PublicMemberSearchHit[];
  initialPage: number;
  totalPages: number;
}) {
  const t = useCopy();
  const loadCtx = useBrowseLoadContext();
  const recoverEmpty = Boolean(loadCtx?.recoverEmpty) && initialMembers.length === 0;
  const [members, setMembers] = React.useState(initialMembers);
  const [page, setPage] = React.useState(initialPage);
  const [pagesTotal, setPagesTotal] = React.useState(totalPages);
  const [loading, setLoading] = React.useState(recoverEmpty);
  const [error, setError] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const loadingRef = React.useRef(false);
  const recoveredRef = React.useRef(false);
  const routeKey = `${query}:${initialPage}`;
  const routeKeyRef = React.useRef(routeKey);
  const reportResolved = loadCtx?.reportResolved;

  const applyFirstPage = React.useCallback(
    (res: Awaited<ReturnType<typeof fetchPublicMemberSearch>>) => {
      recoveredRef.current = true;
      setMembers(res.members);
      setPage(res.page);
      setPagesTotal(res.totalPages);
      reportResolved?.({
        total: res.total,
        shownCount: res.members.length,
        totalPages: res.totalPages,
        page: res.page,
        ok: res.ok,
      });
      if (!res.ok && res.members.length === 0) setError(true);
    },
    [reportResolved],
  );

  React.useEffect(() => {
    const routeChanged = routeKeyRef.current !== routeKey;
    routeKeyRef.current = routeKey;
    if (!routeChanged && recoveredRef.current) return;
    recoveredRef.current = false;
    setMembers(initialMembers);
    setPage(initialPage);
    setPagesTotal(totalPages);
    setError(false);
    setLoading(initialMembers.length === 0 && recoverEmpty);
  }, [routeKey, initialMembers, initialPage, totalPages, recoverEmpty]);

  React.useEffect(() => {
    if (!recoverEmpty || initialMembers.length > 0 || recoveredRef.current) return;
    let cancelled = false;
    void (async () => {
      loadingRef.current = true;
      setLoading(true);
      setError(false);
      try {
        const res = await fetchPublicMemberSearch(query, BROWSE_PAGE_SIZE, initialPage);
        if (cancelled) return;
        applyFirstPage(res);
      } catch {
        if (!cancelled) {
          setError(true);
          reportResolved?.({
            total: 0,
            shownCount: 0,
            totalPages: 1,
            page: initialPage,
            ok: false,
          });
        }
      } finally {
        loadingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recoverEmpty, query, initialPage, initialMembers.length, applyFirstPage, reportResolved]);

  const recovering = recoverEmpty && members.length === 0 && (loading || error);
  const hasMore = !recovering && page < pagesTotal;

  const loadMore = React.useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const nextPage = page + 1;
      const res = await fetchPublicMemberSearch(query, BROWSE_PAGE_SIZE, nextPage);
      setMembers((prev) => {
        const seen = new Set(prev.map((member) => member.id));
        return [...prev, ...res.members.filter((member) => !seen.has(member.id))];
      });
      setPage(nextPage);
      setPagesTotal(res.totalPages);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, page, query]);

  const retryFirstPage = React.useCallback(() => {
    setError(false);
    setLoading(true);
    void (async () => {
      loadingRef.current = true;
      try {
        const res = await fetchPublicMemberSearch(query, BROWSE_PAGE_SIZE, initialPage);
        applyFirstPage(res);
      } catch {
        setError(true);
        reportResolved?.({
          total: 0,
          shownCount: 0,
          totalPages: 1,
          page: initialPage,
          ok: false,
        });
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    })();
  }, [applyFirstPage, initialPage, query, reportResolved]);

  React.useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: '320px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, members.length]);

  if (recovering && error && !loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <Button variant="outlined" onClick={retryFirstPage} sx={{ fontWeight: 700 }}>
          {t.browse.retryLoad}
        </Button>
      </Box>
    );
  }

  if (recovering) {
    return <ListingCardsSkeleton count={8} />;
  }

  return (
    <>
      <Grid container spacing={{ xs: 2, md: 2.5 }}>
        {members.map((member) => (
          <Grid key={member.id} size={{ xs: 12, md: 6 }}>
            <MemberProfileCard member={member} />
          </Grid>
        ))}
      </Grid>
      {hasMore ? <Box ref={sentinelRef} sx={{ height: 1 }} /> : null}
      {loading && hasMore ? (
        <Box sx={{ pt: 2 }}>
          <ListingCardsSkeleton count={4} />
        </Box>
      ) : null}
    </>
  );
}

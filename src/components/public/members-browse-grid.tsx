'use client';

import * as React from 'react';
import { Box, Button, Grid } from '@mui/material';

import { BROWSE_PAGE_SIZE } from '@/lib/listing-filters';
import { fetchPublicMemberSearch, type PublicMemberSearchHit } from '@/lib/public-member-client';
import { useCopy } from '@/hooks/use-copy';
import { ListingCardsSkeleton } from '@/components/core/content-skeletons';
import { useBrowseLoadContext } from '@/components/public/browse-load-context';
import { MemberProfileCard } from '@/components/public/listing-cards/member-profile-card';

export function MembersBrowseGrid({
  query,
  initialMembers,
  initialPage,
}: {
  query: string;
  initialMembers: PublicMemberSearchHit[];
  initialPage: number;
}) {
  const t = useCopy();
  const loadCtx = useBrowseLoadContext();
  const recoverEmpty = Boolean(loadCtx?.recoverEmpty) && initialMembers.length === 0;
  const [members, setMembers] = React.useState(initialMembers);
  const [loading, setLoading] = React.useState(recoverEmpty);
  const [error, setError] = React.useState(false);
  const recoveredRef = React.useRef(false);
  const routeKey = `${query}:${initialPage}`;
  const routeKeyRef = React.useRef(routeKey);
  const reportResolved = loadCtx?.reportResolved;

  const applyFirstPage = React.useCallback(
    (res: Awaited<ReturnType<typeof fetchPublicMemberSearch>>) => {
      recoveredRef.current = true;
      setMembers(res.members);
      reportResolved?.({
        total: res.total,
        shownCount: res.members.length,
        totalPages: res.totalPages,
        page: res.page,
        ok: res.ok,
      });
      if (!res.ok && res.members.length === 0) setError(true);
    },
    [reportResolved]
  );

  React.useEffect(() => {
    const routeChanged = routeKeyRef.current !== routeKey;
    routeKeyRef.current = routeKey;
    if (!routeChanged && recoveredRef.current) return;
    recoveredRef.current = false;
    setMembers(initialMembers);
    setError(false);
    setLoading(initialMembers.length === 0 && recoverEmpty);
  }, [routeKey, initialMembers, recoverEmpty]);

  React.useEffect(() => {
    if (!recoverEmpty || initialMembers.length > 0 || recoveredRef.current) return;
    let cancelled = false;
    void (async () => {
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recoverEmpty, query, initialPage, initialMembers.length, applyFirstPage, reportResolved]);

  const recovering = recoverEmpty && members.length === 0 && (loading || error);

  const retryFirstPage = React.useCallback(() => {
    setError(false);
    setLoading(true);
    void (async () => {
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
        setLoading(false);
      }
    })();
  }, [applyFirstPage, initialPage, query, reportResolved]);

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
    </>
  );
}

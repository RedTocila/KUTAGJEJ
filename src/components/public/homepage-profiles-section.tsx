'use client';

import * as React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';

import { MemberProfileCard } from '@/components/public/listing-cards/member-profile-card';
import { ListingsCarousel } from '@/components/public/listings-carousel';
import { ListingsSection } from '@/components/public/listings-section';
import { useRegisterTabRefresh } from '@/hooks/use-tab-refresh';
import {
  fetchLatestPublicMembers,
  type PublicMemberSearchHit,
} from '@/lib/public-member-client';

let sectionCache: { members: PublicMemberSearchHit[]; total: number } | null = null;

function CarouselSkeleton() {
  return (
    <Stack direction="row" spacing={2} sx={{ overflow: 'hidden', px: { xs: 2, md: 0 } }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Box key={i} sx={{ minWidth: 280, flex: '0 0 auto' }}>
          <Skeleton variant="rounded" height={104} sx={{ borderRadius: 2.5 }} />
        </Box>
      ))}
    </Stack>
  );
}

/**
 * Homepage public-member carousel — loads when scrolled near the viewport.
 */
export function HomepageProfilesSection({ limit = 8 }: { limit?: number }): React.JSX.Element | null {
  const [members, setMembers] = React.useState<PublicMemberSearchHit[]>(() => sectionCache?.members ?? []);
  const [total, setTotal] = React.useState(() => sectionCache?.total ?? 0);
  const [loaded, setLoaded] = React.useState(() => Boolean(sectionCache));
  const [active, setActive] = React.useState(() => Boolean(sectionCache));
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (active) return;
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  React.useEffect(() => {
    if (!active || loaded) return;
    let cancelled = false;
    void (async () => {
      if (sectionCache) {
        if (!cancelled) {
          setMembers(sectionCache.members);
          setTotal(sectionCache.total);
          setLoaded(true);
        }
        return;
      }
      const res = await fetchLatestPublicMembers(limit);
      if (cancelled) return;
      if (res.ok) {
        const named = res.members.filter((member) => Boolean(member.displayName?.trim()));
        sectionCache = { members: named, total: res.total };
        setMembers(named);
        setTotal(res.total);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, loaded, limit]);

  useRegisterTabRefresh('home', async () => {
    if (!active) return;
    const res = await fetchLatestPublicMembers(limit);
    if (!res.ok) return;
    const named = res.members.filter((member) => Boolean(member.displayName?.trim()));
    sectionCache = { members: named, total: res.total };
    setMembers(named);
    setTotal(res.total);
    setLoaded(true);
  });

  if (loaded && members.length === 0) return <Box ref={rootRef} />;

  return (
    <Box ref={rootRef}>
      <ListingsSection
        verticalId="profiles"
        total={total}
        isEmpty={false}
        useMuiVerticalIcon
        hideSubcategoryPills
      >
        {!loaded && members.length === 0 ? (
          <CarouselSkeleton />
        ) : (
          <ListingsCarousel slotWidth={{ xs: 280, sm: 300, md: 320 }}>
            {members.map((member) => (
              <MemberProfileCard key={member.id} member={member} />
            ))}
          </ListingsCarousel>
        )}
      </ListingsSection>
    </Box>
  );
}

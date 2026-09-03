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

function membersForSlider(members: PublicMemberSearchHit[]): PublicMemberSearchHit[] {
  const named = members.filter((member) => Boolean(member.displayName?.trim()));
  return named.length > 0 ? named : members;
}

function CarouselSkeleton() {
  return (
    <Stack direction="row" spacing={2} sx={{ overflow: 'hidden', px: { xs: 2, md: 0 } }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Stack key={i} direction="row" spacing={2} sx={{ minWidth: 280, flex: '0 0 auto', alignItems: 'center' }}>
          <Skeleton variant="circular" width={72} height={72} />
          <Stack spacing={0.6} sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="72%" height={22} />
            <Skeleton variant="text" width="38%" height={16} />
            <Skeleton variant="text" width="54%" height={16} />
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * Homepage public-member carousel. Prefers SSR rows; otherwise loads on the client.
 * Failed empties are not cached so a later visit can recover.
 */
export function HomepageProfilesSection({
  limit = 8,
  initialMembers,
  initialTotal,
  initialOk = true,
}: {
  limit?: number;
  initialMembers?: PublicMemberSearchHit[];
  initialTotal?: number;
  initialOk?: boolean;
}): React.JSX.Element {
  const ssrMembers = membersForSlider(initialMembers ?? []);
  const ssrTrusted = ssrMembers.length > 0;
  const cached = sectionCache;

  const [members, setMembers] = React.useState<PublicMemberSearchHit[]>(
    () => (ssrTrusted ? ssrMembers : cached?.members ?? []),
  );
  const [total, setTotal] = React.useState(
    () => (ssrTrusted ? (initialTotal ?? ssrMembers.length) : cached?.total ?? 0),
  );
  const [loaded, setLoaded] = React.useState(() => ssrTrusted || Boolean(cached));
  const [active, setActive] = React.useState(() => ssrTrusted || Boolean(cached) || !initialOk);
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
      { rootMargin: '800px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  React.useEffect(() => {
    if (!active || loaded) return;
    let cancelled = false;
    void (async () => {
      const hit = sectionCache;
      if (hit && hit.members.length > 0) {
        if (!cancelled) {
          setMembers(hit.members);
          setTotal(hit.total);
          setLoaded(true);
        }
        return;
      }
      const res = await fetchLatestPublicMembers(limit);
      if (cancelled) return;
      if (res.ok) {
        const next = membersForSlider(res.members);
        if (next.length > 0) {
          sectionCache = { members: next, total: res.total };
        }
        setMembers(next);
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
    const next = membersForSlider(res.members);
    if (next.length > 0) {
      sectionCache = { members: next, total: res.total };
    }
    setMembers(next);
    setTotal(res.total);
    setLoaded(true);
  });

  return (
    <Box ref={rootRef}>
      <ListingsSection
        verticalId="profiles"
        total={total}
        isEmpty={loaded && members.length === 0}
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

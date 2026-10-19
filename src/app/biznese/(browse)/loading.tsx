import { RouteLoadingSkeleton } from '@/components/core/route-loading-skeleton';

/** Page skeleton while this route is still loading. The branded splash is only the first entry. */
export default function Loading() {
  return <RouteLoadingSkeleton kind="browse-square" />;
}

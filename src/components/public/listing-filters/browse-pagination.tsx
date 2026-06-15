'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Box, Pagination, PaginationItem } from '@mui/material';

export function BrowsePagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefForPage = React.useCallback(
    (targetPage: number) => {
      const qs = new URLSearchParams(searchParams.toString());
      if (targetPage <= 1) qs.delete('page');
      else qs.set('page', String(targetPage));
      const query = qs.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: { xs: 2, md: 3 } }}>
      <Pagination
        page={page}
        count={totalPages}
        color="primary"
        shape="rounded"
        size="medium"
        siblingCount={0}
        boundaryCount={1}
        showFirstButton
        showLastButton
        renderItem={(item) => {
          if (item.type === 'page' && item.page != null) {
            return (
              <PaginationItem
                component={Link}
                href={hrefForPage(item.page)}
                page={item.page}
                type="page"
                selected={item.selected}
                disabled={item.disabled}
              />
            );
          }
          return <PaginationItem {...item} />;
        }}
      />
    </Box>
  );
}

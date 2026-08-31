'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Box, Pagination, PaginationItem } from '@mui/material';

export function BrowsePagination({ page, totalPages }: { page: number; totalPages: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const hrefForPage = React.useCallback(
    (targetPage: number) => {
      const qs = new URLSearchParams(searchParams.toString());
      if (targetPage <= 1) qs.delete('page');
      else qs.set('page', String(targetPage));
      const query = qs.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams]
  );

  const goToPage = React.useCallback(
    (targetPage: number) => {
      React.startTransition(() => {
        router.push(hrefForPage(targetPage));
      });
    },
    [hrefForPage, router]
  );

  if (totalPages <= 1) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: { xs: 2, md: 3 } }}>
      <Pagination
        page={page}
        count={totalPages}
        shape="rounded"
        size="medium"
        siblingCount={0}
        boundaryCount={1}
        showFirstButton
        showLastButton
        onChange={(_event, value) => {
          if (value !== page) goToPage(value);
        }}
        renderItem={(item) => {
          if (item.type === 'page' && item.page != null) {
            return (
              <PaginationItem
                page={item.page}
                type="page"
                component="a"
                href={hrefForPage(item.page)}
                selected={item.selected}
                disabled={item.disabled}
                onClick={(event) => {
                  event.preventDefault();
                  if (item.page != null && item.page !== page) goToPage(item.page);
                }}
              />
            );
          }
          if (
            (item.type === 'first' || item.type === 'last' || item.type === 'previous' || item.type === 'next') &&
            item.page != null
          ) {
            return (
              <PaginationItem
                {...item}
                component="a"
                href={hrefForPage(item.page)}
                onClick={(event) => {
                  event.preventDefault();
                  if (item.page != null && item.page !== page) goToPage(item.page);
                }}
              />
            );
          }
          return <PaginationItem {...item} />;
        }}
      />
    </Box>
  );
}

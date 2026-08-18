import * as React from 'react';
import { Box, Container, Skeleton, Stack } from '@mui/material';

/** Matches `BannerSlideCard` height so the hero does not jump when banners stream in. */
export function HomeBannerSkeleton(): React.JSX.Element {
  return (
    <Skeleton
      variant="rounded"
      animation="wave"
      sx={{
        width: '100%',
        minHeight: { xs: 240, sm: 260 },
        aspectRatio: { md: '4 / 3' },
        maxHeight: { md: 'min(58vh, 560px)' },
        borderRadius: 4,
      }}
    />
  );
}

function CarouselRowSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="text" animation="wave" width={220} height={36} />
      <Stack direction="row" spacing={2} sx={{ overflow: 'hidden' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} sx={{ minWidth: 260, flex: '0 0 auto' }}>
            <Skeleton variant="rounded" animation="wave" height={180} sx={{ borderRadius: 3 }} />
            <Skeleton width="70%" sx={{ mt: 1.5 }} />
            <Skeleton width="40%" />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

/** One homepage carousel placeholder (recommended / OKAZION suspense). */
export function HomeCarouselRowSkeleton({ compactTop = false }: { compactTop?: boolean }): React.JSX.Element {
  return (
    <Box sx={{ bgcolor: 'background.default', pt: compactTop ? 0 : { xs: 3, md: 4 }, pb: { xs: 3, md: 4 } }} aria-busy>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
        <CarouselRowSkeleton />
      </Container>
    </Box>
  );
}

/** Placeholder while homepage listing carousels stream in. */
export function HomeCarouselsSkeleton(): React.JSX.Element {
  return (
    <Box sx={{ bgcolor: 'background.default' }} aria-busy aria-label="Duke u ngarkuar">
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={4}>
          <CarouselRowSkeleton />
          <CarouselRowSkeleton />
        </Stack>
      </Container>
    </Box>
  );
}

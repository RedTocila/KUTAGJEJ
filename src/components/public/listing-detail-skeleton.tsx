import * as React from 'react';
import { Box, Container, Skeleton, Stack } from '@mui/material';

import { LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX } from '@/lib/listing-detail-layout';

/**
 * Instant route placeholder for public listing detail pages.
 * Shown via `loading.tsx` as soon as the user navigates (before RSC data resolves).
 */
export function ListingDetailSkeleton(): React.JSX.Element {
  return (
    <Box component="article" sx={{ bgcolor: 'background.default' }} aria-busy aria-label="Duke u ngarkuar">
      <Container
        maxWidth="lg"
        sx={{
          px: { xs: 0, md: 3 },
          pt: { md: 2 },
          pb: { xs: 0, md: 2 },
          bgcolor: 'background.default',
        }}
      >
        <Stack spacing={{ xs: 0, md: 4 }}>
          <Box
            sx={{
              width: '100%',
              borderRadius: { xs: 0, md: 3 },
              overflow: 'hidden',
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} sx={{ alignItems: { md: 'stretch' }, width: '100%' }}>
              <Box
                sx={{
                  flex: { md: `1 1 ${LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX}px` },
                  maxWidth: { md: LISTING_DETAIL_HERO_GALLERY_MAX_WIDTH_PX },
                  minWidth: 0,
                  width: '100%',
                }}
              >
                <Skeleton
                  variant="rectangular"
                  animation="wave"
                  sx={{ width: '100%', aspectRatio: '16 / 10', display: 'block' }}
                />
              </Box>
              <Box
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  flexDirection: 'column',
                  width: { md: 'min(340px, 34%)' },
                  minWidth: { md: 280 },
                  maxWidth: { md: 380 },
                  p: 2.5,
                  gap: 2,
                }}
              >
                <Skeleton variant="rounded" animation="wave" height={36} width="55%" />
                <Skeleton variant="text" animation="wave" width="70%" />
                <Skeleton variant="text" animation="wave" width="45%" />
                <Skeleton variant="rounded" animation="wave" height={48} sx={{ mt: 1 }} />
                <Skeleton variant="rounded" animation="wave" height={48} />
                <Skeleton variant="rounded" animation="wave" height={48} />
                <Skeleton variant="rounded" animation="wave" height={120} sx={{ mt: 1 }} />
              </Box>
            </Stack>
          </Box>

          <Stack
            spacing={2.5}
            sx={{ px: { xs: 2, sm: 3, md: 0 }, pb: { xs: 14, md: 6 }, width: '100%' }}
          >
            <Stack spacing={1} sx={{ display: { md: 'none' } }}>
              <Skeleton variant="rounded" animation="wave" height={32} width="40%" />
              <Skeleton variant="text" animation="wave" height={36} width="90%" />
              <Skeleton variant="text" animation="wave" width="60%" />
            </Stack>

            <Skeleton variant="text" animation="wave" width={120} />
            <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} variant="rounded" animation="wave" width={88} height={72} />
              ))}
            </Stack>

            <Skeleton variant="text" animation="wave" width={100} sx={{ mt: 1 }} />
            <Skeleton variant="rounded" animation="wave" height={140} />

            <Skeleton variant="text" animation="wave" width={140} sx={{ mt: 1 }} />
            <Stack spacing={1}>
              <Skeleton variant="text" animation="wave" width="100%" />
              <Skeleton variant="text" animation="wave" width="95%" />
              <Skeleton variant="text" animation="wave" width="88%" />
              <Skeleton variant="text" animation="wave" width="70%" />
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

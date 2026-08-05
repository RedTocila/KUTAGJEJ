import * as React from 'react';
import { Box, Container, Grid, Skeleton, Stack } from '@mui/material';

/**
 * Instant route placeholder for public category browse pages.
 * Shown via `loading.tsx` as soon as the user navigates (before RSC data resolves).
 */
export function CategoryBrowseSkeleton(): React.JSX.Element {
  return (
    <Box sx={{ bgcolor: 'background.default' }} aria-busy aria-label="Duke u ngarkuar">
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 2 }}>
        <Container maxWidth="xl" disableGutters>
          <Stack spacing={2}>
            <Skeleton variant="rounded" animation="wave" height={48} width="40%" sx={{ maxWidth: 280 }} />
            <Skeleton variant="rounded" animation="wave" height={56} sx={{ borderRadius: 2.5 }} />
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} variant="rounded" animation="wave" width={96} height={36} />
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={3}>
          <Skeleton variant="text" animation="wave" width={200} />
          <Grid container spacing={{ xs: 2, md: 2.5 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Stack spacing={1.25}>
                  <Skeleton
                    variant="rounded"
                    animation="wave"
                    sx={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 2.5 }}
                  />
                  <Skeleton variant="text" animation="wave" width="70%" />
                  <Skeleton variant="text" animation="wave" width="45%" />
                  <Skeleton variant="rounded" animation="wave" height={20} width="55%" />
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}

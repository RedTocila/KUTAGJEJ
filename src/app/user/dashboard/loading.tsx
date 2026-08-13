import * as React from 'react';
import { Container, Grid, Skeleton, Stack } from '@mui/material';

/**
 * Soft-nav placeholder for user dashboard routes.
 * Shell (side / bottom nav) stays mounted via the parent layout.
 */
export default function Loading(): React.JSX.Element {
  return (
    <Container
      maxWidth="xl"
      sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3 } }}
      aria-busy
      aria-label="Duke u ngarkuar"
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Skeleton variant="rounded" animation="wave" width={44} height={44} sx={{ borderRadius: 2.25 }} />
          <Stack spacing={0.75} sx={{ flex: 1 }}>
            <Skeleton variant="text" animation="wave" width={180} height={32} />
            <Skeleton variant="text" animation="wave" width={240} height={20} />
          </Stack>
        </Stack>
        <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              animation="wave"
              width={96}
              height={36}
              sx={{ borderRadius: 999 }}
            />
          ))}
        </Stack>
        <Grid container spacing={2}>
          {Array.from({ length: 6 }, (_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" animation="wave" height={160} sx={{ borderRadius: 2.5 }} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}

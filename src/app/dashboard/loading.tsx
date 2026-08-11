import * as React from 'react';
import { Box, Grid, Skeleton, Stack } from '@mui/material';

/**
 * Instant feedback while soft-navigating between admin pages.
 * The sidebar / top bar stay mounted via the dashboard layout.
 */
export default function Loading(): React.JSX.Element {
  return (
    <Box sx={{ py: 0.5 }} aria-busy aria-label="Duke u ngarkuar">
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Skeleton variant="rounded" animation="wave" width={44} height={44} sx={{ borderRadius: 2.25 }} />
          <Stack spacing={0.75} sx={{ flex: 1 }}>
            <Skeleton variant="text" animation="wave" width={180} height={32} />
            <Skeleton variant="text" animation="wave" width={240} height={20} />
          </Stack>
        </Stack>
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" animation="wave" height={120} sx={{ borderRadius: 2.5 }} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Box>
  );
}

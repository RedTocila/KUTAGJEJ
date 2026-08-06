import * as React from 'react';
import { Box, Container, Skeleton, Stack } from '@mui/material';

import { PublicShell } from '@/components/public/public-shell';

/** Instant placeholder when soft-navigating to `/`. */
export default function Loading(): React.JSX.Element {
  return (
    <PublicShell>
      <Box sx={{ bgcolor: 'background.default' }} aria-busy aria-label="Duke u ngarkuar">
        <Skeleton
          variant="rounded"
          animation="wave"
          sx={{ width: '100%', height: { xs: 220, md: 360 }, borderRadius: 0 }}
        />
        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
          <Stack spacing={4}>
            {Array.from({ length: 2 }).map((_, section) => (
              <Stack key={section} spacing={2}>
                <Skeleton variant="text" animation="wave" width={220} height={36} />
                <Stack direction="row" spacing={2} sx={{ overflow: 'hidden' }}>
                  {Array.from({ length: 4 }).map((__, i) => (
                    <Box key={i} sx={{ minWidth: 260, flex: '0 0 auto' }}>
                      <Skeleton variant="rounded" animation="wave" height={180} sx={{ borderRadius: 3 }} />
                      <Skeleton width="70%" sx={{ mt: 1.5 }} />
                      <Skeleton width="40%" />
                    </Box>
                  ))}
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>
    </PublicShell>
  );
}

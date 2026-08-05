import * as React from 'react';
import { Box, Container, Skeleton, Stack } from '@mui/material';

/** Instant route placeholder for public member profile pages. */
export function MemberProfileSkeleton(): React.JSX.Element {
  return (
    <Box sx={{ bgcolor: 'background.default', py: { xs: 3, md: 5 } }} aria-busy aria-label="Duke u ngarkuar">
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Skeleton variant="circular" animation="wave" width={88} height={88} />
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" animation="wave" width="50%" height={36} />
              <Skeleton variant="text" animation="wave" width="30%" />
              <Skeleton variant="rounded" animation="wave" height={36} width={160} />
            </Stack>
          </Stack>
          <Skeleton variant="rounded" animation="wave" height={120} />
          <Skeleton variant="text" animation="wave" width={180} />
          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                animation="wave"
                sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' }, aspectRatio: '4 / 3' }}
              />
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

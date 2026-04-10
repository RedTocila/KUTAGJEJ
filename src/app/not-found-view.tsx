'use client';

import { createElement } from 'react';
import RouterLink from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';

import { paths } from '@/paths';

export function NotFoundView() {
  return (
    <Box component="main" sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100%' }}>
      <Stack spacing={3} sx={{ alignItems: 'center', maxWidth: 'md' }}>
        <Box>
          <Box
            component="img"
            alt="Under development"
            src="/assets/error-404.png"
            sx={{ display: 'inline-block', height: 'auto', maxWidth: '100%', width: '400px' }}
          />
        </Box>
        <Typography variant="h3" sx={{ textAlign: 'center' }}>
          404: The page you are looking for isn&apos;t here
        </Typography>
        <Typography color="text.secondary" variant="body1" sx={{ textAlign: 'center' }}>
          You either tried some shady route or you came here by mistake. Whichever it is, try using the navigation
        </Typography>
        <Button
          component={RouterLink}
          href={paths.home}
          startIcon={createElement(ArrowLeftIcon, { fontSize: 'var(--icon-fontSize-md)' })}
          variant="contained"
        >
          Go back to home
        </Button>
      </Stack>
    </Box>
  );
}

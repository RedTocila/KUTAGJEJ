'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';

import { paths } from '@/paths';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <Box component="main" sx={{ alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100%' }}>
      <Stack spacing={3} sx={{ alignItems: 'center', maxWidth: 'md' }}>
        <Box>
          <Box
            component="img"
            alt="Error"
            src="/assets/error-500.png"
            sx={{ display: 'inline-block', height: 'auto', maxWidth: '100%', width: '400px' }}
          />
        </Box>
        <Typography variant="h3" sx={{ textAlign: 'center' }}>
          500: Something went wrong!
        </Typography>
        <Typography color="text.secondary" variant="body1" sx={{ textAlign: 'center' }}>
          We apologize for the inconvenience. Please try again later or contact support if the problem persists.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            onClick={reset}
            variant="contained"
          >
            Try again
          </Button>
          <Button
            component={RouterLink}
            href={paths.home}
            startIcon={<ArrowLeftIcon fontSize="var(--icon-fontSize-md)" />}
            variant="outlined"
          >
            Go back to home
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
} 
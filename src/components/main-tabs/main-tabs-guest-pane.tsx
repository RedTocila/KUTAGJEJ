'use client';

import * as React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

import { useCopy } from '@/hooks/use-copy';
import { hardNavigate } from '@/lib/hard-navigate';
import { paths } from '@/paths';

export function MainTabsGuestPane({ title }: { title: string }) {
  const t = useCopy();
  return (
    <Stack
      spacing={1.5}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '70%',
        px: 3,
        py: 8,
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
        {t.common.loginRegister}
      </Typography>
      <Box sx={{ pt: 1 }}>
        <Button variant="contained" onClick={() => hardNavigate(paths.user.auth)}>
          {t.common.loginRegister}
        </Button>
      </Box>
    </Stack>
  );
}

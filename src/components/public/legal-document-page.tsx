'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';

import { PublicShell } from '@/components/public/public-shell';

export function LegalDocumentPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <PublicShell>
      <Box sx={{ bgcolor: 'background.default', py: { xs: 4, md: 6 } }}>
        <Container maxWidth="md">
          <Stack spacing={1.5} sx={{ mb: 4 }}>
            <Typography
              component="h1"
              sx={{ fontWeight: 800, fontSize: { xs: '1.75rem', md: '2.1rem' }, letterSpacing: '-0.02em' }}
            >
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Përditësuar: {updated}
            </Typography>
          </Stack>
          <Stack
            spacing={2.5}
            sx={{
              '& h2': {
                fontWeight: 800,
                fontSize: '1.15rem',
                letterSpacing: '-0.01em',
                mt: 1,
              },
              '& p, & li': {
                color: 'text.secondary',
                fontWeight: 500,
                lineHeight: 1.65,
              },
              '& ul': { pl: 2.5, m: 0 },
            }}
          >
            {children}
          </Stack>
        </Container>
      </Box>
    </PublicShell>
  );
}

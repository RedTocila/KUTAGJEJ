'use client';

import * as React from 'react';
import { Box, Card, CardContent, Container, Stack, Typography } from '@mui/material';

import { BrandLogo } from '@/components/brand/brand-logo';
import { SignInForm } from '@/components/auth/sign-in-form';
import { productSurfacePaperSx } from '@/styles/product-sx';

export default function SignInPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(ellipse 70% 55% at 50% 38%, rgba(118, 186, 27, 0.18), transparent 70%)'
            : 'radial-gradient(ellipse 70% 55% at 50% 38%, rgba(118, 186, 27, 0.14), transparent 70%)',
        py: { xs: 3, md: 5 },
        px: 2,
      }}
    >
      <Container maxWidth={false} disableGutters sx={{ width: '100%', maxWidth: 480 }}>
        <Card elevation={0} sx={(theme) => ({ ...productSurfacePaperSx(theme) })}>
          <CardContent sx={{ p: { xs: 3, sm: 3.5 } }}>
            <Stack spacing={2.5}>
              <Box>
                <BrandLogo
                  height={36}
                  showWordmark
                  wordmarkPresentation="brand"
                  wordmarkSx={{ fontSize: '1.15rem' }}
                  sx={{ mb: 2 }}
                />
                <Typography
                  variant="overline"
                  sx={{ color: 'primary.main', letterSpacing: 1.2, fontWeight: 700 }}
                >
                  Admin
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ color: 'text.primary', mt: 0.5, fontWeight: 800, letterSpacing: '-0.02em' }}
                >
                  Hyr si administrator
                </Typography>
              </Box>

              <SignInForm />
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

'use client';

import * as React from 'react';
import { Box, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import RouterLink from 'next/link';

import { BrandLogo } from '@/components/brand/brand-logo';
import { useCopy } from '@/hooks/use-copy';
import { paths } from '@/paths';
import { productSurfacePaperSx } from '@/styles/product-sx';

export function AuthScreenShell({
  title,
  subtitle,
  children,
  backHref = paths.user.auth,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backHref?: string;
}) {
  const t = useCopy();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
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
        <Button
          component={RouterLink}
          href={backHref}
          aria-label={t.auth.backAria}
          startIcon={<ArrowLeftIcon size={18} weight="bold" />}
          sx={{
            display: 'inline-flex',
            textTransform: 'none',
            fontWeight: 700,
            color: 'text.secondary',
            px: 0.75,
            ml: -0.75,
            mb: 1.5,
            minHeight: 36,
            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
          }}
        >
          {t.auth.backToLogin}
        </Button>
        <Card elevation={0} sx={(theme) => ({ ...productSurfacePaperSx(theme), overflow: 'visible' })}>
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
                  variant="h4"
                  sx={{ color: 'text.primary', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}
                >
                  {title}
                </Typography>
                {subtitle ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.55 }}>
                    {subtitle}
                  </Typography>
                ) : null}
              </Box>
              {children}
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

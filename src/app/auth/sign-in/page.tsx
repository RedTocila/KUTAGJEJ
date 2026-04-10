'use client';

import * as React from 'react';
import { Box, Card, CardContent, Container, Stack, Typography } from '@mui/material';

import { HandWaving as HandWavingIcon } from '@phosphor-icons/react/dist/ssr/HandWaving';
import { SquaresFour as SquaresFourIcon } from '@phosphor-icons/react/dist/ssr/SquaresFour';

import { BrandLogo } from '@/components/brand/brand-logo';
import { SignInForm } from '@/components/auth/sign-in-form';
import { config } from '@/config';

const { name: siteName } = config.site;

export default function SignInPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor:
          'radial-gradient(ellipse 120% 80% at 50% -20%, #1a4301 0%, #0d2201 35%, #050804 70%, #000000 100%)',
        px: 2,
      }}
    >
      <Container maxWidth="md">
        <Card
          elevation={10}
          sx={{
            overflow: 'hidden',
            borderRadius: 4,
            backdropFilter: 'blur(18px)',
            background:
              'linear-gradient(145deg, rgba(13,34,8,0.97), rgba(5,13,6,0.99))',
            border: '1px solid rgba(166, 226, 46, 0.18)',
            boxShadow:
              '0 32px 80px rgba(5, 13, 6, 0.75), 0 0 48px rgba(118, 186, 27, 0.12)',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
            }}
          >
            <CardContent
              sx={{
                p: { xs: 4, md: 5 },
                borderRight: { md: '1px solid rgba(200, 239, 152, 0.12)' },
              }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="overline" sx={{ color: 'primary.light', letterSpacing: 1 }}>
                    {siteName} · Admin
                  </Typography>
                  <Typography variant="h4" sx={{ color: 'common.white', mt: 0.75, fontWeight: 700 }}>
                    Hyr si administrator
                  </Typography>
                </Box>

                <SignInForm />
              </Stack>
            </CardContent>

            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                justifyContent: 'center',
                p: 5,
                bgcolor:
                  'radial-gradient(circle at top left, rgba(166,226,46,0.22), rgba(34,197,94,0.12), transparent 58%)',
              }}
            >
              <Stack spacing={3}>
                <Box sx={{ maxWidth: 240 }}>
                  <BrandLogo
                    height={120}
                    imgSx={{
                      filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.4))',
                      maxWidth: 200,
                    }}
                  />
                </Box>

                <Stack spacing={2.25} sx={{ maxWidth: 280 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        color: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'rgba(166, 226, 46, 0.12)',
                        border: '1px solid rgba(166, 226, 46, 0.25)',
                      }}
                    >
                      {React.createElement(HandWavingIcon, { size: 22, weight: 'duotone' })}
                    </Box>
                    <Typography variant="body1" sx={{ color: 'common.white', fontWeight: 600, lineHeight: 1.35 }}>
                      Mirë se u kthyet, admin
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        color: 'primary.light',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: 'rgba(166, 226, 46, 0.12)',
                        border: '1px solid rgba(166, 226, 46, 0.25)',
                      }}
                    >
                      {React.createElement(SquaresFourIcon, { size: 22, weight: 'duotone' })}
                    </Box>
                    <Typography variant="body1" sx={{ color: 'rgba(226,232,240,0.95)', fontWeight: 600, lineHeight: 1.35 }}>
                      Qendra e kontrollit të platformës
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}

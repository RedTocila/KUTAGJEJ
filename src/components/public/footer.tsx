'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiLink from '@mui/material/Link';
import NextLink from 'next/link';

import { BrandLogo } from '@/components/brand/brand-logo';
import { config } from '@/config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface NavPage {
  title: string;
  slug: string;
}

export function PublicFooter() {
  const [navPages, setNavPages] = React.useState<NavPage[]>([]);

  React.useEffect(() => {
    const fetchNavPages = async () => {
      try {
        const response = await fetch(`${API_URL}/api/pages/navigation`);
        if (response.ok) {
          const data = await response.json();
          setNavPages(data.pages || []);
        }
      } catch (error) {
        console.error('Failed to fetch nav pages:', error);
      }
    };
    fetchNavPages();
  }, []);

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'rgba(15, 23, 42, 0.95)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'center', md: 'flex-start' },
            gap: 4,
          }}
        >
          {/* Logo & Description */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' }, maxWidth: 300 }}>
            <Box sx={{ mb: 2, justifyContent: { xs: 'center', md: 'flex-start' }, display: 'flex' }}>
              <BrandLogo
                height={36}
                showWordmark
                wordmarkSx={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {config.site.description}
            </Typography>
          </Box>

          {/* Quick Links */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
              Quick Links
            </Typography>
            <Stack spacing={1}>
              <MuiLink component={NextLink} href="/" underline="none">
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#c0ff3e' } }}>
                  Home
                </Typography>
              </MuiLink>
              <MuiLink component={NextLink} href="/auth/sign-in" underline="none">
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#c0ff3e' } }}>
                  Sign In
                </Typography>
              </MuiLink>
              <MuiLink component={NextLink} href="/app" underline="none">
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#c0ff3e' } }}>
                  Dashboard
                </Typography>
              </MuiLink>
            </Stack>
          </Box>

          {/* Pages */}
          {navPages.length > 0 && (
            <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
                Pages
              </Typography>
              <Stack spacing={1}>
                {navPages.map((page) => (
                  <MuiLink key={page.slug} component={NextLink} href={`/${page.slug}`} underline="none">
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#c0ff3e' } }}>
                      {page.title}
                    </Typography>
                  </MuiLink>
                ))}
              </Stack>
            </Box>
          )}

          {/* Contact */}
          <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
            <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
              Contact
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                info@iagent.al
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                Tirana, Albania
              </Typography>
            </Stack>
          </Box>
        </Box>

        {/* Copyright */}
        <Box sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} KuTaGjej. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}


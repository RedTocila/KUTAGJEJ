'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import MuiLink from '@mui/material/Link';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { List as ListIcon, X as XIcon } from '@phosphor-icons/react/dist/ssr';

import { BrandLogo } from '@/components/brand/brand-logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface NavPage {
  title: string;
  slug: string;
}

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [navPages, setNavPages] = React.useState<NavPage[]>([]);
  const [scrolled, setScrolled] = React.useState(false);

  // Fetch navigation pages
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

  // Handle scroll effect
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (slug: string) => pathname === `/${slug}`;

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          transition: 'all 0.3s ease',
          bgcolor: scrolled ? 'rgba(15, 23, 42, 0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.1)' : 'none',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 72,
            }}
          >
            {/* Logo */}
            <MuiLink component={NextLink} href="/" underline="none" sx={{ display: 'inline-flex' }}>
              <BrandLogo
                height={40}
                showWordmark
                wordmarkSx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  display: { xs: 'none', sm: 'inline' },
                }}
              />
            </MuiLink>

            {/* Desktop Navigation */}
            <Box
              component="nav"
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 1,
              }}
            >
              <MuiLink component={NextLink} href="/" underline="none">
                <Button
                  sx={{
                    color: pathname === '/' ? '#c0ff3e' : 'rgba(255,255,255,0.7)',
                    fontWeight: 600,
                    px: 2,
                    '&:hover': {
                      color: 'white',
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  Home
                </Button>
              </MuiLink>

              {navPages.map((page) => (
                <MuiLink key={page.slug} component={NextLink} href={`/${page.slug}`} underline="none">
                  <Button
                    sx={{
                      color: isActive(page.slug) ? '#c0ff3e' : 'rgba(255,255,255,0.7)',
                      fontWeight: 600,
                      px: 2,
                      '&:hover': {
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.05)',
                      },
                    }}
                  >
                    {page.title}
                  </Button>
                </MuiLink>
              ))}
            </Box>

            {/* CTA Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                href="/auth/sign-in"
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: 600,
                  '&:hover': {
                    color: 'white',
                  },
                }}
              >
                Sign In
              </Button>
              <Button
                href="/app"
                variant="contained"
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  fontWeight: 600,
                  px: 3,
                  background: 'linear-gradient(135deg, #a6e22e 0%, #76ba1b 45%, #1a4301 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  },
                }}
              >
                Get Started
              </Button>

              {/* Mobile Menu Button */}
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{
                  display: { md: 'none' },
                  color: 'white',
                }}
              >
                {React.createElement(ListIcon, { size: 28, weight: 'bold' })}
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 300,
              bgcolor: '#0f172a',
              backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Close Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <IconButton onClick={() => setMobileOpen(false)} sx={{ color: 'white' }}>
              {React.createElement(XIcon, { size: 24 })}
            </IconButton>
          </Box>

          {/* Logo */}
          <Box sx={{ mb: 4, px: 1 }}>
            <BrandLogo
              height={36}
              showWordmark
              wordmarkSx={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}
            />
          </Box>

          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 3 }} />

          {/* Navigation Links */}
          <Stack spacing={1}>
            <MuiLink
              component={NextLink}
              href="/"
              underline="none"
              onClick={() => {
                setMobileOpen(false);
              }}
            >
              <Button
                fullWidth
                sx={{
                  justifyContent: 'flex-start',
                  color: pathname === '/' ? '#c0ff3e' : 'rgba(255,255,255,0.8)',
                  fontWeight: 600,
                  py: 1.5,
                  px: 2,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}
              >
                Home
              </Button>
            </MuiLink>

            {navPages.map((page) => (
              <MuiLink
                key={page.slug}
                component={NextLink}
                href={`/${page.slug}`}
                underline="none"
                onClick={() => {
                  setMobileOpen(false);
                }}
              >
                <Button
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    color: isActive(page.slug) ? '#c0ff3e' : 'rgba(255,255,255,0.8)',
                    fontWeight: 600,
                    py: 1.5,
                    px: 2,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                  }}
                >
                  {page.title}
                </Button>
              </MuiLink>
            ))}
          </Stack>

          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 3 }} />

          {/* CTA Buttons */}
          <Stack spacing={2}>
            <Button
              href="/auth/sign-in"
              fullWidth
              variant="outlined"
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                fontWeight: 600,
                py: 1.5,
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              Sign In
            </Button>
            <Button
              href="/app"
              fullWidth
              variant="contained"
              sx={{
                fontWeight: 600,
                py: 1.5,
                background: 'linear-gradient(135deg, #a6e22e 0%, #76ba1b 45%, #1a4301 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                },
              }}
            >
              Get Started
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Spacer for fixed header */}
      <Box sx={{ height: 72 }} />
    </>
  );
}


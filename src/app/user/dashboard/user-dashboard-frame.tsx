'use client';

import * as React from 'react';
import { Box, Container, GlobalStyles } from '@mui/material';

import { AuthGuard } from '@/components/auth/auth-guard';
import { UserMainNav } from '@/components/user/layout/user-main-nav';
import { UserSideNav } from '@/components/user/layout/user-side-nav';

export function UserDashboardFrame({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <GlobalStyles
        styles={{
          body: {
            '--MainNav-height': '56px',
            '--MainNav-zIndex': 1000,
            '--SideNav-width': '280px',
            '--SideNav-zIndex': 1100,
            '--MobileNav-width': '320px',
            '--MobileNav-zIndex': 1100,
          },
        }}
      />
      <Box
        sx={{
          bgcolor: 'var(--mui-palette-background-default)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: '100%',
        }}
      >
        <UserSideNav />
        <Box sx={{ display: 'flex', flex: '1 1 auto', flexDirection: 'column', pl: { lg: 'var(--SideNav-width)' } }}>
          <UserMainNav />
          <main>
            <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
              {children}
            </Container>
          </main>
        </Box>
      </Box>
    </AuthGuard>
  );
}

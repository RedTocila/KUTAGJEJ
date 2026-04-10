'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import { PublicHeader } from './header';
import { PublicFooter } from './footer';

interface PublicLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function PublicLayout({ 
  children, 
  showHeader = true, 
  showFooter = true 
}: PublicLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      }}
    >
      {showHeader && <PublicHeader />}
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
      {showFooter && <PublicFooter />}
    </Box>
  );
}


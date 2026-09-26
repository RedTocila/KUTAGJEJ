'use client';

import * as React from 'react';
import { Box } from '@mui/material';

import { isNativeApp } from '@/lib/native-app';

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
  showFooter = true,
}: PublicLayoutProps) {
  const [nativeApp, setNativeApp] = React.useState(false);

  React.useEffect(() => {
    if (isNativeApp()) setNativeApp(true);
  }, []);

  const renderFooter = showFooter && !nativeApp;

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
      {renderFooter ? <PublicFooter /> : null}
    </Box>
  );
}


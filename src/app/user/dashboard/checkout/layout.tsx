import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';

import { config } from '@/config';

export const metadata: Metadata = {
  title: `Bli kredite | Paneli im | ${config.site.name}`,
};

export default function UserCheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      }
    >
      {children}
    </Suspense>
  );
}

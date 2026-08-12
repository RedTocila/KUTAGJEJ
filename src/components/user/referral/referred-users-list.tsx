'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';

import type { ReferralSignupEntry } from '@/types/referrals';

export function formatReferralDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('sq-AL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ReferredUserRow({ row }: { row: ReferralSignupEntry }) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: 'center',
        px: { xs: 2.25, sm: 2.75 },
        py: 1.2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 750, lineHeight: 1.25 }} noWrap>
          {row.referredUser?.displayName ?? '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {row.referredUser?.email ?? '—'} · {formatReferralDate(row.createdAt)}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 800,
          color: row.creditsAwarded > 0 ? 'success.main' : 'text.disabled',
          flexShrink: 0,
        }}
      >
        {row.creditsAwarded > 0 ? `+${row.creditsAwarded} BC` : '—'}
      </Typography>
    </Stack>
  );
}

export function ReferredUsersList({ users }: { users: ReferralSignupEntry[] }) {
  return (
    <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
      {users.map((row) => (
        <ReferredUserRow key={row.id} row={row} />
      ))}
    </Stack>
  );
}

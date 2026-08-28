'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { FloppyDisk as FloppyDiskIcon } from '@phosphor-icons/react/dist/ssr/FloppyDisk';

import { useOwnerEditHeaderActions } from '@/components/user/owner-edit-header-actions';

export function ListingOwnerEditShell({
  dirty,
  saving,
  error,
  success,
  onSave,
  aiAssist,
  children,
}: {
  title?: string;
  status?: 'pending' | 'approved' | 'rejected' | string | null;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  backHref?: string;
  onSave: () => void;
  aiAssist?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [visibleSuccess, setVisibleSuccess] = React.useState(success);

  React.useEffect(() => {
    setVisibleSuccess(success);
    if (!success) return;

    const timeoutId = window.setTimeout(() => setVisibleSuccess(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useOwnerEditHeaderActions(
    () => (
      <Button
        variant="contained"
        size="small"
        disabled={!dirty || saving}
        startIcon={<FloppyDiskIcon size={16} weight="bold" />}
        onClick={onSave}
        sx={{
          fontWeight: 800,
          textTransform: 'none',
          borderRadius: 2.5,
          boxShadow: 'none',
          minHeight: 36,
          '&:hover': { boxShadow: 'none' },
        }}
      >
        {saving ? 'Duke ruajtur…' : 'Ruaj'}
      </Button>
    ),
    [dirty, saving, onSave],
  );

  return (
    <Box sx={{ maxWidth: 920, mx: 'auto', width: '100%', pb: 10 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          gap: 1,
        }}
      >
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
          Ndrysho njoftimin
        </Typography>
        {aiAssist ? <Box sx={{ flexShrink: 0 }}>{aiAssist}</Box> : null}
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}
      {visibleSuccess ? (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {visibleSuccess}
        </Alert>
      ) : null}

      {children}
    </Box>
  );
}

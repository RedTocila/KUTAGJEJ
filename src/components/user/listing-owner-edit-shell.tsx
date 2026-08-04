'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
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
      {aiAssist ? <Box sx={{ mb: 2 }}>{aiAssist}</Box> : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {success}
        </Alert>
      ) : null}

      {children}
    </Box>
  );
}

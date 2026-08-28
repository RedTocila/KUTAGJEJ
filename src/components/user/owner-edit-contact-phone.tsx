'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';

import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';

export function OwnerEditContactPhone({
  value,
  onChange,
  onDone,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  return (
    <Stack spacing={1} sx={{ width: '100%', maxWidth: 420 }}>
      <TextField
        label="Telefoni"
        type="tel"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
        autoFocus
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.03)',
          },
        }}
      />
      <OwnerInlineEditActions onDone={onDone} onCancel={onCancel} />
    </Stack>
  );
}

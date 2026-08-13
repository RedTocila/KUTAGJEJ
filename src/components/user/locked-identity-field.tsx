'use client';

import * as React from 'react';
import { TextField } from '@mui/material';

import { IdentityFieldHelpAdornment } from '@/components/user/identity-field-help';
import type { IdentityFieldKind } from '@/lib/support-contact';

export function LockedIdentityField(props: {
  label: string;
  value: string;
  fieldKind: IdentityFieldKind;
  userEmail?: string;
}) {
  const { label, value, fieldKind, userEmail } = props;

  return (
    <TextField
      label={label}
      value={value}
      fullWidth
      disabled
      sx={{
        '& .MuiInputAdornment-root': {
          pointerEvents: 'auto',
        },
      }}
      slotProps={{
        input: {
          endAdornment: (
            <IdentityFieldHelpAdornment
              fieldKind={fieldKind}
              locked
              currentValue={value}
              userEmail={userEmail}
            />
          ),
        },
      }}
    />
  );
}

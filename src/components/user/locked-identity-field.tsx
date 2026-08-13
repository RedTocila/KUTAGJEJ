'use client';

import * as React from 'react';
import { Box, Link, TextField, Typography } from '@mui/material';

import {
  supportIdentityChangeWhatsappHref,
  type IdentityFieldKind,
} from '@/lib/support-contact';

export function LockedIdentityField(props: {
  label: string;
  value: string;
  fieldKind: IdentityFieldKind;
  userEmail?: string;
}) {
  const { label, value, fieldKind, userEmail } = props;
  const whatsappHref = supportIdentityChangeWhatsappHref(fieldKind, {
    currentValue: value,
    email: userEmail,
  });

  return (
    <Box>
      <TextField label={label} value={value} fullWidth disabled />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', lineHeight: 1.45 }}>
        Ky fushë nuk mund të ndryshohet vetë.{' '}
        {whatsappHref ? (
          <Link href={whatsappHref} target="_blank" rel="noopener noreferrer" underline="hover">
            Kontaktoni mbështetjen
          </Link>
        ) : (
          'Kontaktoni mbështetjen'
        )}{' '}
        për ta përditësuar.
      </Typography>
    </Box>
  );
}

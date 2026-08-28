'use client';

import * as React from 'react';
import { Stack, Typography } from '@mui/material';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';

import type { OwnerEditHandlers } from '@/components/user/owner-edit-pencil';
import { OwnerEditableSpot } from '@/components/user/owner-inline-edit';

export function OwnerContactPhone({ phone, ownerEdit }: { phone?: string | null; ownerEdit?: OwnerEditHandlers }) {
  if (!ownerEdit) return null;

  const value = phone?.trim() || 'Shtoni numrin e telefonit';

  return (
    <OwnerEditableSpot
      field="contactPhone"
      ownerEdit={ownerEdit}
      label="Ndrysho numrin e telefonit"
      sx={{ alignItems: 'center' }}
    >
      <Stack direction="row" spacing={0.65} sx={{ alignItems: 'center', color: 'text.secondary' }}>
        <PhoneIcon size={17} weight="regular" color="var(--mui-palette-primary-main)" />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {value}
        </Typography>
      </Stack>
    </OwnerEditableSpot>
  );
}

'use client';

import * as React from 'react';
import { Checkbox, FormControlLabel, Stack } from '@mui/material';

import { BusinessMobileCtaPicker, reservationsEnabledForMobileCta } from '@/components/businesses/business-mobile-cta-picker';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';
import type { BusinessMobileCtaMode } from '@/lib/business-mobile-cta';

export function BusinessMobileCtaInlineEditor({
  mobileCtaMode,
  reservationsEnabled,
  onMobileCtaModeChange,
  onReservationsEnabledChange,
  onDone,
  onCancel,
  compact = false,
}: {
  mobileCtaMode: BusinessMobileCtaMode;
  reservationsEnabled: boolean;
  onMobileCtaModeChange: (mode: BusinessMobileCtaMode) => void;
  onReservationsEnabledChange: (enabled: boolean) => void;
  onDone: () => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  return (
    <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 480 }}>
      <BusinessMobileCtaPicker
        compact={compact}
        value={mobileCtaMode}
        onChange={(mode) => {
          onMobileCtaModeChange(mode);
          onReservationsEnabledChange(reservationsEnabledForMobileCta(mode, reservationsEnabled));
        }}
      />
      {mobileCtaMode !== 'reserve' ? (
        <FormControlLabel
          control={
            <Checkbox
              checked={reservationsEnabled}
              onChange={(e) => onReservationsEnabledChange(e.target.checked)}
            />
          }
          label="Aktivizo formularin e rezervimit në faqe"
        />
      ) : null}
      <OwnerInlineEditActions onDone={onDone} onCancel={onCancel} />
    </Stack>
  );
}

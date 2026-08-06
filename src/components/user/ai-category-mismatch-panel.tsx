'use client';

import * as React from 'react';
import { Alert, Button, CircularProgress, Stack } from '@mui/material';

import { useCopy } from '@/hooks/use-copy';
import { categoryLabel } from '@/lib/ai-listing-draft';
import type { AiImportDraftResult } from '@/lib/ai-import-client';

export function AiCategoryMismatchPanel({
  draft,
  busy = false,
  allowCategorySwitch = true,
  onAcceptDetected,
  onStartOver,
}: {
  draft: AiImportDraftResult;
  busy?: boolean;
  allowCategorySwitch?: boolean;
  onAcceptDetected: () => void;
  onStartOver: () => void;
}) {
  const t = useCopy();
  const detected = draft.detectedCategory || null;
  const detectedLabel = detected ? categoryLabel(detected) : null;
  const message = detectedLabel
    ? t.aiImport.categoryMismatch(detectedLabel)
    : draft.error || t.aiImport.categoryMismatchGeneric;

  return (
    <Stack spacing={0.75} sx={{ pt: 0.25 }}>
      <Alert severity="error" sx={{ borderRadius: 2, py: 0 }}>
        {message}
      </Alert>

      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {allowCategorySwitch && detected ? (
          <Button
            size="small"
            variant="text"
            color="error"
            disabled={busy}
            onClick={onAcceptDetected}
            startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 800, px: 0.75 }}
          >
            {busy ? t.aiImport.switchingCategory : t.aiImport.switchToCategory(detectedLabel!)}
          </Button>
        ) : null}
        <Button
          size="small"
          variant="text"
          disabled={busy}
          onClick={onStartOver}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            color: 'text.secondary',
            px: 0.75,
          }}
        >
          {t.aiImport.startOver}
        </Button>
      </Stack>
    </Stack>
  );
}

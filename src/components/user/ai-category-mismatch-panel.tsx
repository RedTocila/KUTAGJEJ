'use client';

import * as React from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

import { useCopy } from '@/hooks/use-copy';
import { categoryLabel } from '@/lib/ai-listing-draft';
import type { AiImportDraftResult } from '@/lib/ai-import-client';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_ON,
  AI_SEARCH_BLUE_SOFT,
  localizeHomeVerticals,
  type HomeVerticalId,
} from '@/lib/home-categories';
import { useLanguage } from '@/hooks/use-language';
import type { ListingCategoryKey } from '@/types/listing-category';

function toListingCategory(id: HomeVerticalId): ListingCategoryKey {
  return id === 'jobs' ? 'job-listings' : id;
}

export function AiCategoryMismatchPanel({
  draft,
  busy = false,
  allowCategorySwitch = true,
  onAcceptDetected,
  onPickCategory,
  onStartOver,
}: {
  draft: AiImportDraftResult;
  busy?: boolean;
  allowCategorySwitch?: boolean;
  onAcceptDetected: () => void;
  onPickCategory: (category: ListingCategoryKey) => void;
  onStartOver: () => void;
}) {
  const t = useCopy();
  const { language } = useLanguage();
  const categories = React.useMemo(() => localizeHomeVerticals(language), [language]);
  const detected = draft.detectedCategory || null;
  const preferred = draft.preferredCategory || null;
  const message = detected
    ? t.aiImport.categoryMismatch(categoryLabel(detected))
    : draft.error || t.aiImport.categoryMismatchGeneric;

  return (
    <Stack spacing={1.25}>
      <Alert severity="error" sx={{ borderRadius: 2, py: 0.5 }}>
        <Stack spacing={0.5}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {allowCategorySwitch
              ? t.aiImport.categoryMismatchHint
              : t.aiImport.startOver}
          </Typography>
        </Stack>
      </Alert>

      {allowCategorySwitch && detected ? (
        <Button
          variant="contained"
          disabled={busy}
          onClick={onAcceptDetected}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{
            textTransform: 'none',
            fontWeight: 800,
            borderRadius: '16px',
            boxShadow: 'none',
            bgcolor: AI_SEARCH_BLUE,
            color: AI_SEARCH_BLUE_ON,
            alignSelf: 'flex-start',
            '&:hover': {
              boxShadow: 'none',
              bgcolor: AI_SEARCH_BLUE_HOVER,
              color: AI_SEARCH_BLUE_ON,
            },
          }}
        >
          {busy ? t.aiImport.switchingCategory : t.aiImport.switchToCategory(categoryLabel(detected))}
        </Button>
      ) : null}

      {allowCategorySwitch ? (
        <Stack spacing={0.75}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {t.aiImport.changeCategoryKeepDraft}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
            }}
          >
            {categories.map((item) => {
              const key = toListingCategory(item.id);
              if (preferred && key === preferred) return null;
              const isDetected = detected === key;
              return (
                <Button
                  key={item.id}
                  size="small"
                  disabled={busy}
                  variant={isDetected ? 'contained' : 'outlined'}
                  onClick={() => onPickCategory(key)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '999px',
                    borderColor: AI_SEARCH_BLUE,
                    ...(isDetected
                      ? {
                          bgcolor: AI_SEARCH_BLUE,
                          color: AI_SEARCH_BLUE_ON,
                          '&:hover': { bgcolor: AI_SEARCH_BLUE_HOVER, color: AI_SEARCH_BLUE_ON },
                        }
                      : {
                          color: AI_SEARCH_BLUE,
                          '&:hover': { bgcolor: AI_SEARCH_BLUE_SOFT, borderColor: AI_SEARCH_BLUE },
                        }),
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>
        </Stack>
      ) : null}

      <Button
        variant="text"
        disabled={busy}
        onClick={onStartOver}
        sx={{
          textTransform: 'none',
          fontWeight: 700,
          alignSelf: 'flex-start',
          color: 'text.secondary',
          px: 0.5,
        }}
      >
        {t.aiImport.startOver}
      </Button>
    </Stack>
  );
}

export { toListingCategory };

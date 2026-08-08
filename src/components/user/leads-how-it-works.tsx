'use client';

import * as React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { Question as QuestionIcon } from '@phosphor-icons/react/dist/ssr/Question';

import {
  ProductDialog,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { useCopy } from '@/hooks/use-copy';
import { notificationFilterIcon } from '@/lib/notification-filter-tags';
import { LEAD_NOTIFICATION_TAGS } from '@/lib/notification-tags';

export function LeadsHowItWorksDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useCopy();
  const copy = t.notifications.leadsHowItWorks;

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <ProductDialogTitle onClose={onClose}>{copy.title}</ProductDialogTitle>
      <ProductDialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5, fontWeight: 550 }}>
          {copy.intro}
        </Typography>
        <Stack spacing={1.5}>
          {LEAD_NOTIFICATION_TAGS.map((tag) => {
            const Icon = notificationFilterIcon(tag);
            const item = copy.types[tag];
            return (
              <Stack key={tag} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                  }}
                >
                  <Icon size={18} weight="duotone" />
                </Box>
                <Box sx={{ minWidth: 0, pt: 0.15 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.25, mb: 0.25 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45, fontWeight: 550 }}>
                    {item.description}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </ProductDialogContent>
    </ProductDialog>
  );
}

/** Compact “?” that opens the leads how-it-works dialog (packages + leads page). */
export function LeadsHelpButton({
  size = 'md',
}: {
  /** `sm` for package feature lines; `md` for page headers. */
  size?: 'sm' | 'md';
}) {
  const t = useCopy();
  const [open, setOpen] = React.useState(false);
  const iconPx = size === 'sm' ? 16 : 20;

  const stop = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={t.notifications.leadsHowItWorks.aria}
        onClick={(event) => {
          stop(event);
          setOpen(true);
        }}
        onMouseDown={stop}
        onTouchStart={(event) => {
          event.stopPropagation();
        }}
        sx={{
          p: size === 'sm' ? 0.25 : 0.5,
          color: 'text.secondary',
          verticalAlign: 'middle',
          '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
        }}
      >
        <QuestionIcon size={iconPx} weight="bold" />
      </IconButton>
      <LeadsHowItWorksDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** “Leads: …” with “?” aligned to the right of the feature row. */
export function PackageLeadsFeatureLabel() {
  const t = useCopy();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 0.75,
        width: '100%',
      }}
    >
      <Box component="span" sx={{ minWidth: 0 }}>
        {t.packages.saveLeads}
      </Box>
      <Box sx={{ flexShrink: 0, display: 'inline-flex', mt: '-1px' }}>
        <LeadsHelpButton size="sm" />
      </Box>
    </Box>
  );
}

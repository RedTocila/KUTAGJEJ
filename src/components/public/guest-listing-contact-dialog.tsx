'use client';

import * as React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { UserPlus as UserPlusIcon } from '@phosphor-icons/react/dist/ssr/UserPlus';
import { WhatsappLogo as WhatsappIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import {
  ProductDialog,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { useCopy } from '@/hooks/use-copy';
import { telHref, whatsappInquireHref } from '@/lib/listing-contact';
import { emitHotLeadContactAction } from '@/lib/listing-hot-lead';

export interface GuestListingContactDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenAccount: () => void;
  contactPhone?: string | null;
  listingTitle?: string | null;
  listingUrl?: string | null;
  listingKind?: string;
  listingId?: string;
}

export function GuestListingContactDialog({
  open,
  onClose,
  onOpenAccount,
  contactPhone,
  listingTitle,
  listingUrl,
  listingKind,
  listingId,
}: GuestListingContactDialogProps) {
  const t = useCopy();
  const callHref = telHref(contactPhone);
  const title = listingTitle?.trim();
  const intro = title
    ? listingUrl
      ? t.messages.whatsappIntro(title).replace(/\.\s*$/, ` (${listingUrl}).`)
      : t.messages.whatsappIntro(title)
    : null;
  const waHref = whatsappInquireHref(contactPhone, intro);
  const hasDirectContact = Boolean(callHref || waHref);

  const markContact = () => {
    emitHotLeadContactAction({ listingKind, listingId });
  };

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <ProductDialogTitle onClose={onClose}>{t.listingContact.dialogTitle}</ProductDialogTitle>
      <ProductDialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
          {t.listingContact.dialogDescription}
        </Typography>
        <Stack spacing={1.25}>
          {callHref ? (
            <Button
              component="a"
              href={callHref}
              fullWidth
              variant="contained"
              size="large"
              startIcon={<PhoneIcon size={20} weight="bold" />}
              onClick={() => {
                markContact();
                onClose();
              }}
              sx={{ fontWeight: 800, borderRadius: 2.5, py: 1.25, textTransform: 'none' }}
            >
              {t.listingContact.call}
            </Button>
          ) : null}
          {waHref ? (
            <Button
              component="a"
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<WhatsappIcon size={20} weight="bold" />}
              onClick={() => {
                markContact();
                onClose();
              }}
              sx={{
                fontWeight: 800,
                borderRadius: 2.5,
                py: 1.25,
                textTransform: 'none',
                color: '#25D366',
                borderColor: '#25D366',
                '&:hover': {
                  borderColor: '#1da851',
                  bgcolor: 'rgba(37, 211, 102, 0.08)',
                },
              }}
            >
              {t.listingContact.whatsapp}
            </Button>
          ) : null}
          <Button
            type="button"
            fullWidth
            variant={hasDirectContact ? 'outlined' : 'contained'}
            size="large"
            startIcon={<UserPlusIcon size={20} weight="bold" />}
            onClick={onOpenAccount}
            sx={{
              fontWeight: 800,
              borderRadius: 2.5,
              py: 1.25,
              textTransform: 'none',
              ...(hasDirectContact
                ? {
                    borderWidth: 2,
                    borderColor: 'divider',
                    color: 'text.primary',
                    '&:hover': { borderWidth: 2, borderColor: 'primary.light', bgcolor: 'action.hover' },
                  }
                : null),
            }}
          >
            {t.listingContact.openAccount}
          </Button>
        </Stack>
      </ProductDialogContent>
    </ProductDialog>
  );
}

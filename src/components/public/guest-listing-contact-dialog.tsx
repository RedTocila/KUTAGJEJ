'use client';

import * as React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { UserPlus as UserPlusIcon } from '@phosphor-icons/react/dist/ssr/UserPlus';
import { WhatsappLogo as WhatsappIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import {
  ProductDialog,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { useCopy } from '@/hooks/use-copy';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
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
  /** Hide “open account / message” — phone and WhatsApp only. */
  hideAccountOption?: boolean;
}

const actionBtnSx = {
  fontWeight: 800,
  borderRadius: 2.5,
  py: 1.35,
  textTransform: 'none' as const,
  minHeight: 52,
};

export function GuestListingContactDialog({
  open,
  onClose,
  onOpenAccount,
  contactPhone,
  listingTitle,
  listingUrl,
  listingKind,
  listingId,
  hideAccountOption = false,
}: GuestListingContactDialogProps) {
  const t = useCopy();
  const callHref = telHref(contactPhone);
  const title = listingTitle?.trim();
  const intro = title ? t.messages.whatsappIntro(title, listingUrl) : null;
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
              sx={actionBtnSx}
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
                ...actionBtnSx,
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
          {!hideAccountOption ? (
          <Button
            type="button"
            fullWidth
            variant={hasDirectContact ? 'outlined' : 'contained'}
            size="large"
            onClick={onOpenAccount}
            sx={{
              ...actionBtnSx,
              py: 1.2,
              px: 1.5,
              justifyContent: 'flex-start',
              textAlign: 'left',
              ...(hasDirectContact
                ? {
                    borderWidth: 1.5,
                    borderColor: 'divider',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'action.hover',
                    color: 'text.primary',
                    '&:hover': {
                      borderWidth: 1.5,
                      borderColor: 'primary.light',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.07)'
                          : primaryMainAlpha(0.08),
                    },
                  }
                : null),
            }}
          >
            <Stack direction="row" spacing={1.35} sx={{ alignItems: 'center', width: '100%', minWidth: 0 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: hasDirectContact ? primaryMainAlpha(0.16) : 'primary.contrastText',
                  color: hasDirectContact ? 'primary.main' : 'primary.main',
                }}
              >
                <UserPlusIcon size={20} weight="bold" />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.2 }}>
                  {t.listingContact.openAccount}
                </Typography>
                <Typography
                  variant="caption"
                  color={hasDirectContact ? 'text.secondary' : 'primary.contrastText'}
                  sx={{ display: 'block', mt: 0.2, lineHeight: 1.3, fontWeight: 600, opacity: 0.82 }}
                >
                  {t.listingContact.openAccountHint}
                </Typography>
              </Box>
              <Box
                sx={{
                  color: hasDirectContact ? 'text.secondary' : 'primary.contrastText',
                  display: 'flex',
                  flexShrink: 0,
                  opacity: 0.7,
                }}
              >
                <CaretRightIcon size={18} weight="bold" />
              </Box>
            </Stack>
          </Button>
          ) : null}
        </Stack>
      </ProductDialogContent>
    </ProductDialog>
  );
}

'use client';

import * as React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Headset as HeadsetIcon } from '@phosphor-icons/react/dist/ssr/Headset';
import { Phone as PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { WhatsappLogo as WhatsappIcon } from '@phosphor-icons/react/dist/ssr/WhatsappLogo';

import {
  ProductDialog,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { PortalIconBox, portalCardSx } from '@/components/user/portal-cards';
import { useCopy } from '@/hooks/use-copy';
import {
  supportCallHref,
  supportWhatsappHref,
} from '@/lib/support-contact';

export function SupportContactRow({ grouped = false }: { grouped?: boolean }) {
  const t = useCopy();
  const [open, setOpen] = React.useState(false);
  const callHref = supportCallHref();
  const whatsappHrefValue = supportWhatsappHref();

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        sx={{
          font: 'inherit',
          color: 'inherit',
          textAlign: 'left',
          border: 0,
          bgcolor: 'transparent',
          cursor: 'pointer',
          display: 'block',
          width: '100%',
          p: { xs: 2.25, sm: 2.75 },
          ...(grouped ? null : portalCardSx),
          transition: 'background-color 0.15s ease',
          '&:hover': {
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'action.hover',
          },
        }}
      >
        <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
          <PortalIconBox>{React.createElement(HeadsetIcon, { size: 24, weight: 'duotone' })}</PortalIconBox>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
              {t.support.title}
            </Typography>
          </Box>
          <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0, opacity: 0.7 }}>
            <CaretRightIcon size={20} weight="bold" />
          </Box>
        </Stack>
      </Box>

      <ProductDialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <ProductDialogTitle onClose={() => setOpen(false)}>{t.support.dialogTitle}</ProductDialogTitle>
        <ProductDialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.5 }}>
            {t.support.dialogDescription}
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
                onClick={() => setOpen(false)}
                sx={{ fontWeight: 800, borderRadius: 2.5, py: 1.25 }}
              >
                {t.support.call}
              </Button>
            ) : null}
            {whatsappHrefValue ? (
              <Button
                component="a"
                href={whatsappHrefValue}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<WhatsappIcon size={20} weight="bold" />}
                onClick={() => setOpen(false)}
                sx={{
                  fontWeight: 800,
                  borderRadius: 2.5,
                  py: 1.25,
                  color: '#25D366',
                  borderColor: '#25D366',
                  '&:hover': {
                    borderColor: '#1da851',
                    bgcolor: 'rgba(37, 211, 102, 0.08)',
                  },
                }}
              >
                {t.support.whatsapp}
              </Button>
            ) : null}
          </Stack>
        </ProductDialogContent>
      </ProductDialog>
    </>
  );
}

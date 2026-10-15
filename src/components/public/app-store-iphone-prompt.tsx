'use client';

import * as React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AppleLogo as AppleLogoIcon } from '@phosphor-icons/react/dist/ssr/AppleLogo';

import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { appStoreUrl } from '@/config';
import { useCopy } from '@/hooks/use-copy';
import { isIphoneMobileBrowser } from '@/lib/apple-desktop-browser';

const DISMISS_KEY = 'kutagjej:iphone-app-store-prompt-dismissed';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Download popup for iPhone visitors in Safari, Chrome, and every other mobile browser.
 * Sits above the navbar and the floating bottom nav. Close is remembered on this device.
 */
export function AppStoreIphonePrompt() {
  const t = useCopy();
  const [open, setOpen] = React.useState(false);
  const [container, setContainer] = React.useState<HTMLElement | undefined>(undefined);

  React.useEffect(() => {
    setContainer(document.body);
    setOpen(isIphoneMobileBrowser() && !readDismissed());
  }, []);

  const close = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode can block storage; still hide for this view.
    }
    setOpen(false);
  };

  return (
    <ProductDialog
      open={open}
      onClose={close}
      container={container}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 20 }}
    >
      <ProductDialogTitle onClose={close}>
        {t.chrome.appStorePopupTitle}
      </ProductDialogTitle>
      <ProductDialogContent>
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Box
            aria-hidden
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 56,
              height: 56,
              borderRadius: 2.5,
              bgcolor: 'text.primary',
              color: 'background.paper',
            }}
          >
            {React.createElement(AppleLogoIcon, { size: 28, weight: 'fill' })}
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.95rem', lineHeight: 1.45 }}>
            {t.chrome.appStorePopupBody}
          </Typography>
        </Stack>
      </ProductDialogContent>
      <ProductDialogActions>
        <Button
          component="a"
          href={appStoreUrl}
          rel="noopener noreferrer"
          variant="contained"
          fullWidth
          size="large"
          aria-label={t.chrome.appStoreDownloadAria}
          sx={{
            borderRadius: 2.25,
            fontWeight: 700,
            textTransform: 'none',
            py: 1.15,
            fontSize: '1rem',
          }}
        >
          {t.chrome.appStoreDownload}
        </Button>
      </ProductDialogActions>
    </ProductDialog>
  );
}

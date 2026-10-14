'use client';

import * as React from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { AppleLogo as AppleLogoIcon } from '@phosphor-icons/react/dist/ssr/AppleLogo';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { createPortal } from 'react-dom';

import { appStoreUrl } from '@/config';
import { useCopy } from '@/hooks/use-copy';
import { isAppleDesktopBrowser } from '@/lib/apple-desktop-browser';

const DISMISS_KEY = 'kutagjej:app-store-prompt-dismissed';
const HEIGHT_VAR = '--kg-app-store-banner';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Slim prompt fixed above the public navbar.
 * Shown only to Apple desktop browsers; close is remembered on this device.
 */
export function AppStoreDesktopPrompt() {
  const t = useCopy();
  const barRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [portalReady, setPortalReady] = React.useState(false);

  React.useEffect(() => {
    setPortalReady(true);
    const sync = () => {
      setOpen(isAppleDesktopBrowser() && !readDismissed());
    };
    sync();
    const mq = window.matchMedia('(min-width: 900px)');
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    if (!open) {
      root.style.removeProperty(HEIGHT_VAR);
      return undefined;
    }

    const el = barRef.current;
    const apply = () => {
      const height = el?.getBoundingClientRect().height ?? 0;
      root.style.setProperty(HEIGHT_VAR, `${Math.ceil(height)}px`);
    };
    apply();

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    if (el) observer?.observe(el);

    return () => {
      observer?.disconnect();
      root.style.removeProperty(HEIGHT_VAR);
    };
  }, [open]);

  const close = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode can block storage; still hide for this view.
    }
    setOpen(false);
  };

  if (!portalReady || !open) return null;

  return createPortal(
    <Box
      ref={barRef}
      component="section"
      aria-label={t.chrome.appStorePrompt}
      sx={(theme) => ({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar + 1,
        display: { xs: 'none', md: 'block' },
        color: 'text.primary',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(95, 152, 22, 0.22)' : 'rgba(95, 152, 22, 0.14)',
        borderBottom: '1px solid',
        borderColor: theme.palette.mode === 'dark' ? 'rgba(192, 255, 62, 0.22)' : 'rgba(95, 152, 22, 0.28)',
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
      })}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 52,
          px: 2,
          py: 0.75,
          gap: 1.5,
        }}
      >
        <Box
          aria-hidden
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: 'text.primary',
            color: 'background.paper',
            flexShrink: 0,
          }}
        >
          {React.createElement(AppleLogoIcon, { size: 18, weight: 'fill' })}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>
          {t.chrome.appStorePrompt}
        </Typography>
        <Button
          component="a"
          href={appStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="contained"
          size="small"
          aria-label={t.chrome.appStoreDownloadAria}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            textTransform: 'none',
            px: 1.75,
            flexShrink: 0,
          }}
        >
          {t.chrome.appStoreDownload}
        </Button>
        <IconButton
          onClick={close}
          aria-label={t.common.close}
          size="small"
          sx={{ color: 'text.primary', flexShrink: 0 }}
        >
          {React.createElement(XIcon, { size: 18, weight: 'bold' })}
        </IconButton>
      </Stack>
    </Box>,
    document.body,
  );
}

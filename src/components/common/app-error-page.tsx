'use client';

import * as React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowClockwise as ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';

import { PlatformErrorIllustration } from '@/components/common/platform-error-illustration';
import { productButtonSx } from '@/styles/product-sx';

export type AppErrorPageProps = {
  /** Optional status code (e.g. 404, 500). If omitted, inferred from title or defaults to '404'. */
  statusCode?: string | number;
  /** Main heading / subtitle describing the error state. */
  title: string;
  /** Explanatory helper message. */
  description?: string;
  /** Optional custom image URL; defaults to platform vector illustration. */
  imageSrc?: string;
  /** Alt text for custom image if provided. */
  imageAlt?: string;
  /** Primary Reload action handler. */
  onReload?: () => void;
  /** Text label on the reload button (defaults to 'Rifresko'). */
  reloadLabel?: string;
};

/**
 * Shared full-page error & 404 layout matching KuTaGjej platform theme:
 * - Prominent Status Code (e.g. 404 / 500)
 * - Clear title and subtitle
 * - Platform-related discovery & search vector illustration
 * - Single platform-themed primary Reload button
 */
export function AppErrorPage({
  statusCode,
  title,
  description,
  imageSrc,
  imageAlt = 'KuTaGjej',
  onReload,
  reloadLabel = 'Rifresko',
}: AppErrorPageProps) {
  const [busy, setBusy] = React.useState(false);

  // Parse status code from title if prefixed with '404:' / '500:'
  const { parsedCode, parsedTitle } = React.useMemo(() => {
    if (statusCode) {
      return { parsedCode: String(statusCode), parsedTitle: title };
    }
    const match = title.match(/^(\d{3})\s*:\s*(.*)$/);
    if (match) {
      return { parsedCode: match[1], parsedTitle: match[2] };
    }
    return { parsedCode: '404', parsedTitle: title };
  }, [statusCode, title]);

  const handleReload = React.useCallback(() => {
    setBusy(true);
    if (onReload) {
      onReload();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
    window.setTimeout(() => setBusy(false), 2500);
  }, [onReload]);

  return (
    <Box
      component="main"
      sx={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: { xs: '75dvh', md: '82vh' },
        px: 2.5,
        py: { xs: 5, md: 8 },
        textAlign: 'center',
      }}
    >
      <Stack
        spacing={0}
        sx={{
          alignItems: 'center',
          maxWidth: 480,
          width: '100%',
        }}
      >
        {/* Large Status Code Number */}
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '4.75rem', sm: '6rem', md: '6.75rem' },
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
            color: 'text.primary',
            userSelect: 'none',
          }}
        >
          {parsedCode}
        </Typography>

        {/* Subtitle / Error Heading */}
        <Typography
          variant="h5"
          component="h2"
          sx={{
            mt: 2,
            fontWeight: 800,
            fontSize: { xs: '1.35rem', sm: '1.625rem' },
            letterSpacing: '-0.02em',
            color: 'text.primary',
            maxWidth: 420,
          }}
        >
          {parsedTitle}
        </Typography>

        {/* Optional helper description */}
        {description ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.25,
              maxWidth: 400,
              lineHeight: 1.55,
              fontSize: { xs: '0.875rem', sm: '0.9375rem' },
            }}
          >
            {description}
          </Typography>
        ) : null}

        {/* Platform-themed illustration */}
        <Box sx={{ my: { xs: 3.5, sm: 4.5 }, width: '100%', display: 'flex', justifyContent: 'center' }}>
          {imageSrc ? (
            <Box
              component="img"
              alt={imageAlt}
              src={imageSrc}
              sx={{
                display: 'block',
                height: 'auto',
                maxWidth: '100%',
                width: 320,
              }}
            />
          ) : (
            <PlatformErrorIllustration statusCode={parsedCode} />
          )}
        </Box>

        {/* Single Reload button styled with platform's theme */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          disabled={busy}
          startIcon={<ArrowClockwiseIcon size={19} weight="bold" />}
          onClick={handleReload}
          sx={{
            ...productButtonSx,
            borderRadius: 999,
            px: { xs: 4, sm: 5 },
            py: 1.35,
            fontSize: '0.9375rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            minWidth: 170,
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 10px 28px -6px rgba(130, 201, 30, 0.35)'
                : '0 8px 24px -4px rgba(95, 152, 22, 0.32)',
            '&:hover': {
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '0 12px 32px -4px rgba(130, 201, 30, 0.45)'
                  : '0 10px 28px -4px rgba(95, 152, 22, 0.4)',
            },
          }}
        >
          {reloadLabel}
        </Button>
      </Stack>
    </Box>
  );
}

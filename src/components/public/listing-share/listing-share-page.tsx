'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { ProductBackButton } from '@/components/public/product-browse-chrome';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { ShareNetwork as ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import {
  ListingStoryTemplate,
  STORY_HEIGHT,
  STORY_WIDTH,
  StoryBackground,
} from '@/components/public/listing-share/listing-story-template';
import { resolveListingShareUrl, type ListingSharePayload } from '@/lib/listing-share';
import { recordListingMetricEvent, type ListingMetrics } from '@/lib/listing-metrics';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

const BRAND_GREEN = '#76ba1b';
const SHEET_BG = 'rgba(12, 12, 12, 0.94)';

async function shareLink(title: string, url: string): Promise<void> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    throw new Error('share_unavailable');
  }
  await navigator.share({ title, text: title, url });
}

async function copyLink(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
}

const btnSx = {
  height: 54,
  borderRadius: 2,
  fontWeight: 800,
  textTransform: 'none' as const,
  fontSize: '0.95rem',
  boxShadow: 'none',
  px: 1.5,
  letterSpacing: '-0.01em',
  flex: 1,
  minWidth: 0,
};

/** Full-page share experience — branded preview + share / copy link. */
export function ListingSharePage({
  open,
  onClose,
  payload,
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  payload: ListingSharePayload | null;
  onShared?: (metrics: ListingMetrics) => void;
}) {
  const previewWrapRef = React.useRef<HTMLDivElement>(null);
  const [busy, setBusy] = React.useState<'share' | 'copy' | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [previewScale, setPreviewScale] = React.useState(0.28);
  const [mounted, setMounted] = React.useState(false);

  useLockBodyScroll(open && mounted && Boolean(payload));

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setBusy(null);
      setFeedback(null);
      setError(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const el = previewWrapRef.current;
    if (!el) return;

    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 8 || h < 8) return;
      const scale = Math.min(w / STORY_WIDTH, h / STORY_HEIGHT) * 0.96;
      setPreviewScale(Math.max(0.12, scale));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose, open]);

  const bumpShareMetric = React.useCallback(async () => {
    if (!payload) return null;
    const metrics = await recordListingMetricEvent(payload.listingKind, payload.listingId, 'share');
    if (metrics) onShared?.(metrics);
    return metrics;
  }, [onShared, payload]);

  const handleShare = React.useCallback(async () => {
    if (!payload || busy) return;
    setBusy('share');
    setError(null);
    setFeedback(null);
    try {
      const url = resolveListingShareUrl(payload);
      await shareLink(payload.title, url);
      await bumpShareMetric();
      setFeedback('Linku u nda.');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled the share sheet.
      } else if (err instanceof Error && err.message === 'share_unavailable') {
        // Desktop / unsupported — fall back to copy.
        try {
          const url = resolveListingShareUrl(payload);
          await copyLink(url);
          await bumpShareMetric();
          setFeedback('Linku u kopjua.');
        } catch {
          setError('Nuk u nda linku. Provo përsëri.');
        }
      } else {
        setError('Nuk u nda linku. Provo përsëri.');
      }
    } finally {
      setBusy(null);
    }
  }, [busy, bumpShareMetric, payload]);

  const handleCopyLink = React.useCallback(async () => {
    if (!payload || busy) return;
    setBusy('copy');
    setError(null);
    setFeedback(null);
    try {
      const url = resolveListingShareUrl(payload);
      await copyLink(url);
      await bumpShareMetric();
      setFeedback('Linku u kopjua.');
    } catch {
      setError('Nuk u kopjua linku. Provo përsëri.');
    } finally {
      setBusy(null);
    }
  }, [busy, bumpShareMetric, payload]);

  if (!mounted || !open || !payload) return null;

  return createPortal(
    <Box
      role="dialog"
      aria-modal="true"
      aria-label="Ndaj njoftimin"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1600,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#0a0a0a',
        color: '#fff',
        overscrollBehavior: 'none',
        touchAction: 'manipulation',
      }}
    >
      {/* Immersive branded backdrop behind preview */}
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.55 }}>
        <StoryBackground />
      </Box>

      {/* Top bar */}
      <Stack
        direction="row"
        sx={{
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.25, sm: 2 },
          pt: { xs: 'max(10px, env(safe-area-inset-top))', sm: 1.5 },
          pb: 1,
          flexShrink: 0,
          zIndex: 2,
        }}
      >
        <ProductBackButton
          aria-label="Prapa"
          onClick={onClose}
          disabled={Boolean(busy)}
          sx={{
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.18)',
            bgcolor: 'rgba(255,255,255,0.06)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
          }}
        />
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '1.05rem',
            letterSpacing: '-0.02em',
            color: '#fff',
          }}
        >
          Ndaj njoftimin
        </Typography>
        <Box sx={{ width: 40 }} />
      </Stack>

      {/* Story preview */}
      <Box
        ref={previewWrapRef}
        sx={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          py: 0.5,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: STORY_WIDTH * previewScale,
            height: STORY_HEIGHT * previewScale,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: `0 0 0 1px rgba(118,186,27,0.35), 0 24px 64px rgba(0,0,0,0.65)`,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              width: STORY_WIDTH,
              height: STORY_HEIGHT,
              transform: `scale(${previewScale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          >
            <ListingStoryTemplate payload={payload} />
          </Box>
        </Box>
      </Box>

      {/* Bottom actions */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          flexShrink: 0,
          px: { xs: 1.75, sm: 3 },
          pt: 1.75,
          pb: { xs: 'max(18px, env(safe-area-inset-bottom))', sm: 2.75 },
          bgcolor: SHEET_BG,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 -16px 48px rgba(0,0,0,0.45)',
        }}
      >
        <Stack spacing={1.25} sx={{ maxWidth: 440, mx: 'auto', width: '100%' }}>
          <Stack direction="row" spacing={1.25} sx={{ width: '100%' }}>
            <Button
              type="button"
              variant="contained"
              disableElevation
              size="large"
              disabled={Boolean(busy)}
              onClick={() => void handleShare()}
              startIcon={
                busy === 'share' ? (
                  <CircularProgress size={18} sx={{ color: '#0a0a0a' }} />
                ) : (
                  <ShareNetworkIcon size={20} weight="bold" />
                )
              }
              sx={{
                ...btnSx,
                bgcolor: BRAND_GREEN,
                color: '#0a0a0a',
                '&:hover': { bgcolor: '#86c92a', color: '#0a0a0a', boxShadow: 'none' },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(118,186,27,0.35)',
                  color: 'rgba(10,10,10,0.5)',
                },
              }}
            >
              Ndaj
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="large"
              disabled={Boolean(busy)}
              onClick={() => void handleCopyLink()}
              startIcon={
                busy === 'copy' ? (
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                ) : (
                  <LinkSimpleIcon size={18} weight="bold" />
                )
              }
              sx={{
                ...btnSx,
                borderColor: 'rgba(255,255,255,0.22)',
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.04)',
                '&:hover': {
                  borderColor: BRAND_GREEN,
                  bgcolor: 'rgba(118,186,27,0.12)',
                  color: '#fff',
                },
                '&.Mui-disabled': {
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.35)',
                },
              }}
            >
              Kopjo linkun
            </Button>
          </Stack>

          {feedback ? (
            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.65)',
                fontWeight: 550,
                fontSize: '0.8rem',
              }}
            >
              {feedback}
            </Typography>
          ) : null}

          {error ? (
            <Alert
              severity="error"
              sx={{
                borderRadius: 2,
                py: 0.15,
                bgcolor: 'rgba(248,113,113,0.12)',
                color: '#fff',
                border: '1px solid rgba(248,113,113,0.35)',
                '& .MuiAlert-icon': { color: '#f87171' },
              }}
            >
              {error}
            </Alert>
          ) : null}
        </Stack>
      </Box>
    </Box>,
    document.body,
  );
}

/** @deprecated Use {@link ListingSharePage} — kept as alias for older imports. */
export const ListingShareDialog = ListingSharePage;

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
import { DownloadSimple as DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { InstagramLogo as InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { toJpeg } from 'html-to-image';

import {
  FEED_HEIGHT,
  FEED_WIDTH,
  ListingFeedTemplate,
  ListingStoryTemplate,
  STORY_HEIGHT,
  STORY_WIDTH,
  StoryBackground,
} from '@/components/public/listing-share/listing-story-template';
import {
  embedImageAsDataUrl,
  fetchListingShareContactPhone,
  resolveListingShareUrl,
  resolveStoryImageSrc,
  type ListingSharePayload,
} from '@/lib/listing-share';
import { emitHotLeadShare } from '@/lib/listing-hot-lead';
import { recordListingMetricEvent, type ListingMetrics } from '@/lib/listing-metrics';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

const BRAND_GREEN = '#76ba1b';
const SHEET_BG = 'rgba(12, 12, 12, 0.94)';

async function copyLink(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
}

function isMobileShareDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android|iP(hone|ad|od)/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isIosLike(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function downloadFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(header ?? '')?.[1] ?? 'image/jpeg';
  const binary = atob(data ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          window.setTimeout(done, 4000);
        }),
    ),
  );
}

/** Replace listing photo src with an embedded data URL on the live DOM (Safari-safe). */
async function ensureListingImageEmbedded(root: HTMLElement, imageUrl: string | null | undefined) {
  if (!imageUrl) return;
  const img = root.querySelector<HTMLImageElement>('img[data-story-listing-image]');
  if (!img) return;
  if (img.src.startsWith('data:image/') && img.complete && img.naturalWidth > 0) return;

  const source = resolveStoryImageSrc(imageUrl) || imageUrl;
  if (img.src !== source && !img.src.startsWith('data:image/')) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      img.removeAttribute('crossorigin');
      img.referrerPolicy = 'no-referrer';
      img.src = source;
      if (img.complete && img.naturalWidth > 0) done();
      else window.setTimeout(done, 2500);
    });
    if (img.complete && img.naturalWidth > 0) return;
  }

  const embedded = await embedImageAsDataUrl(source);
  if (!embedded) return;

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    img.removeAttribute('crossorigin');
    img.src = embedded;
    if (img.complete && img.naturalWidth > 0) done();
    else window.setTimeout(done, 4000);
  });
}

type JpegCaptureOptions = {
  root: HTMLElement;
  imageUrl: string | null | undefined;
  width: number;
  height: number;
  backgroundColor: string;
  pixelRatio?: number;
  dropShadow?: boolean;
};

async function captureElementAsJpegFile(
  {
    root,
    imageUrl,
    width,
    height,
    backgroundColor,
    pixelRatio = 2,
    dropShadow = false,
  }: JpegCaptureOptions,
  filename: string,
): Promise<File> {
  await ensureListingImageEmbedded(root, imageUrl);
  await waitForImages(root);
  await new Promise((r) => window.setTimeout(r, 120));

  const jpegOpts = {
    cacheBust: false,
    skipFonts: true,
    skipAutoScale: true,
    pixelRatio,
    quality: 0.92,
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    canvasWidth: Math.max(1, Math.round(width)),
    canvasHeight: Math.max(1, Math.round(height)),
    backgroundColor,
    imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
    onImageErrorHandler: () => undefined,
    fetchRequestInit: { mode: 'cors' as RequestMode, credentials: 'omit' as RequestCredentials },
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      boxShadow: dropShadow ? undefined : 'none',
      width: `${Math.max(1, Math.round(width))}px`,
      height: `${Math.max(1, Math.round(height))}px`,
    },
  };

  const capture = () => toJpeg(root, jpegOpts);

  if (needsCaptureWarmup()) {
    await capture().catch(() => null);
    await new Promise((r) => window.setTimeout(r, 80));
  }

  const dataUrl = await capture();
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('capture empty');
  }

  return dataUrlToFile(dataUrl, filename);
}

/**
 * Open the native share sheet with a story image so the user can pick Instagram Stories.
 * iOS Safari rejects file shares when title/text are set — pass files only.
 */
async function shareStoryImage(file: File): Promise<void> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    throw new Error('share_unavailable');
  }
  const shareData = { files: [file] };
  if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
    throw new Error('share_unavailable');
  }
  await navigator.share(shareData);
}

/**
 * Save the card image to the device.
 * On mobile, the share sheet usually includes “Save image” / Photos;
 * desktop (and share failures) fall back to a file download.
 */
async function saveCardImage(file: File): Promise<'shared' | 'downloaded'> {
  const fileOnly = { files: [file] };
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare(fileOnly);
  const preferShareSheet =
    canShareFiles &&
    (/Android|iP(hone|ad|od)/i.test(navigator.userAgent) || isIosLike());

  if (preferShareSheet) {
    try {
      await navigator.share(fileOnly);
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
    }
  }

  downloadFile(file);
  return 'downloaded';
}

function needsCaptureWarmup(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
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

/** Full-page share experience — branded preview + share / copy / save card. */
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
  const feedCaptureRef = React.useRef<HTMLDivElement>(null);
  const storyCaptureRef = React.useRef<HTMLDivElement>(null);
  const embeddedImageRef = React.useRef<string | null>(null);
  const [busy, setBusy] = React.useState<'share' | 'copy' | 'save' | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [previewScale, setPreviewScale] = React.useState(0.28);
  const [mounted, setMounted] = React.useState(false);
  const [resolvedPhone, setResolvedPhone] = React.useState<string | null>(null);
  const phoneReadyRef = React.useRef<Promise<string | null>>(Promise.resolve(null));

  useLockBodyScroll(open && mounted && Boolean(payload));

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setBusy(null);
      setFeedback(null);
      setError(null);
      embeddedImageRef.current = null;
      return;
    }

    const remote = payload?.imageUrl?.trim();
    if (!remote || remote.startsWith('data:')) {
      embeddedImageRef.current = remote?.startsWith('data:') ? remote : null;
      return;
    }

    let cancelled = false;
    embeddedImageRef.current = null;
    void (async () => {
      const embedded = await embedImageAsDataUrl(resolveStoryImageSrc(remote) || remote);
      if (!cancelled && embedded) embeddedImageRef.current = embedded;
    })();

    return () => {
      cancelled = true;
    };
  }, [open, payload?.listingId, payload?.imageUrl]);

  React.useEffect(() => {
    if (!open || !payload) {
      setResolvedPhone(null);
      phoneReadyRef.current = Promise.resolve(null);
      return;
    }

    const existing = payload.contactPhone?.trim() || '';
    if (existing) {
      setResolvedPhone(existing);
      phoneReadyRef.current = Promise.resolve(existing);
      return;
    }

    setResolvedPhone(null);
    const pending = fetchListingShareContactPhone(payload.listingKind, payload.listingId);
    phoneReadyRef.current = pending;
    let cancelled = false;
    void pending.then((phone) => {
      if (!cancelled) setResolvedPhone(phone);
    });
    return () => {
      cancelled = true;
    };
  }, [open, payload?.contactPhone, payload?.listingId, payload?.listingKind]);

  const cardPayload = React.useMemo<ListingSharePayload | null>(() => {
    if (!payload) return null;
    const phone = resolvedPhone || payload.contactPhone?.trim() || '';
    return phone ? { ...payload, contactPhone: phone } : payload;
  }, [payload, resolvedPhone]);

  const waitForSharePhone = React.useCallback(async () => {
    const phone = (await phoneReadyRef.current)?.trim() || payload?.contactPhone?.trim() || '';
    if (phone && phone !== resolvedPhone) {
      setResolvedPhone(phone);
      await new Promise((r) => window.setTimeout(r, 60));
    }
    return phone;
  }, [payload?.contactPhone, resolvedPhone]);

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
    if (metrics) {
      onShared?.(metrics);
      emitHotLeadShare(payload.listingKind, payload.listingId);
    }
    return metrics;
  }, [onShared, payload]);

  const handleShare = React.useCallback(async () => {
    if (!payload || busy || !storyCaptureRef.current) return;
    setBusy('share');
    setError(null);
    setFeedback(null);
    try {
      await waitForSharePhone();
      const file = await captureElementAsJpegFile(
        {
          root: storyCaptureRef.current,
          imageUrl: embeddedImageRef.current ?? payload.imageUrl,
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          backgroundColor: '#0a0a0a',
          pixelRatio: 1,
        },
        `kutagjej-story-${payload.listingId.slice(0, 8)}.jpg`,
      );

      if (isMobileShareDevice()) {
        await shareStoryImage(file);
        await bumpShareMetric();
        setFeedback('Zgjidh Instagram, pastaj shtyp Posto.');
      } else {
        downloadFile(file);
        await bumpShareMetric();
        setFeedback('Story u shkarkua. Hape Instagram në telefon për ta postuar.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled the share sheet.
      } else if (err instanceof Error && err.message === 'share_unavailable') {
        setError('Nuk mbështetet ndarja e fotos. Provo "Ruaj foton" dhe posto manualisht.');
      } else {
        setError('Nuk u përgatit story-ja. Provo përsëri.');
      }
    } finally {
      setBusy(null);
    }
  }, [busy, bumpShareMetric, payload, waitForSharePhone]);

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

  const handleSaveCard = React.useCallback(async () => {
    if (!payload || busy || !feedCaptureRef.current) return;
    setBusy('save');
    setError(null);
    setFeedback(null);
    try {
      await waitForSharePhone();
      const file = await captureElementAsJpegFile(
        {
          root: feedCaptureRef.current,
          imageUrl: embeddedImageRef.current ?? payload.imageUrl,
          width: FEED_WIDTH,
          height: FEED_HEIGHT,
          backgroundColor: '#141414',
          pixelRatio: 1,
        },
        `kutagjej-card-${payload.listingId.slice(0, 8)}.jpg`,
      );
      const result = await saveCardImage(file);

      setFeedback(
        result === 'shared' ? 'Fotoja e kartës u ruajt.' : 'Fotoja e kartës u shkarkua.',
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError('Nuk u ruajt fotoja. Provo përsëri.');
      }
    } finally {
      setBusy(null);
    }
  }, [busy, payload, waitForSharePhone]);

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
            <ListingStoryTemplate payload={cardPayload ?? payload} />
          </Box>
        </Box>
      </Box>

      {/* Offscreen full-size card for gallery export (avoids scaled preview artifacts) */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          left: -10_000,
          top: 0,
          pointerEvents: 'none',
          opacity: 0,
          overflow: 'visible',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <ListingFeedTemplate ref={feedCaptureRef} payload={cardPayload ?? payload} />
        <ListingStoryTemplate ref={storyCaptureRef} payload={cardPayload ?? payload} />
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
                <InstagramLogoIcon size={22} weight="fill" />
              )
            }
            sx={{
              ...btnSx,
              flex: 'none',
              width: '100%',
              bgcolor: BRAND_GREEN,
              color: '#0a0a0a',
              '&:hover': { bgcolor: '#86c92a', color: '#0a0a0a', boxShadow: 'none' },
              '&.Mui-disabled': {
                bgcolor: 'rgba(118,186,27,0.35)',
                color: 'rgba(10,10,10,0.5)',
              },
            }}
          >
            Share Story
          </Button>

          <Stack direction="row" spacing={1.25} sx={{ width: '100%' }}>
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

            <Button
              type="button"
              variant="outlined"
              size="large"
              disabled={Boolean(busy)}
              onClick={() => void handleSaveCard()}
              startIcon={
                busy === 'save' ? (
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                ) : (
                  <DownloadSimpleIcon size={18} weight="bold" />
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
              Ruaj foton
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

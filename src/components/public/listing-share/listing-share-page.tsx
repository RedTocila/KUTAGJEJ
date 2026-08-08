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
import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import { InstagramLogo as InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { toJpeg } from 'html-to-image';

import {
  ListingStoryTemplate,
  STORY_HEIGHT,
  STORY_WIDTH,
  StoryBackground,
} from '@/components/public/listing-share/listing-story-template';
import { claimDailyShareReward } from '@/lib/daily-share-client';
import {
  DAILY_SHARE_BOOST_CREDITS,
  embedImageAsDataUrl,
  resolveListingShareUrl,
  resolveStoryImageSrc,
  type ListingSharePayload,
} from '@/lib/listing-share';
import { recordListingMetricEvent, type ListingMetrics } from '@/lib/listing-metrics';
import { useUser } from '@/hooks/use-user';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { paths } from '@/paths';

const BRAND_GREEN = '#76ba1b';
const SHEET_BG = 'rgba(12, 12, 12, 0.94)';

async function shareOrCopyLink(title: string, url: string): Promise<'shared' | 'copied'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text: title, url });
      return 'shared';
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}

function isMobileUa(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
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

/** Opens Instagram’s story camera when the app is installed (image must already be shared/saved). */
function openInstagramStoryCamera(): boolean {
  if (typeof window === 'undefined' || !isMobileUa()) return false;
  const ua = navigator.userAgent;
  try {
    if (/Android/i.test(ua)) {
      window.location.href =
        'intent://story-camera#Intent;scheme=instagram;package=com.instagram.android;end';
      return true;
    }
    window.location.href = 'instagram://story-camera';
    return true;
  } catch {
    return false;
  }
}

/**
 * Share the story image so Instagram can open Stories with it.
 * Critical: share **files only** (no text/url) — mixing text makes Instagram skip Stories.
 */
async function shareStoryImage(file: File): Promise<'shared' | 'downloaded' | 'opened'> {
  const fileOnly = { files: [file] };
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare(fileOnly);

  if (canShareFiles) {
    try {
      // Files-only → OS share sheet lists Instagram Stories with the image attached.
      await navigator.share(fileOnly);
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
    }
  }

  downloadFile(file);
  if (openInstagramStoryCamera()) return 'opened';
  return 'downloaded';
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

function needsStoryCaptureWarmup(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // All iOS browsers use WebKit and often drop remote images on the first html-to-image pass.
  if (/iP(hone|ad|od)/.test(ua)) return true;
  // iPadOS desktop UA
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

const btnSx = {
  height: 54,
  borderRadius: 2,
  fontWeight: 800,
  textTransform: 'none' as const,
  fontSize: '0.98rem',
  boxShadow: 'none',
  px: 2.5,
  letterSpacing: '-0.01em',
};

/** Full-page share experience — branded story template + Instagram Stories flow. */
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
  const { user } = useUser();
  const storyRef = React.useRef<HTMLDivElement>(null);
  const previewWrapRef = React.useRef<HTMLDivElement>(null);
  const [busy, setBusy] = React.useState<'link' | 'story' | 'claim' | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [rewardNote, setRewardNote] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  /** Share/download finished — user must confirm they posted before claiming. */
  const [awaitingPostConfirm, setAwaitingPostConfirm] = React.useState(false);
  const [previewScale, setPreviewScale] = React.useState(0.28);
  const [mounted, setMounted] = React.useState(false);
  /** Pre-inlined cover photo for story JPEG (Safari drops remote `<img>` pixels). */
  const embeddedImageRef = React.useRef<string | null>(null);

  useLockBodyScroll(open && mounted && Boolean(payload));

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setBusy(null);
      setFeedback(null);
      setRewardNote(null);
      setError(null);
      setAwaitingPostConfirm(false);
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

  const handleShareLink = React.useCallback(async () => {
    if (!payload || busy) return;
    setBusy('link');
    setError(null);
    setFeedback(null);
    try {
      const url = resolveListingShareUrl(payload);
      const result = await shareOrCopyLink(payload.title, url);
      // Count only after a completed share/copy — cancelled sheets throw AbortError.
      await bumpShareMetric();
      setFeedback(result === 'copied' ? 'Linku u kopjua.' : 'Linku u nda.');
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError('Nuk u nda linku. Provo përsëri.');
      }
    } finally {
      setBusy(null);
    }
  }, [busy, bumpShareMetric, payload]);

  const applyClaimResult = React.useCallback((claim: Awaited<ReturnType<typeof claimDailyShareReward>>) => {
    setAwaitingPostConfirm(false);
    if (claim.error) {
      setRewardNote('Nuk u regjistrua shpërblimi. Provo përsëri.');
      return;
    }
    if (claim.awarded) {
      setRewardNote(
        claim.message ??
          `Ke fituar +${claim.creditsAwarded || DAILY_SHARE_BOOST_CREDITS} Boost Coins për ndarjen e sotme.`,
      );
      return;
    }
    if (claim.alreadyClaimed) {
      setRewardNote('Shpërblimi ditor i ndarjes në Instagram është marrë tashmë sot.');
    }
  }, []);

  const handleConfirmPosted = React.useCallback(async () => {
    if (!user || busy || !awaitingPostConfirm) return;
    setBusy('claim');
    setError(null);
    try {
      const claim = await claimDailyShareReward();
      applyClaimResult(claim);
    } catch {
      setRewardNote('Nuk u regjistrua shpërblimi. Provo përsëri.');
    } finally {
      setBusy(null);
    }
  }, [applyClaimResult, awaitingPostConfirm, busy, user]);

  const handleShareStory = React.useCallback(async () => {
    if (!payload || busy || !storyRef.current) return;
    setBusy('story');
    setError(null);
    setFeedback(null);
    setRewardNote(null);
    setAwaitingPostConfirm(false);
    try {
      // Inline remote listing photo before capture — otherwise Instagram gets a black media area
      // (Safari / html-to-image drops cross-origin pixels).
      await ensureListingImageEmbedded(
        storyRef.current,
        embeddedImageRef.current ?? payload.imageUrl,
      );
      await waitForImages(storyRef.current);
      // Brief paint settle so fonts/images are ready for capture.
      await new Promise((r) => window.setTimeout(r, 120));

      const jpegOpts = {
        cacheBust: false,
        skipFonts: true,
        pixelRatio: 1,
        quality: 0.92,
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        backgroundColor: '#0a0a0a',
        imagePlaceholder:
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
        onImageErrorHandler: () => undefined,
        fetchRequestInit: { mode: 'cors' as RequestMode, credentials: 'omit' as RequestCredentials },
        style: { transform: 'none', transformOrigin: 'top left' },
      };

      const capture = () => toJpeg(storyRef.current!, jpegOpts);

      // Safari/iOS often needs a warm-up pass before images stick in the export.
      if (needsStoryCaptureWarmup()) {
        await capture().catch(() => null);
        await new Promise((r) => window.setTimeout(r, 80));
      }

      const dataUrl = await capture();
      if (!dataUrl.startsWith('data:image/')) {
        throw new Error('story capture empty');
      }
      const file = dataUrlToFile(dataUrl, `kutagjej-story-${payload.listingId.slice(0, 8)}.jpg`);
      const result = await shareStoryImage(file);

      // Count only after the OS share / save / download succeeded — not on cancel.
      await bumpShareMetric();

      if (result === 'shared') {
        setFeedback('Zgjidh Instagram → Story për ta postuar me këtë imazh.');
      } else if (result === 'opened') {
        setFeedback('Story u ruajt — hap Instagram Stories dhe zgjidhe nga galeria.');
      } else {
        setFeedback('Story u shkarkua — ngarkoje në Instagram Stories.');
      }

      if (user) {
        setAwaitingPostConfirm(true);
        setRewardNote(
          `Mbasi ta postosh në Instagram Stories, konfirmo për +${DAILY_SHARE_BOOST_CREDITS} Boost Coins.`,
        );
      } else {
        setRewardNote(
          `Hyr në llogari për të marrë +${DAILY_SHARE_BOOST_CREDITS} Boost Coins nga shpërblimi ditor.`,
        );
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError('Nuk u krijua story. Provo përsëri.');
      }
    } finally {
      setBusy(null);
    }
  }, [busy, bumpShareMetric, payload, user]);

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

      {/* Full-size export canvas (unscaled). Off-screen but still painted so Safari can snapshot it. */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          left: -10_000,
          top: 0,
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          pointerEvents: 'none',
          zIndex: -1,
          overflow: 'hidden',
        }}
      >
        <ListingStoryTemplate ref={storyRef} payload={payload} />
      </Box>

      {/* Bottom actions — always dark glass, matches story brand */}
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
        <Stack spacing={1.35} sx={{ maxWidth: 440, mx: 'auto', width: '100%' }}>
          <Stack
            direction="row"
            spacing={1.25}
            sx={{
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              rowGap: 0.75,
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.65,
                px: 1.15,
                py: 0.55,
                borderRadius: 999,
                bgcolor: 'rgba(118,186,27,0.18)',
                border: '1px solid rgba(118,186,27,0.45)',
                color: BRAND_GREEN,
              }}
            >
              <BoostCoinIcon size={15} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.78rem', letterSpacing: '-0.01em', color: 'inherit' }}>
                +{DAILY_SHARE_BOOST_CREDITS} Boost Coins
              </Typography>
            </Box>
            <Typography
              sx={{
                textAlign: 'center',
                fontSize: '0.78rem',
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.55)',
                fontWeight: 500,
              }}
            >
              pasi ta postosh Story dhe të konfirmosh
              {!user ? (
                <>
                  {' · '}
                  <Box
                    component="a"
                    href={paths.user.auth}
                    sx={{ color: BRAND_GREEN, fontWeight: 700, textDecoration: 'none' }}
                  >
                    hyr
                  </Box>
                </>
              ) : null}
            </Typography>
          </Stack>

          <Button
            type="button"
            variant="contained"
            disableElevation
            size="large"
            fullWidth
            disabled={Boolean(busy)}
            onClick={() => void handleShareStory()}
            startIcon={
              busy === 'story' ? (
                <CircularProgress size={18} sx={{ color: '#0a0a0a' }} />
              ) : (
                <InstagramLogoIcon size={22} weight="fill" />
              )
            }
            sx={{
              ...btnSx,
              bgcolor: BRAND_GREEN,
              color: '#0a0a0a',
              '&:hover': { bgcolor: '#86c92a', color: '#0a0a0a', boxShadow: 'none' },
              '&.Mui-disabled': { bgcolor: 'rgba(118,186,27,0.35)', color: 'rgba(10,10,10,0.5)' },
            }}
          >
            Ndaj si Instagram Story
          </Button>

          <Button
            type="button"
            variant="outlined"
            size="large"
            fullWidth
            disabled={Boolean(busy)}
            onClick={() => void handleShareLink()}
            startIcon={
              busy === 'link' ? (
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
            Ndaj linkun
          </Button>

          {feedback ? (
            <Typography
              variant="body2"
              sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontWeight: 550, fontSize: '0.8rem' }}
            >
              {feedback}
            </Typography>
          ) : null}

          {awaitingPostConfirm && user ? (
            <Button
              type="button"
              variant="contained"
              disableElevation
              size="large"
              fullWidth
              disabled={Boolean(busy)}
              onClick={() => void handleConfirmPosted()}
              startIcon={
                busy === 'claim' ? <CircularProgress size={18} color="inherit" /> : undefined
              }
              sx={{
                ...btnSx,
                bgcolor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(118,186,27,0.55)',
                '&:hover': { bgcolor: 'rgba(118,186,27,0.2)', boxShadow: 'none' },
              }}
            >
              E postova në Instagram — merr +{DAILY_SHARE_BOOST_CREDITS} BC
            </Button>
          ) : null}

          {rewardNote ? (
            <Alert
              severity={awaitingPostConfirm ? 'info' : 'success'}
              sx={{
                borderRadius: 2,
                py: 0.15,
                bgcolor: awaitingPostConfirm ? 'rgba(56,189,248,0.12)' : 'rgba(118,186,27,0.12)',
                color: '#fff',
                border: '1px solid',
                borderColor: awaitingPostConfirm ? 'rgba(56,189,248,0.35)' : 'rgba(118,186,27,0.35)',
                '& .MuiAlert-icon': { color: awaitingPostConfirm ? '#38bdf8' : BRAND_GREEN },
              }}
            >
              {rewardNote}
            </Alert>
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

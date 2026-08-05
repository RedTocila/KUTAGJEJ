'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { ProductBackButton } from '@/components/public/product-browse-chrome';
import { InstagramLogo as InstagramLogoIcon } from '@phosphor-icons/react/dist/ssr/InstagramLogo';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { toPng } from 'html-to-image';

import {
  ListingStoryTemplate,
  STORY_HEIGHT,
  STORY_WIDTH,
} from '@/components/public/listing-share/listing-story-template';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { claimDailyShareReward } from '@/lib/daily-share-client';
import {
  DAILY_SHARE_BOOST_CREDITS,
  resolveListingShareUrl,
  type ListingSharePayload,
} from '@/lib/listing-share';
import { recordListingMetricEvent, type ListingMetrics } from '@/lib/listing-metrics';
import { useUser } from '@/hooks/use-user';
import { paths } from '@/paths';

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

async function shareStoryImage(file: File, title: string, url: string): Promise<'shared' | 'downloaded'> {
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        title,
        text: `${title}\n${url}`,
      });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
  return 'downloaded';
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(header ?? '')?.[1] ?? 'image/png';
  const binary = atob(data ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

const btnSx = {
  height: 52,
  borderRadius: 999,
  fontWeight: 800,
  textTransform: 'none' as const,
  fontSize: '0.95rem',
  boxShadow: 'none',
  px: 3,
};

/** Full-page share experience — branded story template + standard app buttons. */
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
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const el = previewWrapRef.current;
    if (!el) return;

    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 8 || h < 8) return;
      const scale = Math.min(w / STORY_WIDTH, h / STORY_HEIGHT);
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
      await bumpShareMetric();
      const url = resolveListingShareUrl(payload);
      const result = await shareOrCopyLink(payload.title, url);
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
      await bumpShareMetric();
      const dataUrl = await toPng(storyRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        style: { transform: 'none', transformOrigin: 'top left' },
      });
      const file = dataUrlToFile(dataUrl, `kutagjej-story-${payload.listingId.slice(0, 8)}.png`);
      const url = resolveListingShareUrl(payload);
      const result = await shareStoryImage(file, payload.title, url);
      setFeedback(
        result === 'downloaded'
          ? 'Story u shkarkua — ngarkoje në Instagram Stories.'
          : 'Nëse e hapët Instagram, përfundo postimin e Story.',
      );

      // Never auto-claim: Web Share / download only prepare the image — posting is separate.
      if (user) {
        setAwaitingPostConfirm(true);
        setRewardNote(
          `Mbasi ta postosh në Instagram Stories, konfirmo më poshtë për +${DAILY_SHARE_BOOST_CREDITS} Boost Coins.`,
        );
      } else {
        setRewardNote(
          `Hyr në llogari për të marrë +${DAILY_SHARE_BOOST_CREDITS} Boost Coins nga shpërblimi ditor i ndarjes.`,
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
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      {/* Top bar */}
      <Stack
        direction="row"
        sx={{
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
        />
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
          Ndaj njoftimin
        </Typography>
        <Box sx={{ width: 40 }} />
      </Stack>

      {/* Story preview — fills remaining space */}
      <Box
        ref={previewWrapRef}
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1.5,
          py: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: STORY_WIDTH * previewScale,
            height: STORY_HEIGHT * previewScale,
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
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

      {/* Offscreen export canvas */}
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          left: -10_000,
          top: 0,
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          pointerEvents: 'none',
          opacity: 0,
          overflow: 'hidden',
        }}
      >
        <ListingStoryTemplate ref={storyRef} payload={payload} />
      </Box>

      {/* Bottom actions */}
      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 1.75, sm: 3 },
          pt: 1.25,
          pb: { xs: 'max(16px, env(safe-area-inset-bottom))', sm: 2.5 },
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(10,10,10,0.92)' : 'rgba(255,255,255,0.94)',
          borderTop: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Stack spacing={1.25} sx={{ maxWidth: 440, mx: 'auto', width: '100%' }}>
          <Typography
            sx={{
              textAlign: 'center',
              fontSize: '0.8rem',
              lineHeight: 1.45,
              color: 'text.secondary',
              px: 0.5,
            }}
          >
            Instagram Story përfundon shpërblimin ditor:{' '}
            <Box component="span" sx={{ fontWeight: 800, color: 'primary.main' }}>
              +{DAILY_SHARE_BOOST_CREDITS} Boost Coins
            </Box>
            {' '}
            (vetëm pasi ta postosh dhe të konfirmosh)
            {!user ? (
              <>
                {' '}
                —{' '}
                <Box
                  component="a"
                  href={paths.user.auth}
                  sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none' }}
                >
                  hyr për t&apos;i marrë
                </Box>
              </>
            ) : null}
          </Typography>

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
                <CircularProgress size={18} color="inherit" />
              ) : (
                <InstagramLogoIcon size={20} weight="fill" />
              )
            }
            sx={{
              ...btnSx,
              color: 'primary.contrastText',
              '&:hover': { color: 'primary.contrastText', boxShadow: 'none' },
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
                <CircularProgress size={18} color="inherit" />
              ) : (
                <LinkSimpleIcon size={18} weight="bold" />
              )
            }
            sx={{
              ...btnSx,
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: primaryMainAlpha(0.1),
              },
            }}
          >
            Ndaj linkun
          </Button>

          {feedback ? (
            <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', fontWeight: 550 }}>
              {feedback}
            </Typography>
          ) : null}
          {awaitingPostConfirm && user ? (
            <Button
              type="button"
              variant="contained"
              color="success"
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
                bgcolor: 'success.main',
                color: 'common.white',
                '&:hover': { bgcolor: 'success.dark', boxShadow: 'none' },
              }}
            >
              E postova në Instagram — merr +{DAILY_SHARE_BOOST_CREDITS} BC
            </Button>
          ) : null}
          {rewardNote ? (
            <Alert
              severity={awaitingPostConfirm ? 'info' : 'success'}
              sx={{ borderRadius: 2, py: 0.2 }}
            >
              {rewardNote}
            </Alert>
          ) : null}
          {error ? (
            <Alert severity="error" sx={{ borderRadius: 2, py: 0.2 }}>
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

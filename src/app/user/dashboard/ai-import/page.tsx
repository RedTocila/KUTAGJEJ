'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { Paperclip as PaperclipIcon } from '@phosphor-icons/react/dist/ssr/Paperclip';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Stop as StopIcon } from '@phosphor-icons/react/dist/ssr/Stop';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { ImageLightbox } from '@/components/common/image-lightbox';
import { HomeVerticalIcon } from '@/components/public/home-vertical-icon';
import { AiCategoryMismatchPanel } from '@/components/user/ai-category-mismatch-panel';
import { PostListingFormSurface, PostListingHeader } from '@/components/user/post-listing-header';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useUser } from '@/hooks/use-user';
import {
  acceptAiCategoryCorrection,
  aiDailyLimitMessage,
  filesToAiImagePayload,
  importListingsFromLinks,
  extractImportUrls,
  isAiCategoryMismatch,
  isAiContentRestricted,
  isAiDailyLimitError,
  isAiRateLimitError,
  mergeAttachedImageUrls,
  toAiListingDraft,
  type AiImportDraftResult,
} from '@/lib/ai-import-client';
import { knownCreateDefaultsFromStorage } from '@/lib/listing-form-defaults';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_ON,
  AI_SEARCH_BLUE_SOFT,
  localizeHomeVerticals,
  type HomeVerticalId,
} from '@/lib/home-categories';
import { MOTION } from '@/styles/motion';
import { productButtonSx, productPanelSx } from '@/styles/product-sx';
import {
  categoryLabel,
  clearAiListingDraftQueue,
  loadAiListingDraftQueue,
  removeAiListingDraftFromQueue,
  saveAiListingDraft,
  saveAiListingDraftQueue,
  type AiListingDraft,
} from '@/lib/ai-listing-draft';
import { postAiListingDraft, postAiListingDrafts, hostAiDraftImages } from '@/lib/ai-draft-post';
import { hardNavigate } from '@/lib/hard-navigate';
import { isOurStorageUrl, uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';
import type { ListingCategoryKey } from '@/types/listing-category';

const MAX_AI_IMAGES = 6;

const aiButtonSx = {
  ...productButtonSx,
  minHeight: 36,
  px: 1.5,
  fontSize: '0.82rem',
  bgcolor: AI_SEARCH_BLUE,
  color: AI_SEARCH_BLUE_ON,
  '&:hover': { boxShadow: 'none', bgcolor: AI_SEARCH_BLUE_HOVER, color: AI_SEARCH_BLUE_ON },
  '&.Mui-disabled': {
    bgcolor: AI_SEARCH_BLUE,
    color: AI_SEARCH_BLUE_ON,
    opacity: 0.55,
  },
} as const;

const aiOutlinedButtonSx = {
  ...productButtonSx,
  minHeight: 36,
  px: 1.5,
  fontSize: '0.82rem',
  borderColor: AI_SEARCH_BLUE,
  color: AI_SEARCH_BLUE,
  '&:hover': { borderColor: AI_SEARCH_BLUE, bgcolor: AI_SEARCH_BLUE_SOFT },
} as const;

const analyzingTextFlashSx = {
  animation: 'aiImportTextFlash 1.4s ease-in-out infinite',
  '@keyframes aiImportTextFlash': {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.38 },
  },
};

function formatCategoryMismatch(
  t: ReturnType<typeof useCopy>,
  draft: Pick<AiImportDraftResult, 'detectedCategory' | 'error'>,
): string {
  if (draft.detectedCategory) {
    return t.aiImport.categoryMismatch(categoryLabel(draft.detectedCategory));
  }
  return draft.error || t.aiImport.categoryMismatchGeneric;
}

const UPLOAD_FOLDER: Record<ListingCategoryKey, string> = {
  'real-estate': 'real-estate',
  cars: 'cars',
  'job-listings': 'jobs',
  marketplace: 'marketplace',
  businesses: 'businesses',
  professionals: 'professionals',
};

function toListingCategory(id: HomeVerticalId): ListingCategoryKey {
  return id === 'jobs' ? 'job-listings' : id;
}

function isDisplayableImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  const lower = url.toLowerCase();
  // Drop analytics beacons that scrape sometimes picks up as <img> sources.
  if (/facebook\.com\/(?:tr|tr\/)\b|[?&]ev=pageview\b/i.test(lower)) return false;
  if (
    /google-analytics\.com|googletagmanager\.com|doubleclick\.net|bat\.bing\.com|adservice\.google/i.test(
      lower,
    )
  ) {
    return false;
  }
  return true;
}

function draftImageUrls(draft: AiImportDraftResult | AiListingDraft): string[] {
  return (draft.imageUrls ?? []).filter(isDisplayableImageUrl);
}

const DRAFT_THUMB_GAP_PX = 8;
const SLIDE_LOCK_PX = 10;
const SLIDE_SNAP_MS = 180;

function clampOffset(value: number, max: number) {
  return Math.min(max, Math.max(0, value));
}

/** Horizontal snap slider — no native overflow scroll, so the page does not pan with it. */
function ImageStripSlider({ children }: { children: React.ReactNode }) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const offsetRef = React.useRef(0);
  const maxOffsetRef = React.useRef(0);
  const ignoreClickRef = React.useRef(false);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: number;
    axis: 'x' | 'y' | null;
    moved: boolean;
  } | null>(null);
  const [maxOffset, setMaxOffset] = React.useState(0);
  const [canSlidePrev, setCanSlidePrev] = React.useState(false);
  const [canSlideNext, setCanSlideNext] = React.useState(false);

  const applyOffset = React.useCallback((next: number, animate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = clampOffset(next, maxOffsetRef.current);
    offsetRef.current = clamped;
    track.style.transition = animate ? `transform ${SLIDE_SNAP_MS}ms ${MOTION.ease}` : 'none';
    track.style.transform = `translate3d(${-clamped}px, 0, 0)`;
    setCanSlidePrev(clamped > 1);
    setCanSlideNext(clamped < maxOffsetRef.current - 1);
  }, []);

  const measure = React.useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const nextMax = Math.max(0, track.scrollWidth - viewport.clientWidth);
    maxOffsetRef.current = nextMax;
    setMaxOffset(nextMax);
    applyOffset(offsetRef.current, false);
  }, [applyOffset]);

  React.useLayoutEffect(() => {
    measure();
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    if (track) ro.observe(track);
    return () => ro.disconnect();
  }, [children, measure]);

  const snapPitch = () => {
    const first = trackRef.current?.firstElementChild as HTMLElement | undefined;
    return Math.max(1, (first?.offsetWidth ?? 56) + DRAFT_THUMB_GAP_PX);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (drag.moved) ignoreClickRef.current = true;
    if (!commit || drag.axis !== 'x') {
      applyOffset(offsetRef.current, true);
      return;
    }
    const pitch = snapPitch();
    applyOffset(Math.round(offsetRef.current / pitch) * pitch, true);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (maxOffset <= 0) return;
    if (event.target instanceof Element && event.target.closest('[data-strip-no-drag]')) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: offsetRef.current,
      axis: null,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.axis) {
      if (Math.hypot(dx, dy) < SLIDE_LOCK_PX) return;
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (drag.axis === 'x') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    if (drag.axis !== 'x') return;
    event.preventDefault();
    drag.moved = true;
    applyOffset(drag.startOffset - dx, false);
  };

  return (
    <Box
      ref={viewportRef}
      data-no-tab-swipe
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishDrag(event, true)}
      onPointerCancel={(event) => finishDrag(event, false)}
      onClickCapture={(event) => {
        if (!ignoreClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        ignoreClickRef.current = false;
      }}
      sx={{
        overflow: 'hidden',
        width: '100%',
        touchAction: maxOffset > 0 ? 'none' : 'auto',
        overscrollBehavior: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        cursor: maxOffset > 0 ? 'grab' : undefined,
        maskImage:
          canSlidePrev && canSlideNext
            ? 'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)'
            : canSlidePrev
              ? 'linear-gradient(to right, transparent 0, black 16px, black 100%)'
              : canSlideNext
                ? 'linear-gradient(to right, black 0, black calc(100% - 16px), transparent 100%)'
                : undefined,
        WebkitMaskImage:
          canSlidePrev && canSlideNext
            ? 'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)'
            : canSlidePrev
              ? 'linear-gradient(to right, transparent 0, black 16px, black 100%)'
              : canSlideNext
                ? 'linear-gradient(to right, black 0, black calc(100% - 16px), transparent 100%)'
                : undefined,
      }}
    >
      <Box
        ref={trackRef}
        sx={{
          display: 'flex',
          gap: `${DRAFT_THUMB_GAP_PX}px`,
          width: 'max-content',
          willChange: 'transform',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function DraftImageThumb({
  src,
  size,
  previewLabel,
  removeLabel,
  onPreview,
  onRemove,
  disabled,
}: {
  src: string;
  size: number;
  previewLabel: string;
  removeLabel: string;
  onPreview: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Box
        component="button"
        type="button"
        aria-label={previewLabel}
        onClick={onPreview}
        sx={{
          width: '100%',
          height: '100%',
          borderRadius: 1.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          padding: 0,
          cursor: 'pointer',
          bgcolor: 'action.hover',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </Box>
      <IconButton
        size="small"
        data-strip-no-drag
        aria-label={removeLabel}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          zIndex: 1,
          width: 28,
          height: 28,
          minWidth: 28,
          minHeight: 28,
          p: 0,
          touchAction: 'manipulation',
          bgcolor: 'rgba(0,0,0,0.62)',
          color: '#fff',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.82)' },
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: -8,
          },
        }}
      >
        <XIcon size={14} weight="bold" />
      </IconButton>
    </Box>
  );
}

function isRetryableFailedDraft(draft: AiImportDraftResult): boolean {
  if (isAiCategoryMismatch(draft) || isAiContentRestricted(draft)) return false;
  if (!draft.sourceUrl) return false;
  return Boolean(draft.error) || !draft.category;
}

function formatAiDraftError(
  t: ReturnType<typeof useCopy>,
  draft: Pick<AiImportDraftResult, 'error' | 'errorCode'>,
): string {
  if (isAiRateLimitError(draft)) return t.aiImport.rateLimited;
  return draft.error || t.aiImport.failed;
}

function AiImportAnalyzingText({
  progress,
  t,
}: {
  progress: { done: number; total: number } | null;
  t: ReturnType<typeof useCopy>;
}) {
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const current = total <= 0 ? 1 : Math.min(total, done + 1);
  const determinate = total > 1;
  const percent = total <= 0 ? 0 : Math.min(100, ((done + (done < total ? 0.25 : 0)) / total) * 100);

  return (
    <Stack spacing={0.75} sx={{ pt: 1.25 }} aria-live="polite">
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.8rem',
          letterSpacing: '-0.01em',
          color: 'text.primary',
          ...analyzingTextFlashSx,
        }}
      >
        {total > 0 ? t.aiImport.progressWorking(current, total) : t.aiImport.analyzing}
      </Typography>
      <LinearProgress
        variant={determinate ? 'determinate' : 'indeterminate'}
        value={percent}
        sx={{
          height: 6,
          borderRadius: 999,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 999,
            bgcolor: AI_SEARCH_BLUE,
          },
        }}
      />
    </Stack>
  );
}

export default function AiImportListingsPage() {
  const router = useRouter();
  const { user, checkSession } = useUser();
  const { language } = useLanguage();
  const t = useCopy();
  const categories = React.useMemo(() => localizeHomeVerticals(language), [language]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [category, setCategory] = React.useState<ListingCategoryKey | null>(null);
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<AiImportDraftResult[]>([]);
  const [preview, setPreview] = React.useState<{ urls: string[]; index: number } | null>(null);
  const [postingId, setPostingId] = React.useState<string | null>(null);
  const [openingId, setOpeningId] = React.useState<string | null>(null);
  const [postingAll, setPostingAll] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [pendingImageUrls, setPendingImageUrls] = React.useState<string[]>([]);
  const [lastPrompt, setLastPrompt] = React.useState('');
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const stopRequestedRef = React.useRef(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const loadingRef = React.useRef(false);

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  React.useEffect(() => {
    if (!user) return;
    if (!canPublish) router.replace(paths.user.dashboard);
  }, [user, canPublish, router]);

  React.useEffect(() => {
    const queued = loadAiListingDraftQueue();
    if (!queued.length) return;
    setDrafts(
      queued.map((draft) => ({
        ...draft,
        category: draft.category,
      })),
    );
    setCategory(queued[0]?.category ?? null);
  }, []);

  React.useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const persistDrafts = (next: AiImportDraftResult[]) => {
    setDrafts(next);
    const ready = next
      .map((draft) => toAiListingDraft(draft))
      .filter((draft): draft is AiListingDraft => Boolean(draft));
    saveAiListingDraftQueue(ready);
  };

  const readyDrafts = React.useMemo(
    () =>
      drafts
        .map((draft) => toAiListingDraft(draft))
        .filter((draft): draft is AiListingDraft => Boolean(draft)),
    [drafts],
  );

  const retryableFailedDrafts = React.useMemo(
    () => drafts.filter(isRetryableFailedDraft),
    [drafts],
  );

  const handleFilesPicked = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue;
      if (next.length >= MAX_AI_IMAGES) break;
      next.push(file);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const importProfile = React.useCallback(() => {
    if (!user) return null;
    const loc = knownCreateDefaultsFromStorage(user.id);
    return {
      accountType: user.accountType ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      phone: user.phone ?? null,
      email: user.email ?? null,
      businessName: user.businessName ?? null,
      businessOwner: user.businessOwner ?? null,
      businessCategory: user.businessCategory ?? null,
      nipt: user.nipt ?? null,
      preferredCityId: loc.cityId || null,
      preferredCityName: loc.cityName || null,
    };
  }, [user]);

  const decorateImportedDraft = React.useCallback(
    (draft: AiImportDraftResult, prompt: string, uploadedUrls: string[]): AiImportDraftResult => ({
      ...draft,
      sourcePrompt: draft.sourcePrompt || prompt,
      imageUrls: uploadedUrls.length
        ? mergeAttachedImageUrls({
            remoteUrls: draft.imageUrls ?? [],
            uploadedUrls,
            roles: draft.imageRoles,
            max:
              draft.category === 'professionals' || draft.detectedCategory === 'professionals'
                ? 2
                : 8,
          })
        : draft.imageUrls,
    }),
    [],
  );

  const handleAnalyze = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (loadingRef.current) return;
    if (!category) {
      setError(t.aiImport.categoryRequired);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed && files.length === 0 && pendingImageUrls.length === 0) {
      setError(t.aiImport.empty);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    stopRequestedRef.current = false;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    const wasStopped = () => stopRequestedRef.current || controller.signal.aborted;
    try {
      let uploadedUrls: string[] = [...pendingImageUrls];
      if (files.length > 0) {
        const up = await uploadListingImages(files, UPLOAD_FOLDER[category]);
        if (wasStopped()) {
          setStatusMessage(t.aiImport.stopped(0, 1));
          return;
        }
        if (up.error) {
          setError(up.error);
          return;
        }
        uploadedUrls = [...uploadedUrls, ...up.urls].slice(0, MAX_AI_IMAGES);
      }

      const imagePayload =
        uploadedUrls.length > 0
          ? uploadedUrls.map((url) => ({ url }))
          : await filesToAiImagePayload(files);

      if (wasStopped()) {
        setStatusMessage(t.aiImport.stopped(0, 1));
        return;
      }

      setLastPrompt(trimmed);
      setPendingImageUrls(uploadedUrls);

      const urls = extractImportUrls(trimmed);
      const units = urls.length > 0 ? urls.length : 1;
      setProgress({ done: 0, total: units });

      const incomingUrlSet = new Set(urls);
      const keptDrafts = urls.length
        ? drafts.filter((d) => {
            const src = String(d.sourceUrl || '').trim();
            return !src || !incomingUrlSet.has(src);
          })
        : [...drafts];
      const collected: AiImportDraftResult[] = [];
      const persistMerged = () => persistDrafts([...keptDrafts, ...collected]);
      let batchId: string | null = null;
      const profile = importProfile();

      if (urls.length === 0) {
        const res = await importListingsFromLinks({
          text: trimmed,
          category,
          images: imagePayload,
          profile,
          batchSize: 1,
          feature: 'build',
          signal: controller.signal,
        });
        if (res.aborted || wasStopped()) {
          setStatusMessage(t.aiImport.stopped(0, 1));
          return;
        }
        if (res.error) {
          if (isAiDailyLimitError({ code: res.code, error: res.error, status: res.status })) {
            setError(aiDailyLimitMessage(t));
          } else {
            setError(res.error);
          }
          return;
        }
        if (!res.drafts.length) {
          setError(t.aiImport.empty);
          return;
        }
        collected.push(...res.drafts.map((d) => decorateImportedDraft(d, trimmed, uploadedUrls)));
        persistMerged();
        setProgress({ done: 1, total: 1 });
      } else {
        for (let i = 0; i < urls.length; i += 1) {
          if (wasStopped()) {
            setText(urls.slice(i).join('\n'));
            setStatusMessage(t.aiImport.stopped(collected.length, urls.length));
            persistMerged();
            break;
          }
          const res = await importListingsFromLinks({
            text: i === 0 ? trimmed : '',
            urls: [urls[i]],
            category,
            images: i === 0 ? imagePayload : undefined,
            profile,
            batchId,
            batchSize: urls.length,
            feature: 'build',
            signal: controller.signal,
          });
          if (res.aborted || wasStopped()) {
            setText(urls.slice(i).join('\n'));
            setStatusMessage(t.aiImport.stopped(collected.length, urls.length));
            persistMerged();
            break;
          }
          if (res.batchId) batchId = res.batchId;
          if (res.error) {
            if (isAiDailyLimitError({ code: res.code, error: res.error, status: res.status })) {
              setError(aiDailyLimitMessage(t));
            } else {
              setError(res.error);
            }
            persistMerged();
            return;
          }
          const chunk = (res.drafts.length
            ? res.drafts
            : [
                {
                  id: `ai-miss-${i}`,
                  sourceUrl: urls[i],
                  category: null,
                  title: '',
                  summary: '',
                  imageUrls: [],
                  form: {},
                  error: t.aiImport.failed,
                } satisfies AiImportDraftResult,
              ]
          ).map((d) => decorateImportedDraft(d, trimmed, uploadedUrls));
          collected.push(...chunk);
          persistMerged();
          setProgress({ done: i + 1, total: urls.length });
        }
      }

      const stopped = wasStopped();
      const hasMismatch = collected.some((d) => isAiCategoryMismatch(d));
      if (!stopped && !hasMismatch) {
        setText('');
        setFiles([]);
        setPendingImageUrls([]);
      }
    } catch {
      if (wasStopped()) {
        setStatusMessage(t.aiImport.stopped(0, 1));
      } else {
        setError(t.aiImport.failed);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      loadingRef.current = false;
      setLoading(false);
      setProgress(null);
      void checkSession();
    }
  };

  const handleRetryFailed = async () => {
    if (loadingRef.current) return;
    if (!category) {
      setError(t.aiImport.categoryRequired);
      return;
    }
    const failed = drafts.filter(isRetryableFailedDraft);
    const urls = failed.map((d) => d.sourceUrl).filter(Boolean);
    if (!urls.length) return;

    const controller = new AbortController();
    abortRef.current = controller;
    stopRequestedRef.current = false;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    const wasStopped = () => stopRequestedRef.current || controller.signal.aborted;
    const failedIds = new Set(failed.map((d) => d.id));
    const kept = drafts.filter((d) => !failedIds.has(d.id));
    try {
      const collected: AiImportDraftResult[] = [];
      let batchId: string | null = null;
      const profile = importProfile();
      setProgress({ done: 0, total: urls.length });

      for (let i = 0; i < urls.length; i += 1) {
        if (wasStopped()) {
          const leftover = failed.filter(
            (d) => !collected.some((c) => c.sourceUrl === d.sourceUrl),
          );
          persistDrafts([...kept, ...collected, ...leftover]);
          setStatusMessage(t.aiImport.stopped(collected.length, urls.length));
          break;
        }
        const res = await importListingsFromLinks({
          urls: [urls[i]],
          category,
          profile,
          batchId,
          batchSize: urls.length,
          feature: 'build',
          signal: controller.signal,
        });
        if (res.aborted || wasStopped()) {
          const leftover = failed.filter(
            (d) => !collected.some((c) => c.sourceUrl === d.sourceUrl),
          );
          persistDrafts([...kept, ...collected, ...leftover]);
          setStatusMessage(t.aiImport.stopped(collected.length, urls.length));
          break;
        }
        if (res.batchId) batchId = res.batchId;
        if (res.error) {
          if (isAiDailyLimitError({ code: res.code, error: res.error, status: res.status })) {
            setError(aiDailyLimitMessage(t));
          } else {
            setError(res.error);
          }
          persistDrafts([...kept, ...collected, ...failed.filter((d) => !collected.some((c) => c.sourceUrl === d.sourceUrl))]);
          return;
        }
        const chunk = (res.drafts.length ? res.drafts : []).map((d) =>
          decorateImportedDraft(d, lastPrompt, []),
        );
        collected.push(...chunk);
        persistDrafts([...kept, ...collected]);
        setProgress({ done: i + 1, total: urls.length });
      }
    } catch {
      if (wasStopped()) {
        setStatusMessage(t.aiImport.stopped(0, urls.length));
      } else {
        setError(t.aiImport.failed);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      loadingRef.current = false;
      setLoading(false);
      setProgress(null);
      void checkSession();
    }
  };

  const handleStop = (event?: React.SyntheticEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    stopRequestedRef.current = true;
    abortRef.current?.abort();
  };

  const acceptMismatch = (draft: AiImportDraftResult) => {
    const accepted = acceptAiCategoryCorrection(draft);
    if (!accepted?.category) {
      setError(t.aiImport.formEmpty);
      return;
    }
    const next = drafts.map((d) => (d.id === draft.id ? accepted : d));
    persistDrafts(next);
    setCategory(accepted.category);
    setError(null);
    setStatusMessage(t.aiImport.categorySwitched(categoryLabel(accepted.category)));
  };

  const startOverMismatch = (draft: AiImportDraftResult) => {
    const prompt = draft.sourcePrompt || lastPrompt || '';
    const images = draft.imageUrls?.length ? draft.imageUrls : pendingImageUrls;
    dismissDraft(draft.id);
    setText(prompt);
    setLastPrompt(prompt);
    setPendingImageUrls(images);
    setFiles([]);
    setCategory(null);
    setError(null);
    setStatusMessage(null);
  };

  const openDraft = async (draft: AiImportDraftResult) => {
    if (isAiContentRestricted(draft)) {
      setError(t.aiImport.contentRestricted);
      return;
    }
    if (isAiCategoryMismatch(draft)) {
      setError(formatCategoryMismatch(t, draft));
      return;
    }
    const ready = toAiListingDraft(draft);
    if (!ready) {
      setError(draft.error || t.aiImport.formEmpty);
      return;
    }

    setOpeningId(draft.id);
    setError(null);
    try {
      // Copy Instagram/CDN photos onto our storage so the listing form can show them
      // (hotlink protection blocks raw cdninstagram URLs without referrerPolicy, and
      // submit paths for some categories need hosted URLs).
      const remote = (ready.imageUrls || []).filter(
        (u) => /^https?:\/\//i.test(u) && !isOurStorageUrl(u),
      );
      let imageUrls = ready.imageUrls || [];
      if (remote.length) {
        const folder = ready.category ? UPLOAD_FOLDER[ready.category] : 'listings';
        const hosted = await hostAiDraftImages(imageUrls, folder || 'listings');
        if (hosted.urls.length) {
          imageUrls = hosted.urls;
        }
      }
      const withImages = { ...ready, imageUrls };
      saveAiListingDraft(withImages);
      // Keep draft queue in sync so returning to this page still shows hosted URLs.
      persistDrafts(
        drafts.map((d) => (d.id === draft.id ? { ...d, imageUrls } : d)),
      );
      const href = `${paths.user.realEstateListing}?category=${encodeURIComponent(withImages.category)}&ai=1&draftId=${encodeURIComponent(withImages.id)}`;
      hardNavigate(href);
    } catch {
      setError(t.aiImport.failed);
      setOpeningId(null);
    }
  };

  const dismissDraft = (draftId: string) => {
    persistDrafts(drafts.filter((d) => d.id !== draftId));
    removeAiListingDraftFromQueue(draftId);
  };

  const removeDraftImage = (draftId: string, displayIndex: number) => {
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;
    const images = draftImageUrls(draft);
    if (displayIndex < 0 || displayIndex >= images.length) return;

    const original = draft.imageUrls ?? [];
    let visibleCount = -1;
    let removeAt = -1;
    for (let i = 0; i < original.length; i += 1) {
      if (isDisplayableImageUrl(original[i])) {
        visibleCount += 1;
        if (visibleCount === displayIndex) {
          removeAt = i;
          break;
        }
      }
    }
    if (removeAt < 0) return;

    const nextUrls = original.filter((_, i) => i !== removeAt);
    const nextRoles = draft.imageRoles ? draft.imageRoles.filter((_, i) => i !== removeAt) : draft.imageRoles;
    const nextForm = { ...draft.form };
    if (Array.isArray(nextForm.imageUrls)) {
      nextForm.imageUrls = nextUrls;
    }

    persistDrafts(
      drafts.map((d) =>
        d.id === draftId
          ? { ...d, imageUrls: nextUrls, imageRoles: nextRoles, form: nextForm }
          : d,
      ),
    );

    setPreview((current) => {
      if (!current) return null;
      const sameDraft =
        current.urls.length === images.length && current.urls.every((url, i) => url === images[i]);
      if (!sameDraft) return current;
      const nextPreview = images.filter((_, i) => i !== displayIndex);
      if (!nextPreview.length) return null;
      const nextIndex = current.index > displayIndex ? current.index - 1 : current.index;
      return {
        urls: nextPreview,
        index: Math.min(Math.max(0, nextIndex), nextPreview.length - 1),
      };
    });
  };

  const deleteAllDrafts = () => {
    setDrafts([]);
    clearAiListingDraftQueue();
    setStatusMessage(null);
    setError(null);
  };

  const postOne = async (draft: AiImportDraftResult) => {
    if (isAiContentRestricted(draft)) {
      setError(t.aiImport.contentRestricted);
      return;
    }
    if (isAiCategoryMismatch(draft)) {
      setError(formatCategoryMismatch(t, draft));
      return;
    }
    const ready = toAiListingDraft(draft);
    if (!ready) {
      setError(draft.error || t.aiImport.formEmpty);
      return;
    }
    setPostingId(draft.id);
    setError(null);
    setStatusMessage(null);
    try {
      const result = await postAiListingDraft(ready, { phoneFallback: user?.phone });
      if (!result.ok) {
        setError(result.error || t.aiImport.failed);
        return;
      }
      persistDrafts(drafts.filter((d) => d.id !== draft.id));
      removeAiListingDraftFromQueue(draft.id);
      setStatusMessage(t.aiImport.postOk);
    } finally {
      setPostingId(null);
    }
  };

  const postAll = async () => {
    if (!readyDrafts.length) return;
    setPostingAll(true);
    setError(null);
    setStatusMessage(null);
    try {
      const results = await postAiListingDrafts(readyDrafts, { phoneFallback: user?.phone });
      const ok = results.filter((r) => r.ok).length;
      const fail = results.length - ok;
      const next = drafts
        .filter((d) => !results.some((r) => r.draftId === d.id && r.ok))
        .map((d) => {
          const failResult = results.find((r) => r.draftId === d.id && !r.ok);
          return failResult?.error ? { ...d, warning: failResult.error } : d;
        });
      persistDrafts(next);
      setStatusMessage(t.aiImport.postAllDone(ok, fail));
      if (fail > 0 && ok === 0) {
        setError(results.find((r) => !r.ok)?.error || t.aiImport.failed);
      }
    } finally {
      setPostingAll(false);
      setPostingId(null);
    }
  };

  const openPreview = (urls: string[], index: number) => {
    if (!urls.length) return;
    setPreview({ urls, index: Math.max(0, Math.min(index, urls.length - 1)) });
  };

  if (!user || !canPublish) return null;

  const canAnalyze = Boolean(text.trim() || files.length > 0 || pendingImageUrls.length > 0);

  return (
    <Stack spacing={1.75}>
      <PostListingHeader
        icon={SparkleIcon}
        title={t.aiImport.title}
        iconColor={AI_SEARCH_BLUE}
        iconBgcolor={AI_SEARCH_BLUE_SOFT}
      />

      <PostListingFormSurface>
        <Box
          component="form"
          onSubmit={handleAnalyze}
          sx={{
            ...productPanelSx,
            p: { xs: 1.25, sm: 1.5 },
          }}
        >
          <Stack spacing={1.15}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
              {t.aiImport.chooseCategory}
            </Typography>
            <Box
              role="listbox"
              aria-label={t.aiImport.chooseCategory}
              sx={{
                display: 'flex',
                gap: 0.5,
                justifyContent: 'space-between',
              }}
            >
              {categories.map((item) => {
                const key = toListingCategory(item.id);
                const selected = category === key;
                return (
                  <Stack
                    key={item.id}
                    component="button"
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setCategory(key);
                      setError(null);
                    }}
                    spacing={0.35}
                    sx={{
                      flex: '1 1 0',
                      minWidth: 0,
                      alignItems: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      font: 'inherit',
                      color: 'inherit',
                      transition: `transform ${MOTION.release} ${MOTION.ease}`,
                      '&:hover .ai-cat-circle': {
                        borderColor: AI_SEARCH_BLUE,
                        bgcolor: selected ? AI_SEARCH_BLUE : `${AI_SEARCH_BLUE}22`,
                      },
                      '&:hover .ai-cat-label': { color: AI_SEARCH_BLUE },
                      '&:active': {
                        transform: 'scale(0.96)',
                        transitionDuration: MOTION.press,
                      },
                    }}
                  >
                    <Box
                      className="ai-cat-circle"
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: selected ? AI_SEARCH_BLUE : 'action.hover',
                        border: '1.5px solid',
                        borderColor: selected ? AI_SEARCH_BLUE : 'divider',
                        transition: `border-color ${MOTION.fast} ${MOTION.ease}, background-color ${MOTION.fast} ${MOTION.ease}`,
                      }}
                    >
                      <HomeVerticalIcon
                        verticalId={item.id}
                        size={22}
                        color={selected ? AI_SEARCH_BLUE_ON : AI_SEARCH_BLUE}
                      />
                    </Box>
                    <Typography
                      className="ai-cat-label"
                      variant="caption"
                      sx={{
                        fontWeight: selected ? 700 : 600,
                        fontSize: '0.62rem',
                        lineHeight: 1.15,
                        color: selected ? AI_SEARCH_BLUE : 'text.secondary',
                        textAlign: 'center',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        transition: `color ${MOTION.fast} ${MOTION.ease}`,
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Stack>
                );
              })}
            </Box>

            {category ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  hidden
                  onChange={(e) => handleFilesPicked(e.target.files)}
                />

                <Box sx={{ position: 'relative' }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    maxRows={10}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={t.aiImport.placeholder}
                    disabled={loading}
                    sx={{
                      pointerEvents: loading ? 'none' : undefined,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'action.hover' : 'background.default',
                        pb: 5,
                        '& fieldset': { borderWidth: 1.5, borderColor: 'divider' },
                        '&:hover fieldset': { borderColor: 'text.secondary' },
                        '&.Mui-focused fieldset': {
                          borderWidth: 1.5,
                          borderColor: AI_SEARCH_BLUE,
                        },
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'text.disabled',
                        opacity: 1,
                      },
                    }}
                  />
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      position: 'absolute',
                      left: 8,
                      right: 8,
                      bottom: 8,
                      zIndex: 2,
                      alignItems: 'center',
                      pointerEvents: 'none',
                      '& > *': { pointerEvents: 'auto' },
                    }}
                  >
                    <IconButton
                      type="button"
                      size="small"
                      aria-label={t.aiImport.attachImages}
                      disabled={loading || files.length >= MAX_AI_IMAGES}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        width: 34,
                        height: 34,
                        color: files.length > 0 ? AI_SEARCH_BLUE : 'text.secondary',
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        '&:hover': {
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.12)'
                              : 'rgba(0,0,0,0.08)',
                        },
                      }}
                    >
                      <PaperclipIcon size={18} weight="bold" />
                    </IconButton>
                    {files.length > 0 ? (
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: AI_SEARCH_BLUE, fontSize: '0.7rem' }}
                      >
                        {files.length}
                      </Typography>
                    ) : null}
                    <Box sx={{ flex: 1 }} />
                    {loading ? (
                      <IconButton
                        type="button"
                        aria-label={t.aiImport.stop}
                        onPointerDown={handleStop}
                        onClick={handleStop}
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: 'error.main',
                          color: AI_SEARCH_BLUE_ON,
                          '&:hover': {
                            bgcolor: 'error.dark',
                            color: AI_SEARCH_BLUE_ON,
                          },
                        }}
                      >
                        <StopIcon size={16} weight="fill" />
                      </IconButton>
                    ) : (
                      <IconButton
                        type="submit"
                        aria-label={t.aiImport.analyze}
                        disabled={!canAnalyze}
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: AI_SEARCH_BLUE,
                          color: AI_SEARCH_BLUE_ON,
                          '&:hover': {
                            bgcolor: AI_SEARCH_BLUE_HOVER,
                            color: AI_SEARCH_BLUE_ON,
                          },
                          '&.Mui-disabled': {
                            bgcolor: AI_SEARCH_BLUE_SOFT,
                            color: AI_SEARCH_BLUE_ON,
                          },
                        }}
                      >
                        <SparkleIcon size={18} weight="bold" />
                      </IconButton>
                    )}
                  </Stack>
                </Box>

                {previews.length > 0 ? (
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                    {previews.map((src, index) => (
                      <Box
                        key={`${src}-${index}`}
                        sx={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}
                      >
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box
                            component="img"
                            src={src}
                            alt=""
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </Box>
                        <IconButton
                          size="small"
                          aria-label={t.aiImport.removeImage}
                          onClick={() => removeFile(index)}
                          disabled={loading}
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            zIndex: 1,
                            width: 28,
                            height: 28,
                            minWidth: 28,
                            p: 0,
                            touchAction: 'manipulation',
                            bgcolor: 'rgba(0,0,0,0.62)',
                            color: '#fff',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.82)' },
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              inset: -8,
                            },
                          }}
                        >
                          <XIcon size={14} weight="bold" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                ) : null}

                {error ? (
                  <Alert severity="error" sx={{ borderRadius: 2, py: 0.25 }}>
                    {error}
                  </Alert>
                ) : null}
              </>
            ) : (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 0.5 }}
              >
                {t.aiImport.chooseCategoryToContinue}
              </Typography>
            )}
          </Stack>
        </Box>
      </PostListingFormSurface>

      {drafts.length > 0 || loading ? (
        <Stack spacing={1}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.75 }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: '0.92rem', minWidth: 0, flex: 1 }}>
              {t.aiImport.results}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ flexShrink: 0, alignItems: 'stretch', width: { xs: '100%', sm: 'auto' } }}
            >
              <Button
                variant="contained"
                disabled={loading || postingAll || postingId != null || openingId != null || readyDrafts.length === 0}
                onClick={() => void postAll()}
                startIcon={
                  postingAll ? <CircularProgress size={14} color="inherit" /> : undefined
                }
                sx={{ ...aiButtonSx, flex: { xs: 1, sm: 'none' } }}
              >
                {postingAll ? t.aiImport.posting : t.aiImport.postAll}
              </Button>
              {retryableFailedDrafts.length > 0 ? (
                <Button
                  variant="outlined"
                  disabled={loading || postingAll || postingId != null || openingId != null}
                  onClick={() => void handleRetryFailed()}
                  startIcon={
                    loading ? <CircularProgress size={14} color="inherit" /> : undefined
                  }
                  sx={{ ...aiOutlinedButtonSx, flex: { xs: 1, sm: 'none' } }}
                >
                  {loading ? t.aiImport.retryingFailed : t.aiImport.retryFailed}
                </Button>
              ) : null}
              <IconButton
                aria-label={t.aiImport.deleteAll}
                disabled={postingAll || postingId != null || openingId != null || drafts.length === 0}
                onClick={deleteAllDrafts}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main', borderColor: 'error.main', bgcolor: 'action.hover' },
                }}
              >
                <TrashIcon size={16} weight="bold" />
              </IconButton>
            </Stack>
          </Stack>

          {loading ? <AiImportAnalyzingText progress={progress} t={t} /> : null}

          {statusMessage ? (
            <Alert severity="success" sx={{ borderRadius: 2.25 }}>
              {statusMessage}
            </Alert>
          ) : null}
          {drafts.map((draft) => {
            const mismatch = isAiCategoryMismatch(draft);
            const restricted = isAiContentRestricted(draft);
            const failed = (Boolean(draft.error) || !draft.category) && !mismatch;
            const images = draftImageUrls(draft);
            return (
              <Box
                key={draft.id}
                sx={{
                  ...productPanelSx,
                  p: 1.25,
                  borderRadius: 2.25,
                  borderColor: mismatch || restricted || failed ? 'error.main' : 'divider',
                }}
              >
                <Stack spacing={0.85}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    {images[0] ? (
                      <DraftImageThumb
                        src={images[0]}
                        size={56}
                        previewLabel={t.aiImport.previewImage}
                        removeLabel={t.aiImport.removeImage}
                        onPreview={() => openPreview(images, 0)}
                        onRemove={() => removeDraftImage(draft.id, 0)}
                        disabled={postingAll || postingId != null || openingId != null}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          flexShrink: 0,
                          borderRadius: 1.5,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: AI_SEARCH_BLUE_SOFT,
                          color: AI_SEARCH_BLUE,
                        }}
                      >
                        <LinkSimpleIcon size={16} />
                      </Box>
                    )}
                    <Stack spacing={0.3} sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.88rem',
                            flex: 1,
                            minWidth: 0,
                            color: 'text.primary',
                            lineHeight: 1.3,
                          }}
                        >
                          {draft.title ||
                            categoryLabel(draft.detectedCategory || draft.category) ||
                            (restricted ? t.aiImport.contentRestricted.slice(0, 48) : '')}
                        </Typography>
                        <IconButton
                          size="small"
                          aria-label={t.aiImport.dismissDraft}
                          onClick={() => dismissDraft(draft.id)}
                          sx={{
                            mt: -0.5,
                            mr: -0.5,
                            width: 36,
                            height: 36,
                            p: 0,
                            color: 'text.secondary',
                            touchAction: 'manipulation',
                          }}
                        >
                          <XIcon size={18} weight="bold" />
                        </IconButton>
                      </Stack>
                      {!mismatch && draft.sourceUrl ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            wordBreak: 'break-all',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontSize: '0.68rem',
                          }}
                        >
                          {draft.sourceUrl}
                        </Typography>
                      ) : null}
                      {draft.category && !mismatch && !restricted ? (
                        <Chip
                          size="small"
                          label={`${categoryLabel(draft.category)}${draft.cityName ? ` · ${draft.cityName}` : ''}`}
                          sx={{
                            alignSelf: 'flex-start',
                            height: 20,
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            bgcolor: AI_SEARCH_BLUE_SOFT,
                            color: AI_SEARCH_BLUE,
                          }}
                        />
                      ) : null}
                      {draft.summary && !restricted && !mismatch ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: '0.8rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {draft.summary}
                        </Typography>
                      ) : null}
                      {draft.warning && !mismatch ? (
                        <Alert severity="warning" sx={{ borderRadius: 2, py: 0 }}>
                          {draft.warning}
                        </Alert>
                      ) : null}
                      {restricted ? (
                        <Alert severity="error" sx={{ borderRadius: 2, py: 0.5 }}>
                          <Stack spacing={0.5}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {t.aiImport.contentRestricted}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t.aiImport.contentRestrictedHint}
                            </Typography>
                          </Stack>
                        </Alert>
                      ) : null}
                      {failed && !restricted && draft.error ? (
                        <Alert severity="error" sx={{ borderRadius: 2, py: 0 }}>
                          {formatAiDraftError(t, draft)}
                        </Alert>
                      ) : null}
                      {mismatch ? (
                        <AiCategoryMismatchPanel
                          draft={draft}
                          onAcceptDetected={() => acceptMismatch(draft)}
                          onStartOver={() => startOverMismatch(draft)}
                        />
                      ) : null}
                    </Stack>
                  </Stack>

                  {images.length > 1 ? (
                    <ImageStripSlider>
                      {images.slice(1).map((url, index) => (
                        <DraftImageThumb
                          key={`${draft.id}-${url}-${index}`}
                          src={url}
                          size={56}
                          previewLabel={t.aiImport.previewImage}
                          removeLabel={t.aiImport.removeImage}
                          onPreview={() => openPreview(images, index + 1)}
                          onRemove={() => removeDraftImage(draft.id, index + 1)}
                          disabled={postingAll || postingId != null || openingId != null}
                        />
                      ))}
                    </ImageStripSlider>
                  ) : null}

                  {!failed && !mismatch ? (
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        size="small"
                        disabled={postingAll || postingId != null || openingId != null}
                        onClick={() => void postOne(draft)}
                        startIcon={
                          postingId === draft.id ? (
                            <CircularProgress size={12} color="inherit" />
                          ) : (
                            <SparkleIcon size={14} weight="bold" />
                          )
                        }
                        sx={aiButtonSx}
                      >
                        {postingId === draft.id ? t.aiImport.posting : t.aiImport.post}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={postingAll || postingId != null || openingId != null}
                        onClick={() => void openDraft(draft)}
                        startIcon={
                          openingId === draft.id ? (
                            <CircularProgress size={12} color="inherit" />
                          ) : undefined
                        }
                        sx={aiOutlinedButtonSx}
                      >
                        {openingId === draft.id ? t.aiImport.openingForm : t.aiImport.openForm}
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : null}

      <ImageLightbox
        open={Boolean(preview)}
        urls={preview?.urls ?? []}
        index={preview?.index ?? 0}
        onClose={() => setPreview(null)}
        onIndexChange={(index) =>
          setPreview((current) => (current ? { ...current, index } : current))
        }
      />
    </Stack>
  );
}

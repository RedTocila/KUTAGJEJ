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
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { Paperclip as PaperclipIcon } from '@phosphor-icons/react/dist/ssr/Paperclip';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Stop as StopIcon } from '@phosphor-icons/react/dist/ssr/Stop';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { ProductDialog } from '@/components/core/product-dialog';
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

function draftImageUrls(draft: AiImportDraftResult | AiListingDraft): string[] {
  return (draft.imageUrls ?? []).filter((url) => {
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
  });
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

function AiImportProgressPanel({
  progress,
  loading,
  t,
}: {
  progress: { done: number; total: number } | null;
  loading: boolean;
  t: ReturnType<typeof useCopy>;
}) {
  if (!loading && !progress) return null;
  const total = progress?.total ?? 0;
  const done = progress?.done ?? 0;
  const current = total <= 0 ? 1 : Math.min(total, done + (loading ? 1 : 0));
  const percent = total <= 0 ? 0 : (done / total) * 100;

  return (
    <Stack
      spacing={0.65}
      sx={{
        width: '100%',
        px: 1.15,
        py: 0.9,
        borderRadius: 2,
        border: '1px solid',
        borderColor: loading ? AI_SEARCH_BLUE : 'divider',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : AI_SEARCH_BLUE_SOFT,
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        {loading ? (
          <CircularProgress size={14} thickness={5} sx={{ color: AI_SEARCH_BLUE }} />
        ) : (
          <SparkleIcon size={16} weight="fill" color={AI_SEARCH_BLUE} />
        )}
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.8rem',
            letterSpacing: '-0.01em',
            color: 'text.primary',
            ...(loading ? analyzingTextFlashSx : null),
          }}
        >
          {loading
            ? total > 0
              ? t.aiImport.progressWorking(current, total)
              : t.aiImport.analyzing
            : t.aiImport.progress(done, total)}
        </Typography>
      </Stack>
      <Box sx={{ position: 'relative', height: 5 }}>
        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{
            height: 5,
            borderRadius: 999,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: AI_SEARCH_BLUE },
          }}
        />
        {loading ? (
          <LinearProgress
            variant="indeterminate"
            sx={{
              position: 'absolute',
              inset: 0,
              height: 5,
              borderRadius: 999,
              opacity: 0.35,
              bgcolor: 'transparent',
              '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: AI_SEARCH_BLUE },
            }}
          />
        ) : null}
      </Box>
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
    if (!category) {
      setError(t.aiImport.categoryRequired);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed && files.length === 0 && pendingImageUrls.length === 0) {
      setError(t.aiImport.empty);
      return;
    }
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    stopRequestedRef.current = false;
    try {
      let uploadedUrls: string[] = [...pendingImageUrls];
      if (files.length > 0) {
        const up = await uploadListingImages(files, UPLOAD_FOLDER[category]);
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

      setLastPrompt(trimmed);
      setPendingImageUrls(uploadedUrls);

      const urls = extractImportUrls(trimmed);
      const units = urls.length > 0 ? urls.length : 1;
      setProgress({ done: 0, total: units });

      const collected: AiImportDraftResult[] = [];
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
        });
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
        persistDrafts(collected);
        setProgress({ done: 1, total: 1 });
      } else {
        for (let i = 0; i < urls.length; i += 1) {
          if (stopRequestedRef.current) {
            setText(urls.slice(i).join('\n'));
            setStatusMessage(t.aiImport.stopped(collected.length, urls.length));
            persistDrafts(collected);
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
          });
          if (res.batchId) batchId = res.batchId;
          if (res.error) {
            if (isAiDailyLimitError({ code: res.code, error: res.error, status: res.status })) {
              setError(aiDailyLimitMessage(t));
            } else {
              setError(res.error);
            }
            if (collected.length) persistDrafts(collected);
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
          persistDrafts(collected);
          setProgress({ done: i + 1, total: urls.length });
        }
      }

      const stopped = stopRequestedRef.current;
      const hasMismatch = collected.some((d) => isAiCategoryMismatch(d));
      if (!stopped && !hasMismatch) {
        setText('');
        setFiles([]);
        setPendingImageUrls([]);
      }
    } catch {
      setError(t.aiImport.failed);
    } finally {
      setLoading(false);
      void checkSession();
    }
  };

  const handleRetryFailed = async () => {
    if (!category) {
      setError(t.aiImport.categoryRequired);
      return;
    }
    const failed = drafts.filter(isRetryableFailedDraft);
    const urls = failed.map((d) => d.sourceUrl).filter(Boolean);
    if (!urls.length) return;

    setLoading(true);
    setError(null);
    setStatusMessage(null);
    stopRequestedRef.current = false;
    const failedIds = new Set(failed.map((d) => d.id));
    const kept = drafts.filter((d) => !failedIds.has(d.id));
    try {
      const collected: AiImportDraftResult[] = [];
      let batchId: string | null = null;
      const profile = importProfile();
      setProgress({ done: 0, total: urls.length });

      for (let i = 0; i < urls.length; i += 1) {
        if (stopRequestedRef.current) {
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
        });
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
      setError(t.aiImport.failed);
    } finally {
      setLoading(false);
      void checkSession();
    }
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
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

  const previewUrl = preview ? preview.urls[preview.index] : null;
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
                    <IconButton
                      type={loading ? 'button' : 'submit'}
                      aria-label={loading ? t.aiImport.stop : t.aiImport.analyze}
                      disabled={!loading && !canAnalyze}
                      onClick={loading ? handleStop : undefined}
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: loading ? 'error.main' : AI_SEARCH_BLUE,
                        color: AI_SEARCH_BLUE_ON,
                        '&:hover': {
                          bgcolor: loading ? 'error.dark' : AI_SEARCH_BLUE_HOVER,
                          color: AI_SEARCH_BLUE_ON,
                        },
                        '&.Mui-disabled': {
                          bgcolor: AI_SEARCH_BLUE_SOFT,
                          color: AI_SEARCH_BLUE_ON,
                        },
                      }}
                    >
                      {loading ? (
                        <StopIcon size={16} weight="fill" />
                      ) : (
                        <SparkleIcon size={18} weight="bold" />
                      )}
                    </IconButton>
                  </Stack>
                </Box>

                {previews.length > 0 ? (
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                    {previews.map((src, index) => (
                      <Box
                        key={`${src}-${index}`}
                        sx={{
                          position: 'relative',
                          width: 48,
                          height: 48,
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
                        <IconButton
                          size="small"
                          aria-label={t.aiImport.removeImage}
                          onClick={() => removeFile(index)}
                          disabled={loading}
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            width: 16,
                            height: 16,
                            p: 0,
                            bgcolor: 'rgba(0,0,0,0.62)',
                            color: '#fff',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                          }}
                        >
                          <XIcon size={9} weight="bold" />
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

                {loading || progress ? (
                  <AiImportProgressPanel progress={progress} loading={loading} t={t} />
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
            <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.92rem' }}>{t.aiImport.results}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {t.aiImport.draftsKeptHint}
              </Typography>
            </Stack>
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
                      <Box
                        component="button"
                        type="button"
                        aria-label={t.aiImport.previewImage}
                        onClick={() => openPreview(images, 0)}
                        sx={{
                          width: 52,
                          height: 52,
                          flexShrink: 0,
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
                          src={images[0]}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </Box>
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
                          sx={{ mt: -0.5, mr: -0.5, p: 0.4, color: 'text.secondary' }}
                        >
                          <XIcon size={14} weight="bold" />
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
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                      }}
                    >
                      {images.slice(1, 8).map((url, index) => (
                        <Box
                          key={`${draft.id}-${url}-${index}`}
                          component="button"
                          type="button"
                          aria-label={t.aiImport.previewImage}
                          onClick={() => openPreview(images, index + 1)}
                          sx={{
                            width: 48,
                            height: 48,
                            flexShrink: 0,
                            borderRadius: 1.5,
                            overflow: 'hidden',
                            border: '1px solid',
                            borderColor: 'divider',
                            padding: 0,
                            cursor: 'pointer',
                            bgcolor: 'background.paper',
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(event) => {
                              const img = event.currentTarget;
                              const button = img.closest('button');
                              if (button instanceof HTMLElement) button.style.display = 'none';
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </Box>
                      ))}
                    </Box>
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

      <ProductDialog
        open={Boolean(previewUrl)}
        onClose={() => setPreview(null)}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ position: 'relative', minHeight: { xs: 280, sm: 420 } }}>
          <IconButton
            aria-label={t.common.close}
            onClick={() => setPreview(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              color: '#fff',
              bgcolor: 'rgba(0,0,0,0.45)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
            }}
          >
            <XIcon size={18} weight="bold" />
          </IconButton>

          {preview && preview.urls.length > 1 ? (
            <>
              <IconButton
                aria-label="Previous"
                onClick={() =>
                  setPreview((current) =>
                    current
                      ? {
                          ...current,
                          index: (current.index - 1 + current.urls.length) % current.urls.length,
                        }
                      : current,
                  )
                }
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 2,
                  color: '#fff',
                  bgcolor: 'rgba(0,0,0,0.45)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                }}
              >
                <CaretLeftIcon size={20} weight="bold" />
              </IconButton>
              <IconButton
                aria-label="Next"
                onClick={() =>
                  setPreview((current) =>
                    current
                      ? {
                          ...current,
                          index: (current.index + 1) % current.urls.length,
                        }
                      : current,
                  )
                }
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 2,
                  color: '#fff',
                  bgcolor: 'rgba(0,0,0,0.45)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.65)' },
                }}
              >
                <CaretRightIcon size={20} weight="bold" />
              </IconButton>
            </>
          ) : null}

          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              referrerPolicy="no-referrer"
              style={{
                width: '100%',
                height: 'min(70vh, 640px)',
                objectFit: 'contain',
                display: 'block',
                background: '#0b0b0b',
              }}
            />
          ) : null}

          {preview && preview.urls.length > 1 ? (
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.85)',
                bgcolor: 'rgba(0,0,0,0.45)',
                px: 1,
                py: 0.35,
                borderRadius: 999,
              }}
            >
              {preview.index + 1} / {preview.urls.length}
            </Typography>
          ) : null}
        </Box>
      </ProductDialog>
    </Stack>
  );
}

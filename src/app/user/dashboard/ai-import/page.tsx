'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
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
  fetchAiImportQuota,
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
  type AiImportQuota,
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

export default function AiImportListingsPage() {
  const router = useRouter();
  const { user } = useUser();
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
  const [quota, setQuota] = React.useState<AiImportQuota | null>(null);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);

  const canPublish =
    Boolean(user) &&
    (user?.accountType === 'individual' ||
      user?.accountType === 'business' ||
      user?.role === 'business-user');

  const quotaExhausted = Boolean(quota && !quota.unlimited && (quota.remaining ?? 0) <= 0);

  React.useEffect(() => {
    if (!user) return;
    if (!canPublish) router.replace(paths.user.dashboard);
  }, [user, canPublish, router]);

  React.useEffect(() => {
    if (!user || !canPublish) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchAiImportQuota();
      if (!cancelled && res.quota) setQuota(res.quota);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, canPublish]);

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
    if (quotaExhausted) {
      setError(aiDailyLimitMessage(t, quota?.planCode));
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
        });
        if (res.quota) setQuota(res.quota);
        if (res.error) {
          if (isAiDailyLimitError({ code: res.code, error: res.error, status: res.status })) {
            setError(aiDailyLimitMessage(t, res.quota?.planCode || quota?.planCode));
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
          const res = await importListingsFromLinks({
            text: i === 0 ? trimmed : '',
            urls: [urls[i]],
            category,
            images: i === 0 ? imagePayload : undefined,
            profile,
            batchId,
            batchSize: urls.length,
          });
          if (res.quota) setQuota(res.quota);
          if (res.batchId) batchId = res.batchId;
          if (res.error) {
            if (isAiDailyLimitError({ code: res.code, error: res.error, status: res.status })) {
              setError(aiDailyLimitMessage(t, res.quota?.planCode || quota?.planCode));
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

      const hasMismatch = collected.some((d) => isAiCategoryMismatch(d));
      if (!hasMismatch) {
        setText('');
        setFiles([]);
        setPendingImageUrls([]);
      }
    } catch {
      setError(t.aiImport.failed);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!category) {
      setError(t.aiImport.categoryRequired);
      return;
    }
    if (quotaExhausted) {
      setError(aiDailyLimitMessage(t, quota?.planCode));
      return;
    }
    const failed = drafts.filter(isRetryableFailedDraft);
    const urls = failed.map((d) => d.sourceUrl).filter(Boolean);
    if (!urls.length) return;

    setLoading(true);
    setError(null);
    setStatusMessage(null);
    const failedIds = new Set(failed.map((d) => d.id));
    const kept = drafts.filter((d) => !failedIds.has(d.id));
    try {
      const collected: AiImportDraftResult[] = [];
      let batchId: string | null = null;
      const profile = importProfile();
      setProgress({ done: 0, total: urls.length });

      for (let i = 0; i < urls.length; i += 1) {
        const res = await importListingsFromLinks({
          urls: [urls[i]],
          category,
          profile,
          batchId,
          batchSize: urls.length,
        });
        if (res.quota) setQuota(res.quota);
        if (res.batchId) batchId = res.batchId;
        if (res.error) {
          if (isAiDailyLimitError({ code: res.code, error: res.error, status: res.status })) {
            setError(aiDailyLimitMessage(t, res.quota?.planCode || quota?.planCode));
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
    }
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

  return (
    <Stack spacing={2.5}>
      <PostListingHeader
        icon={SparkleIcon}
        title={t.aiImport.title}
        iconColor={AI_SEARCH_BLUE}
        iconBgcolor={AI_SEARCH_BLUE_SOFT}
      />

      <PostListingFormSurface>
        <Box
          sx={{
            borderRadius: 2.75,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <Stack
            spacing={1.75}
            component="form"
            onSubmit={handleAnalyze}
            sx={{ p: { xs: 1.75, sm: 2.25 } }}
          >
            <Stack spacing={1.15}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.92rem' }}>
                  {t.aiImport.chooseCategory}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.25}
                  sx={{ alignItems: 'center', color: AI_SEARCH_BLUE, flexShrink: 0 }}
                  aria-hidden
                >
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: AI_SEARCH_BLUE,
                      opacity: 0.95,
                    }}
                  />
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: AI_SEARCH_BLUE,
                      opacity: 0.45,
                    }}
                  />
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      bgcolor: AI_SEARCH_BLUE,
                      opacity: 0.25,
                    }}
                  />
                  <CaretRightIcon size={14} weight="bold" />
                </Stack>
              </Stack>
              <Box
                role="listbox"
                aria-label={t.aiImport.chooseCategory}
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'nowrap',
                  gap: { xs: 1.25, sm: 2 },
                  justifyContent: 'flex-start',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: { xs: 'x proximity', sm: 'none' },
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  pb: 0.25,
                  '&::-webkit-scrollbar': { display: 'none' },
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
                      spacing={0.4}
                      sx={{
                        flexShrink: 0,
                        scrollSnapAlign: { xs: 'start', sm: 'none' },
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        font: 'inherit',
                        color: 'inherit',
                        '&:hover .ai-cat-circle': {
                          borderColor: AI_SEARCH_BLUE,
                          bgcolor: selected ? AI_SEARCH_BLUE : `${AI_SEARCH_BLUE}22`,
                        },
                        '&:hover .ai-cat-label': {
                          color: AI_SEARCH_BLUE,
                        },
                      }}
                    >
                      <Box
                        className="ai-cat-circle"
                        sx={{
                          width: { xs: 60, sm: 58 },
                          height: { xs: 60, sm: 58 },
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: selected ? AI_SEARCH_BLUE : 'action.hover',
                          border: '1.5px solid',
                          borderColor: selected ? AI_SEARCH_BLUE : 'divider',
                          transition: 'border-color 0.15s ease, background-color 0.15s ease',
                        }}
                      >
                        <HomeVerticalIcon
                          verticalId={item.id}
                          size={34}
                          color={selected ? AI_SEARCH_BLUE_ON : AI_SEARCH_BLUE}
                        />
                      </Box>
                      <Typography
                        className="ai-cat-label"
                        variant="caption"
                        sx={{
                          fontWeight: selected ? 700 : 600,
                          color: selected ? AI_SEARCH_BLUE : 'text.secondary',
                          whiteSpace: 'nowrap',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {item.label}
                      </Typography>
                    </Stack>
                  );
                })}
              </Box>
            </Stack>

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
                    minRows={5}
                    maxRows={12}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={t.aiImport.placeholder}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'action.hover' : 'background.default',
                        color: 'text.primary',
                        pb: 4.5,
                        '& fieldset': {
                          borderWidth: 1.5,
                          borderColor: 'divider',
                        },
                        '&:hover fieldset': {
                          borderColor: 'text.secondary',
                        },
                        '&.Mui-focused fieldset': {
                          borderWidth: 1.5,
                          borderColor: 'text.secondary',
                        },
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: '#9CA3AF',
                        opacity: 1,
                      },
                    }}
                  />
                  <IconButton
                    type="button"
                    size="small"
                    aria-label={t.aiImport.attachImages}
                    disabled={loading || files.length >= MAX_AI_IMAGES}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      position: 'absolute',
                      right: 10,
                      bottom: 10,
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
                    <PaperclipIcon size={20} weight="bold" />
                  </IconButton>
                </Box>

                {previews.length > 0 ? (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {previews.map((src, index) => (
                      <Box
                        key={`${src}-${index}`}
                        sx={{
                          position: 'relative',
                          width: 56,
                          height: 56,
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
                            width: 22,
                            height: 22,
                            bgcolor: 'rgba(0,0,0,0.55)',
                            color: '#fff',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                          }}
                        >
                          <XIcon size={12} weight="bold" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                ) : null}

                {quota ? (
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 600 }}>
                    {quota.unlimited
                      ? t.aiImport.quotaUnlimited
                      : t.aiImport.quotaRemaining(quota.remaining ?? 0, quota.limit ?? 0)}
                    {quotaExhausted ? (
                      <>
                        {' · '}
                        <Box
                          component="a"
                          href={paths.user.packagesMain}
                          sx={{ color: AI_SEARCH_BLUE, fontWeight: 800, textDecoration: 'none' }}
                        >
                          {t.aiImport.upgradeForMore}
                        </Box>
                      </>
                    ) : null}
                  </Typography>
                ) : null}

                {error ? (
                  <Alert severity="error" sx={{ borderRadius: 2.5 }}>
                    {error}
                  </Alert>
                ) : null}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || quotaExhausted || (!text.trim() && files.length === 0)}
                  fullWidth
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SparkleIcon size={18} weight="bold" />
                    )
                  }
                  sx={{
                    borderRadius: '16px',
                    textTransform: 'none',
                    fontWeight: 800,
                    py: 1.35,
                    boxShadow: 'none',
                    bgcolor: AI_SEARCH_BLUE,
                    color: AI_SEARCH_BLUE_ON,
                    '&:hover': {
                      boxShadow: 'none',
                      bgcolor: AI_SEARCH_BLUE_HOVER,
                      color: AI_SEARCH_BLUE_ON,
                    },
                    '&.Mui-disabled': {
                      bgcolor: AI_SEARCH_BLUE,
                      color: AI_SEARCH_BLUE_ON,
                      opacity: 0.55,
                    },
                  }}
                >
                  {loading ? t.aiImport.analyzing : t.aiImport.analyze}
                </Button>
                {progress ? (
                  <Stack spacing={0.75}>
                    <LinearProgress
                      variant="determinate"
                      value={progress.total <= 0 ? 0 : (progress.done / progress.total) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 999,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.08)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 999,
                          bgcolor: AI_SEARCH_BLUE,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      {progress.done <= 0
                        ? t.aiImport.progressStarting(progress.total)
                        : t.aiImport.progress(progress.done, progress.total)}
                    </Typography>
                  </Stack>
                ) : null}
              </>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 1.5, px: 1 }}
              >
                {t.aiImport.chooseCategoryToContinue}
              </Typography>
            )}
          </Stack>
        </Box>
      </PostListingFormSurface>

      {drafts.length > 0 ? (
        <Stack spacing={1.5}>
          {progress ? (
            <Stack spacing={0.75}>
              <LinearProgress
                variant="determinate"
                value={progress.total <= 0 ? 0 : (progress.done / progress.total) * 100}
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 999,
                    bgcolor: AI_SEARCH_BLUE,
                  },
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {progress.done <= 0
                  ? t.aiImport.progressStarting(progress.total)
                  : t.aiImport.progress(progress.done, progress.total)}
              </Typography>
            </Stack>
          ) : null}
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
          >
            <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>{t.aiImport.results}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t.aiImport.draftsKeptHint}
              </Typography>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexShrink: 0, alignItems: 'stretch', width: { xs: '100%', sm: 'auto' } }}
            >
              <Button
                variant="contained"
                disabled={postingAll || postingId != null || openingId != null || readyDrafts.length === 0}
                onClick={() => void postAll()}
                startIcon={
                  postingAll ? <CircularProgress size={14} color="inherit" /> : undefined
                }
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: '16px',
                  boxShadow: 'none',
                  flex: { xs: 1, sm: 'none' },
                  bgcolor: AI_SEARCH_BLUE,
                  color: AI_SEARCH_BLUE_ON,
                  '&:hover': { boxShadow: 'none', bgcolor: AI_SEARCH_BLUE_HOVER },
                  '&.Mui-disabled': {
                    bgcolor: AI_SEARCH_BLUE,
                    color: AI_SEARCH_BLUE_ON,
                    opacity: 0.55,
                  },
                }}
              >
                {postingAll ? t.aiImport.posting : t.aiImport.postAll}
              </Button>
              {retryableFailedDrafts.length > 0 ? (
                <Button
                  variant="outlined"
                  disabled={loading || postingAll || postingId != null || openingId != null || quotaExhausted}
                  onClick={() => void handleRetryFailed()}
                  startIcon={
                    loading ? <CircularProgress size={14} color="inherit" /> : undefined
                  }
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    borderRadius: '16px',
                    flex: { xs: 1, sm: 'none' },
                  }}
                >
                  {loading ? t.aiImport.retryingFailed : t.aiImport.retryFailed}
                </Button>
              ) : null}
              <Button
                variant="contained"
                aria-label={t.aiImport.deleteAll}
                disabled={postingAll || postingId != null || openingId != null || drafts.length === 0}
                onClick={deleteAllDrafts}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: '16px',
                  boxShadow: 'none',
                  minWidth: 42,
                  px: 1.25,
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                  '&:hover': { boxShadow: 'none', bgcolor: 'error.dark' },
                  '&.Mui-disabled': {
                    bgcolor: 'error.main',
                    color: 'error.contrastText',
                    opacity: 0.55,
                  },
                }}
              >
                <TrashIcon size={18} weight="bold" />
              </Button>
            </Stack>
          </Stack>

          {statusMessage ? (
            <Alert severity="success" sx={{ borderRadius: 2.5 }}>
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
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: mismatch || restricted || failed ? 'error.main' : 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ color: 'text.secondary', mt: 0.25 }}>
                      <LinkSimpleIcon size={18} />
                    </Box>
                    <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.98rem',
                            flex: 1,
                            minWidth: 0,
                            color: 'text.primary',
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
                          sx={{ mt: -0.5, mr: -0.75, color: 'text.secondary' }}
                        >
                          <XIcon size={16} weight="bold" />
                        </IconButton>
                      </Stack>
                      {!mismatch && draft.sourceUrl ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ wordBreak: 'break-all' }}
                        >
                          {draft.sourceUrl}
                        </Typography>
                      ) : null}
                      {draft.category && !mismatch && !restricted ? (
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {categoryLabel(draft.category)}
                          {draft.cityName ? ` · ${draft.cityName}` : ''}
                        </Typography>
                      ) : null}
                      {draft.summary && !restricted && !mismatch ? (
                        <Typography variant="body2" color="text.secondary">
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

                  {images.length > 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                      }}
                    >
                      {images.slice(0, 8).map((url, index) => (
                        <Box
                          key={`${draft.id}-${url}-${index}`}
                          component="button"
                          type="button"
                          aria-label={t.aiImport.previewImage}
                          onClick={() => openPreview(images, index)}
                          sx={{
                            width: 72,
                            height: 72,
                            flexShrink: 0,
                            borderRadius: 2,
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
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        disabled={postingAll || postingId != null || openingId != null}
                        onClick={() => void postOne(draft)}
                        startIcon={
                          postingId === draft.id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <SparkleIcon size={16} weight="bold" />
                          )
                        }
                        sx={{
                          textTransform: 'none',
                          fontWeight: 800,
                          borderRadius: '16px',
                          boxShadow: 'none',
                          bgcolor: AI_SEARCH_BLUE,
                          color: AI_SEARCH_BLUE_ON,
                          '&:hover': {
                            boxShadow: 'none',
                            bgcolor: AI_SEARCH_BLUE_HOVER,
                            color: AI_SEARCH_BLUE_ON,
                          },
                          '&.Mui-disabled': {
                            bgcolor: AI_SEARCH_BLUE,
                            color: AI_SEARCH_BLUE_ON,
                            opacity: 0.55,
                          },
                        }}
                      >
                        {postingId === draft.id ? t.aiImport.posting : t.aiImport.post}
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={postingAll || postingId != null || openingId != null}
                        onClick={() => void openDraft(draft)}
                        startIcon={
                          openingId === draft.id ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : undefined
                        }
                        sx={{
                          textTransform: 'none',
                          fontWeight: 800,
                          borderRadius: '16px',
                          borderColor: AI_SEARCH_BLUE,
                          color: AI_SEARCH_BLUE,
                          '&:hover': {
                            borderColor: AI_SEARCH_BLUE,
                            bgcolor: AI_SEARCH_BLUE_SOFT,
                          },
                        }}
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

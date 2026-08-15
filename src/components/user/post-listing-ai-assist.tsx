'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material';
import { Paperclip as PaperclipIcon } from '@phosphor-icons/react/dist/ssr/Paperclip';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { AiCategoryMismatchPanel } from '@/components/user/ai-category-mismatch-panel';
import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { aiDraftToInitialListing, mergeAiIntoListing } from '@/lib/ai-draft-to-listing';
import {
  acceptAiCategoryCorrection,
  aiDailyLimitMessage,
  fetchAiImportQuota,
  filesToAiImagePayload,
  importListingsFromLinks,
  isAiCategoryMismatch,
  isAiContentRestricted,
  isAiDailyLimitError,
  mergeAttachedImageUrls,
  toAiListingDraft,
  type AiImportDraftResult,
  type AiImportQuota,
} from '@/lib/ai-import-client';
import { saveAiListingDraft } from '@/lib/ai-listing-draft';
import { hostAiDraftImages } from '@/lib/ai-draft-post';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_ON,
  AI_SEARCH_BLUE_SOFT,
} from '@/lib/home-categories';
import { POST_LISTING_AI_BAR_ID, POST_LISTING_AI_INPUT_ID } from '@/lib/post-listing-ai-focus';
import { hardNavigate } from '@/lib/hard-navigate';
import { knownCreateDefaultsFromStorage } from '@/lib/listing-form-defaults';
import { paths } from '@/paths';
import { isOurStorageUrl, uploadListingImages } from '@/lib/uploads-client';
import type { ListingCategoryKey } from '@/types/listing-category';

const MAX_AI_IMAGES = 6;

const UPLOAD_FOLDER: Record<ListingCategoryKey, string> = {
  'real-estate': 'real-estate',
  cars: 'cars',
  'job-listings': 'jobs',
  marketplace: 'marketplace',
  businesses: 'businesses',
  professionals: 'professionals',
};

function profileFromUser(user: ReturnType<typeof useUser>['user']) {
  if (!user) return null;
  const loc = knownCreateDefaultsFromStorage(user.id);
  const basedCityId = typeof user.basedCityId === 'string' ? user.basedCityId.trim() : '';
  const basedCityName = typeof user.basedCityName === 'string' ? user.basedCityName.trim() : '';
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
    preferredCityId: basedCityId || loc.cityId || null,
    preferredCityName: basedCityName || loc.cityName || null,
  };
}

export function PostListingAiAssist({
  category,
  onApply,
  mode = 'create',
  currentListing = null,
}: {
  category: ListingCategoryKey;
  onApply: (initial: Record<string, unknown>) => void;
  mode?: 'create' | 'edit';
  currentListing?: Record<string, unknown> | null;
  /** @deprecated Always a single-line bar; kept for call-site compatibility. */
  defaultOpen?: boolean;
  /** @deprecated Always a single-line bar; kept for call-site compatibility. */
  variant?: 'panel' | 'composer';
}) {
  const t = useCopy();
  const { user } = useUser();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [inputExpanded, setInputExpanded] = React.useState(false);
  const [mismatchDraft, setMismatchDraft] = React.useState<AiImportDraftResult | null>(null);
  const [pendingImageUrls, setPendingImageUrls] = React.useState<string[]>([]);
  const [quota, setQuota] = React.useState<AiImportQuota | null>(null);
  const quotaExhausted = Boolean(quota && !quota.unlimited && (quota.remaining ?? 0) <= 0);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchAiImportQuota();
      if (!cancelled && res.quota) setQuota(res.quota);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  React.useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  React.useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || !text) {
      setInputExpanded(false);
      return;
    }

    const measure = () => {
      const styles = getComputedStyle(el);
      const lineHeight = Number.parseFloat(styles.lineHeight) || 20;
      const paddingY =
        (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
      const singleLineHeight = lineHeight + paddingY;
      // Always wrap for measurement (never nowrap — that blocked expansion).
      const multiline = text.includes('\n') || el.scrollHeight > singleLineHeight + 2;
      setInputExpanded(multiline);
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [text]);

  const isEdit = mode === 'edit';
  const placeholder = isEdit ? t.aiImport.editPlaceholder : t.aiImport.formPlaceholder;
  const appliedMsg = isEdit ? t.aiImport.editApplied : t.aiImport.formApplied;
  const canSubmit = Boolean(text.trim() || files.length > 0 || pendingImageUrls.length > 0);
  const canAnalyze = canSubmit && !quotaExhausted;

  const openCorrectCategoryForm = async (draft: AiImportDraftResult) => {
    const accepted = acceptAiCategoryCorrection(draft) ?? {
      ...draft,
      category: draft.detectedCategory || draft.category,
      error: null,
      errorCode: null,
    };
    const ready = toAiListingDraft(accepted as AiImportDraftResult);
    if (!ready) {
      setError(t.aiImport.formEmpty);
      return;
    }
    let imageUrls = ready.imageUrls || [];
    const needsHost = imageUrls.some((u) => /^https?:\/\//i.test(u) && !isOurStorageUrl(u));
    if (needsHost) {
      const folder = UPLOAD_FOLDER[ready.category] || 'listings';
      const hosted = await hostAiDraftImages(imageUrls, folder);
      if (hosted.urls.length) imageUrls = hosted.urls;
    }
    const withImages = { ...ready, imageUrls };
    saveAiListingDraft(withImages);
    const href = `${paths.user.realEstateListing}?category=${encodeURIComponent(withImages.category)}&ai=1&draftId=${encodeURIComponent(withImages.id)}`;
    hardNavigate(href);
  };

  const handleFilesPicked = (list: FileList | null) => {
    if (!list?.length) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue;
      if (next.length >= MAX_AI_IMAGES) break;
      next.push(file);
    }
    setFiles(next);
    setMismatchDraft(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && files.length === 0 && pendingImageUrls.length === 0) {
      setError(t.aiImport.empty);
      setSuccess(null);
      return;
    }
    if (quotaExhausted) {
      setError(aiDailyLimitMessage(t, quota?.planCode));
      setSuccess(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setMismatchDraft(null);
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

      setPendingImageUrls(uploadedUrls);

      const res = await importListingsFromLinks({
        text: trimmed,
        category,
        profile: profileFromUser(user),
        images: imagePayload,
        mode,
        currentListing: isEdit ? currentListing : null,
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

      const match =
        res.drafts.find((d) => d.category === category && !d.error && !isAiCategoryMismatch(d)) ??
        res.drafts.find((d) => !d.error && d.category && !isAiCategoryMismatch(d));

      if (!match) {
        const restricted = res.drafts.find((d) => isAiContentRestricted(d));
        if (restricted) {
          setError(t.aiImport.contentRestricted);
          return;
        }
        const mismatch = res.drafts.find((d) => isAiCategoryMismatch(d));
        if (mismatch) {
          setMismatchDraft({
            ...mismatch,
            sourcePrompt: mismatch.sourcePrompt || trimmed,
            preferredCategory: mismatch.preferredCategory || category,
            imageUrls:
              uploadedUrls.length > 0
                ? mergeAttachedImageUrls({
                    remoteUrls: mismatch.imageUrls ?? [],
                    uploadedUrls,
                    roles: mismatch.imageRoles,
                    max: (mismatch.detectedCategory || category) === 'professionals' ? 2 : 8,
                  })
                : mismatch.imageUrls ?? [],
          });
          return;
        }
        const firstError = res.drafts.find((d) => d.error)?.error;
        setError(firstError || t.aiImport.formEmpty);
        return;
      }

      if (match.category !== category) {
        setMismatchDraft({
          ...match,
          preferredCategory: category,
          detectedCategory: match.category,
          errorCode: 'category_mismatch',
          error: t.aiImport.formWrongCategory,
          sourcePrompt: trimmed,
        });
        return;
      }

      const ready = toAiListingDraft(match);
      if (!ready) {
        setError(t.aiImport.formEmpty);
        return;
      }

      const imageUrls =
        uploadedUrls.length > 0
          ? mergeAttachedImageUrls({
              remoteUrls: ready.imageUrls ?? [],
              uploadedUrls,
              roles: ready.imageRoles,
              max: category === 'professionals' ? 2 : 8,
            })
          : ready.imageUrls ?? [];

      let hostedUrls = imageUrls;
      const needsHost = imageUrls.some((u) => /^https?:\/\//i.test(u) && !isOurStorageUrl(u));
      if (needsHost) {
        const hosted = await hostAiDraftImages(imageUrls, UPLOAD_FOLDER[category] || 'listings');
        if (hosted.urls.length) hostedUrls = hosted.urls;
      }

      const shaped = aiDraftToInitialListing({ ...ready, imageUrls: hostedUrls });
      const payload =
        isEdit && currentListing ? mergeAiIntoListing(currentListing, shaped) : shaped;

      onApply(payload);
      setSuccess(appliedMsg);
      setText('');
      setFiles([]);
      setPendingImageUrls([]);
      setMismatchDraft(null);
    } catch {
      setError(t.aiImport.failed);
    } finally {
      setLoading(false);
    }
  };

  const acceptMismatchDetected = () => {
    if (!mismatchDraft) return;
    void openCorrectCategoryForm(mismatchDraft);
  };

  const startOverMismatch = () => {
    if (mismatchDraft?.sourcePrompt) setText(mismatchDraft.sourcePrompt);
    if (mismatchDraft?.imageUrls?.length) setPendingImageUrls(mismatchDraft.imageUrls);
    setMismatchDraft(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <Stack
      id={POST_LISTING_AI_BAR_ID}
      spacing={1}
      component="form"
      onSubmit={handleAnalyze}
      sx={{ scrollMarginTop: 72 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => handleFilesPicked(e.target.files)}
      />

      <Box
        sx={{
          display: 'flex',
          gap: 0.25,
          p: 0.75,
          borderRadius: inputExpanded ? 2.5 : 999,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          alignItems: inputExpanded ? 'flex-end' : 'center',
          transition: 'border-radius 120ms ease',
        }}
      >
        <TextField
          fullWidth
          size="small"
          autoComplete="off"
          multiline
          minRows={1}
          maxRows={4}
          value={text}
          inputRef={inputRef}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          disabled={loading}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (!loading && canAnalyze) void handleAnalyze();
            }
          }}
          slotProps={{
            htmlInput: { id: POST_LISTING_AI_INPUT_ID },
            input: {
              startAdornment: (
                <InputAdornment
                  position="start"
                  sx={{
                    color: AI_SEARCH_BLUE,
                    alignSelf: inputExpanded ? 'flex-start' : 'center',
                    mt: inputExpanded ? 0.5 : 0,
                  }}
                >
                  <SparkleIcon size={18} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment
                  position="end"
                  sx={{
                    alignSelf: inputExpanded ? 'flex-start' : 'center',
                    mt: inputExpanded ? 0.25 : 0,
                  }}
                >
                  <IconButton
                    type="button"
                    size="small"
                    aria-label={t.aiImport.attachImages}
                    disabled={loading || files.length >= MAX_AI_IMAGES}
                    onClick={() => fileInputRef.current?.click()}
                    edge="end"
                    sx={{
                      color: files.length > 0 ? AI_SEARCH_BLUE : 'text.secondary',
                      mr: -0.5,
                      p: 0.75,
                    }}
                  >
                    <PaperclipIcon size={20} weight="bold" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'transparent',
              alignItems: inputExpanded ? 'flex-start' : 'center',
              py: 0,
              minHeight: 40,
              '& fieldset': { border: 'none' },
            },
            '& textarea': {
              resize: 'none',
              lineHeight: 1.35,
              ...(!text
                ? {
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden !important',
                  }
                : {
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    overflow: inputExpanded ? 'auto' : 'hidden',
                  }),
            },
          }}
        />
        <IconButton
          type="submit"
          aria-label={loading ? t.aiImport.analyzing : t.aiImport.analyze}
          disabled={loading || !canAnalyze}
          sx={{
            flexShrink: 0,
            width: 40,
            height: 40,
            alignSelf: inputExpanded ? 'flex-end' : 'center',
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
          {loading ? (
            <CircularProgress size={18} sx={{ color: AI_SEARCH_BLUE_ON }} />
          ) : (
            <SparkleIcon size={18} weight="bold" />
          )}
        </IconButton>
      </Box>

      {previews.length > 0 ? (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, px: 0.5 }}>
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

      {mismatchDraft ? (
        <AiCategoryMismatchPanel
          draft={mismatchDraft}
          allowCategorySwitch={!isEdit}
          onAcceptDetected={acceptMismatchDetected}
          onStartOver={startOverMismatch}
        />      ) : null}

      {quota && !quota.unlimited ? (
        <Alert
          severity={quotaExhausted ? 'warning' : 'info'}
          sx={{ borderRadius: 2.5, py: 0, '& .MuiAlert-message': { fontSize: '0.78rem', fontWeight: 600 } }}
        >
          {t.aiImport.quotaRemaining(quota.remaining ?? 0, quota.limit ?? 0)}
          {quotaExhausted ? ` — ${t.aiImport.upgradeForMore}` : null}
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 2.5, py: 0 }}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" sx={{ borderRadius: 2.5, py: 0 }}>
          {success}
        </Alert>
      ) : null}
    </Stack>
  );
}

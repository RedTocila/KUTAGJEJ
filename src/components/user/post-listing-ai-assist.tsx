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
  filesToAiImagePayload,
  importListingsFromLinks,
  isAiCategoryMismatch,
  isAiContentRestricted,
  mergeAttachedImageUrls,
  toAiListingDraft,
  type AiImportDraftResult,
} from '@/lib/ai-import-client';
import { saveAiListingDraft } from '@/lib/ai-listing-draft';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_ON,
  AI_SEARCH_BLUE_SOFT,
} from '@/lib/home-categories';
import { hardNavigate } from '@/lib/hard-navigate';
import { paths } from '@/paths';
import { uploadListingImages } from '@/lib/uploads-client';
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
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
      setInputExpanded(el.scrollHeight > lineHeight + 4);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  const isEdit = mode === 'edit';
  const placeholder = isEdit ? t.aiImport.editPlaceholder : t.aiImport.formPlaceholder;
  const appliedMsg = isEdit ? t.aiImport.editApplied : t.aiImport.formApplied;
  const canSubmit = Boolean(text.trim() || files.length > 0 || pendingImageUrls.length > 0);

  const openCorrectCategoryForm = (draft: AiImportDraftResult) => {
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
    saveAiListingDraft(ready);
    const href = `${paths.user.realEstateListing}?category=${encodeURIComponent(ready.category)}&ai=1&draftId=${encodeURIComponent(ready.id)}`;
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
      if (res.error) {
        setError(res.error);
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

      const shaped = aiDraftToInitialListing({ ...ready, imageUrls });
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
    openCorrectCategoryForm(mismatchDraft);
  };

  const startOverMismatch = () => {
    if (mismatchDraft?.sourcePrompt) setText(mismatchDraft.sourcePrompt);
    if (mismatchDraft?.imageUrls?.length) setPendingImageUrls(mismatchDraft.imageUrls);
    setMismatchDraft(null);
    setError(null);
    setSuccess(null);
  };

  return (
    <Stack spacing={1} component="form" onSubmit={handleAnalyze}>
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
              if (!loading && canSubmit) void handleAnalyze();
            }
          }}
          slotProps={{
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
              whiteSpace: inputExpanded ? 'pre-wrap' : 'nowrap',
              textOverflow: inputExpanded ? 'clip' : 'ellipsis',
              overflow: inputExpanded ? 'auto' : 'hidden !important',
            },
          }}
        />
        <IconButton
          type="submit"
          aria-label={loading ? t.aiImport.analyzing : t.aiImport.analyze}
          disabled={loading || !canSubmit}
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

'use client';

import * as React from 'react';
import { flushSync } from 'react-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Paperclip as PaperclipIcon } from '@phosphor-icons/react/dist/ssr/Paperclip';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { AiCategoryMismatchPanel } from '@/components/user/ai-category-mismatch-panel';
import { useCopy } from '@/hooks/use-copy';
import { useBottomSheetDismiss } from '@/hooks/use-bottom-sheet-dismiss';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { useUser } from '@/hooks/use-user';
import { useVisualViewportBox } from '@/hooks/use-visual-viewport';
import { useListingFormSnapshotRef } from '@/components/user/listing-form-snapshot-context';
import { aiDraftToInitialListing, mergeAiIntoListing } from '@/lib/ai-draft-to-listing';
import { listingFormHasUserProgress } from '@/lib/listing-form-draft';
import {
  acceptAiCategoryCorrection,
  aiDailyLimitMessage,
  filesToAiImagePayload,
  importListingsFromLinks,
  isAiCategoryMismatch,
  isAiContentRestricted,
  isAiDailyLimitError,
  mergeAttachedImageUrls,
  toAiListingDraft,
  type AiImportDraftResult,
} from '@/lib/ai-import-client';
import { saveAiListingDraft } from '@/lib/ai-listing-draft';
import { hostAiDraftImages } from '@/lib/ai-draft-post';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_MUTED,
  AI_SEARCH_BLUE_ON,
  AI_SEARCH_BLUE_SOFT,
} from '@/lib/home-categories';
import {
  POST_LISTING_AI_BAR_ID,
  POST_LISTING_AI_INPUT_ID,
  POST_LISTING_AI_OPEN_EVENT,
} from '@/lib/post-listing-ai-focus';
import { hardNavigate } from '@/lib/hard-navigate';
import { knownCreateDefaultsFromStorage } from '@/lib/listing-form-defaults';
import { paths } from '@/paths';
import { isOurStorageUrl, uploadListingImages } from '@/lib/uploads-client';
import type { ListingCategoryKey } from '@/types/listing-category';
import { MOTION } from '@/styles/motion';
import { productButtonSx, productFieldSx } from '@/styles/product-sx';

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
  const { user, checkSession } = useUser();
  const snapshotRef = useListingFormSnapshotRef();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [mismatchDraft, setMismatchDraft] = React.useState<AiImportDraftResult | null>(null);
  const [pendingImageUrls, setPendingImageUrls] = React.useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const viewport = useVisualViewportBox(drawerOpen);
  const keyboardOpen = viewport.insetBottom > 24;
  useLockBodyScroll(drawerOpen);

  const focusInput = React.useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      /* some input types reject setSelectionRange */
    }
  }, []);

  const openDrawer = React.useCallback(() => {
    flushSync(() => setDrawerOpen(true));
    focusInput();
  }, [focusInput]);

  const closeDrawer = React.useCallback(() => {
    setDrawerOpen(false);
    setError(null);
    setSuccess(null);
  }, []);

  const sheetDismiss = useBottomSheetDismiss(closeDrawer, drawerOpen);

  React.useEffect(() => {
    const onOpen = () => openDrawer();
    window.addEventListener(POST_LISTING_AI_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(POST_LISTING_AI_OPEN_EVENT, onOpen);
  }, [openDrawer]);

  React.useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const isEdit = mode === 'edit';
  const liveListing = currentListing ?? snapshotRef?.current ?? null;
  const hasLiveProgress = listingFormHasUserProgress(liveListing);
  const assistMode = isEdit || hasLiveProgress ? 'edit' : 'create';
  const placeholder = isEdit ? t.aiImport.editPlaceholder : t.aiImport.formPlaceholder;
  const appliedMsg = isEdit ? t.aiImport.editApplied : t.aiImport.formApplied;
  const buttonLabel = t.aiImport.editTitle;
  const drawerTitle = isEdit ? t.aiImport.editTitle : t.aiImport.formTitle;
  const drawerHint = isEdit ? t.aiImport.editHint : t.aiImport.formHint;
  const canSubmit = Boolean(text.trim() || files.length > 0 || pendingImageUrls.length > 0);
  const canAnalyze = canSubmit;

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
        mode: assistMode,
        feature: 'assist',
        currentListing: assistMode === 'edit' ? liveListing : null,
      });
      if (res.error) {
        if (isAiDailyLimitError({ code: res.code, error: res.error, status: res.status })) {
          setError(aiDailyLimitMessage(t));
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
      const payload = liveListing ? mergeAiIntoListing(liveListing, shaped) : shaped;

      onApply(payload);
      setSuccess(appliedMsg);
      setText('');
      setFiles([]);
      setPendingImageUrls([]);
      setMismatchDraft(null);
      setDrawerOpen(false);
    } catch {
      setError(t.aiImport.failed);
    } finally {
      setLoading(false);
      void checkSession();
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
    <>
      <Button
        id={POST_LISTING_AI_BAR_ID}
        type="button"
        onClick={openDrawer}
        startIcon={<SparkleIcon size={18} weight="fill" />}
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        sx={{
          ...productButtonSx,
          alignSelf: { xs: 'stretch', sm: 'flex-start' },
          minHeight: 44,
          px: 2,
          borderRadius: 999,
          bgcolor: AI_SEARCH_BLUE_MUTED,
          color: AI_SEARCH_BLUE,
          border: '1px solid',
          borderColor: AI_SEARCH_BLUE_SOFT,
          scrollMarginTop: 72,
          '& .MuiButton-startIcon': { mr: 0.75 },
          '&:hover': {
            bgcolor: AI_SEARCH_BLUE_SOFT,
            color: AI_SEARCH_BLUE_HOVER,
            boxShadow: 'none',
          },
        }}
      >
        {buttonLabel}
      </Button>

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={closeDrawer}
        disableAutoFocus
        disableScrollLock
        {...sheetDismiss.drawerProps}
        slotProps={{
          backdrop: {
            sx: {
              pointerEvents: 'auto',
              touchAction: 'none',
            },
          },
          paper: {
            ...sheetDismiss.paperSlotProps,
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight:
                viewport.height > 0 ? `${Math.round(viewport.height * 0.85)}px` : '85dvh',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              backgroundImage: 'none',
              // Sit on the visual viewport (keyboard), not the layout viewport.
              bottom: `${viewport.insetBottom}px`,
              pb: keyboardOpen ? 0 : 'env(safe-area-inset-bottom, 0px)',
              transition: drawerOpen
                ? `bottom ${MOTION.fast} linear, max-height ${MOTION.fast} linear`
                : undefined,
              // MUI Slide's transform makes iOS pin this layer to the visual
              // viewport and double-offset it above the keyboard.
              // Swipe-dismiss overrides this via inline `transform !important`.
              ...(drawerOpen ? { transform: 'none !important' } : null),
            },
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1, pb: 1.5 }}>
          <Box {...sheetDismiss.handleBind} sx={sheetDismiss.handleSx} />

          <Stack
            direction="row"
            sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.25, gap: 1 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.25 }}>
                {drawerTitle}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  mt: 0.25,
                  lineHeight: 1.35,
                  overflow: 'hidden',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {drawerHint}
              </Typography>
            </Box>
            <IconButton aria-label={t.common.close} onClick={closeDrawer} size="small" edge="end">
              <XIcon size={18} weight="bold" />
            </IconButton>
          </Stack>

          <Stack spacing={1} component="form" onSubmit={handleAnalyze}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => handleFilesPicked(e.target.files)}
            />

            <TextField
              fullWidth
              autoComplete="off"
              autoFocus
              multiline
              minRows={4}
              maxRows={8}
              value={text}
              inputRef={inputRef}
              onChange={(event) => setText(event.target.value)}
              placeholder={placeholder}
              disabled={loading}
              slotProps={{
                htmlInput: { id: POST_LISTING_AI_INPUT_ID },
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ pointerEvents: 'none' }}>
                      <IconButton
                        type="button"
                        size="small"
                        aria-label={t.aiImport.attachImages}
                        disabled={loading || files.length >= MAX_AI_IMAGES}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                          pointerEvents: 'auto',
                          width: 32,
                          height: 32,
                          color: files.length > 0 ? AI_SEARCH_BLUE : 'text.secondary',
                        }}
                      >
                        <PaperclipIcon size={18} weight="bold" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end" sx={{ pointerEvents: 'none' }}>
                      <IconButton
                        type="submit"
                        size="small"
                        aria-label={loading ? t.aiImport.analyzing : t.aiImport.analyze}
                        disabled={loading || !canAnalyze}
                        sx={{
                          pointerEvents: 'auto',
                          width: 32,
                          height: 32,
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
                          <CircularProgress size={16} sx={{ color: AI_SEARCH_BLUE_ON }} />
                        ) : (
                          <SparkleIcon size={16} weight="bold" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    alignItems: 'stretch',
                    position: 'relative',
                    pl: '14px',
                    pr: '14px',
                    '& textarea': {
                      resize: 'none',
                      lineHeight: 1.45,
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      pb: '36px',
                    },
                    '& .MuiInputAdornment-positionStart': {
                      position: 'absolute',
                      left: 8,
                      bottom: 8,
                      maxHeight: 'none',
                      height: 'auto',
                      margin: 0,
                    },
                    '& .MuiInputAdornment-positionEnd': {
                      position: 'absolute',
                      right: 8,
                      bottom: 8,
                      maxHeight: 'none',
                      height: 'auto',
                      margin: 0,
                    },
                  },
                },
              }}
              sx={[
                productFieldSx,
                {
                  '& .MuiOutlinedInput-root.Mui-focused': {
                    boxShadow: `0 0 0 3px ${AI_SEARCH_BLUE_MUTED}`,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: AI_SEARCH_BLUE,
                    },
                  },
                },
              ]}
            />

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
              />
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
        </Box>
      </Drawer>
    </>
  );
}

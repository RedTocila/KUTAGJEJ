'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CaretLeft as CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRight as CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { LinkSimple as LinkSimpleIcon } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { HomeVerticalIcon } from '@/components/public/home-vertical-icon';
import { PostListingFormSurface, PostListingHeader } from '@/components/user/post-listing-header';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import { useUser } from '@/hooks/use-user';
import {
  importListingsFromLinks,
  toAiListingDraft,
  type AiImportDraftResult,
} from '@/lib/ai-import-client';
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
import { postAiListingDraft, postAiListingDrafts } from '@/lib/ai-draft-post';
import { hardNavigate } from '@/lib/hard-navigate';
import { paths } from '@/paths';
import type { ListingCategoryKey } from '@/types/listing-category';

function toListingCategory(id: HomeVerticalId): ListingCategoryKey {
  return id === 'jobs' ? 'job-listings' : id;
}

function draftImageUrls(draft: AiImportDraftResult | AiListingDraft): string[] {
  return (draft.imageUrls ?? []).filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url));
}

export default function AiImportListingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { language } = useLanguage();
  const t = useCopy();
  const categories = React.useMemo(() => localizeHomeVerticals(language), [language]);
  const [category, setCategory] = React.useState<ListingCategoryKey | null>(null);
  const [text, setText] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<AiImportDraftResult[]>([]);
  const [preview, setPreview] = React.useState<{ urls: string[]; index: number } | null>(null);
  const [postingId, setPostingId] = React.useState<string | null>(null);
  const [postingAll, setPostingAll] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

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

  const handleAnalyze = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!category) {
      setError(t.aiImport.categoryRequired);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      setError(t.aiImport.empty);
      return;
    }
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await importListingsFromLinks({ text: trimmed, category });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (!res.drafts.length) {
        setError(t.aiImport.empty);
        return;
      }
      persistDrafts(res.drafts);
    } catch {
      setError(t.aiImport.failed);
    } finally {
      setLoading(false);
    }
  };

  const openDraft = (draft: AiImportDraftResult) => {
    const ready = toAiListingDraft(draft);
    if (!ready) return;
    saveAiListingDraft(ready);
    const href = `${paths.user.realEstateListing}?category=${encodeURIComponent(ready.category)}&ai=1&draftId=${encodeURIComponent(ready.id)}`;
    hardNavigate(href);
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
    const ready = toAiListingDraft(draft);
    if (!ready) {
      setError(t.aiImport.formEmpty);
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
            border: '1.5px solid',
            borderColor: AI_SEARCH_BLUE,
            bgcolor: 'background.paper',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 0 0 1px rgba(255, 187, 31, 0.08), 0 12px 32px -16px rgba(0,0,0,0.65)'
                : '0 12px 32px -18px rgba(255, 187, 31, 0.35)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: 3,
              bgcolor: AI_SEARCH_BLUE,
            }}
          />
          <Stack
            spacing={1.75}
            component="form"
            onSubmit={handleAnalyze}
            sx={{ p: { xs: 1.75, sm: 2.25 } }}
          >
            <Stack spacing={1.15}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.92rem' }}>
                {t.aiImport.chooseCategory}
              </Typography>
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
                  mx: { xs: -0.5, sm: 0 },
                  px: { xs: 0.5, sm: 0 },
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
                      spacing={0.45}
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
                          fontWeight: selected ? 800 : 600,
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
                <TextField
                  fullWidth
                  multiline
                  minRows={5}
                  maxRows={12}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={t.aiImport.placeholder}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2.5,
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'action.hover' : 'background.default',
                      color: 'text.primary',
                      '& fieldset': {
                        borderWidth: 1.5,
                        borderColor: 'divider',
                      },
                      '&:hover fieldset': {
                        borderColor: AI_SEARCH_BLUE,
                      },
                      '&.Mui-focused fieldset': {
                        borderWidth: 1.5,
                        borderColor: AI_SEARCH_BLUE,
                      },
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: '#9CA3AF',
                      opacity: 1,
                    },
                  }}
                />

                {error ? (
                  <Alert severity="error" sx={{ borderRadius: 2.5 }}>
                    {error}
                  </Alert>
                ) : null}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  fullWidth
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SparkleIcon size={18} weight="bold" />
                    )
                  }
                  sx={{
                    borderRadius: 2.5,
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
              </>
            ) : null}
          </Stack>
        </Box>
      </PostListingFormSurface>

      {drafts.length > 0 ? (
        <Stack spacing={1.5}>
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
            <Stack spacing={1} sx={{ flexShrink: 0, alignItems: 'stretch', minWidth: { xs: '100%', sm: 160 } }}>
              <Button
                variant="outlined"
                disabled={postingAll || postingId != null || drafts.length === 0}
                onClick={deleteAllDrafts}
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: 2.5,
                  borderColor: 'divider',
                  color: 'text.secondary',
                }}
              >
                {t.aiImport.deleteAll}
              </Button>
              <Button
                variant="contained"
                disabled={postingAll || postingId != null || readyDrafts.length === 0}
                onClick={() => void postAll()}
                startIcon={
                  postingAll ? <CircularProgress size={14} color="inherit" /> : undefined
                }
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: 2.5,
                  boxShadow: 'none',
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
            </Stack>
          </Stack>

          {statusMessage ? (
            <Alert severity="success" sx={{ borderRadius: 2.5 }}>
              {statusMessage}
            </Alert>
          ) : null}
          {drafts.map((draft) => {
            const failed = Boolean(draft.error) || !draft.category;
            const images = draftImageUrls(draft);
            return (
              <Box
                key={draft.id}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: failed ? 'error.light' : AI_SEARCH_BLUE,
                  bgcolor: failed ? 'error.light' : AI_SEARCH_BLUE_SOFT,
                }}
              >
                <Stack spacing={1.25}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ color: AI_SEARCH_BLUE, mt: 0.25 }}>
                      <LinkSimpleIcon size={18} />
                    </Box>
                    <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', flex: 1, minWidth: 0 }}>
                          {draft.title || categoryLabel(draft.category)}
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
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ wordBreak: 'break-all' }}
                      >
                        {draft.sourceUrl}
                      </Typography>
                      {draft.category ? (
                        <Typography variant="caption" sx={{ fontWeight: 700, color: AI_SEARCH_BLUE }}>
                          {categoryLabel(draft.category)}
                          {draft.cityName ? ` · ${draft.cityName}` : ''}
                        </Typography>
                      ) : null}
                      {draft.summary ? (
                        <Typography variant="body2" color="text.secondary">
                          {draft.summary}
                        </Typography>
                      ) : null}
                      {draft.warning ? (
                        <Alert severity="warning" sx={{ borderRadius: 2, py: 0 }}>
                          {draft.warning}
                        </Alert>
                      ) : null}
                      {draft.error ? (
                        <Alert severity="error" sx={{ borderRadius: 2, py: 0 }}>
                          {draft.error}
                        </Alert>
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
                            borderColor: AI_SEARCH_BLUE,
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
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : null}

                  {!failed ? (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        disabled={postingAll || postingId != null}
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
                          borderRadius: 2.5,
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
                        disabled={postingAll || postingId != null}
                        onClick={() => openDraft(draft)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 800,
                          borderRadius: 2.5,
                          borderColor: AI_SEARCH_BLUE,
                          color: AI_SEARCH_BLUE,
                          '&:hover': {
                            borderColor: AI_SEARCH_BLUE,
                            bgcolor: AI_SEARCH_BLUE_SOFT,
                          },
                        }}
                      >
                        {t.aiImport.openForm}
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : null}

      <Dialog
        open={Boolean(previewUrl)}
        onClose={() => setPreview(null)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#0b0b0b',
              backgroundImage: 'none',
              borderRadius: 3,
              overflow: 'hidden',
            },
          },
        }}
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
      </Dialog>
    </Stack>
  );
}

'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { Images as ImagesIcon } from '@phosphor-icons/react/dist/ssr/Images';
import { PaperPlaneTilt as PaperPlaneIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { useCopy } from '@/hooks/use-copy';
import { useUser } from '@/hooks/use-user';
import { aiDraftToInitialListing, mergeAiIntoListing } from '@/lib/ai-draft-to-listing';
import {
  filesToAiImagePayload,
  importListingsFromLinks,
  mergeAttachedImageUrls,
  toAiListingDraft,
} from '@/lib/ai-import-client';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_HOVER,
  AI_SEARCH_BLUE_MUTED,
  AI_SEARCH_BLUE_ON,
  AI_SEARCH_BLUE_SOFT,
} from '@/lib/home-categories';
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
  defaultOpen = false,
  variant = 'panel',
}: {
  category: ListingCategoryKey;
  onApply: (initial: Record<string, unknown>) => void;
  mode?: 'create' | 'edit';
  currentListing?: Record<string, unknown> | null;
  defaultOpen?: boolean;
  /** `composer` = always-visible input with attach + send (owner edit). */
  variant?: 'panel' | 'composer';
}) {
  const t = useCopy();
  const { user } = useUser();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isComposer = variant === 'composer';
  const [open, setOpen] = React.useState(defaultOpen || isComposer);
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const isEdit = mode === 'edit';
  const title = isEdit ? t.aiImport.editTitle : t.aiImport.formTitle;
  const hint = isEdit ? t.aiImport.editHint : t.aiImport.formHint;
  const placeholder = isEdit ? t.aiImport.editPlaceholder : t.aiImport.formPlaceholder;
  const appliedMsg = isEdit ? t.aiImport.editApplied : t.aiImport.formApplied;

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

  const handleAnalyze = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) {
      setError(t.aiImport.empty);
      setSuccess(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const imagePayload = await filesToAiImagePayload(files);
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
        res.drafts.find((d) => d.category === category && !d.error) ??
        res.drafts.find((d) => !d.error && d.category);

      if (!match) {
        setError(t.aiImport.formEmpty);
        return;
      }

      if (match.category !== category) {
        setError(t.aiImport.formWrongCategory);
        return;
      }

      const ready = toAiListingDraft(match);
      if (!ready) {
        setError(t.aiImport.formEmpty);
        return;
      }

      let imageUrls = ready.imageUrls ?? [];
      if (files.length > 0) {
        const up = await uploadListingImages(files, UPLOAD_FOLDER[category]);
        if (up.error) {
          setError(up.error);
          return;
        }
        imageUrls = mergeAttachedImageUrls({
          remoteUrls: ready.imageUrls ?? [],
          uploadedUrls: up.urls,
          roles: ready.imageRoles,
          max: category === 'professionals' ? 2 : 8,
        });
      }

      const shaped = aiDraftToInitialListing({ ...ready, imageUrls });
      const payload =
        isEdit && currentListing ? mergeAiIntoListing(currentListing, shaped) : shaped;

      onApply(payload);
      setSuccess(appliedMsg);
      setText('');
      setFiles([]);
      if (!isComposer) setOpen(false);
    } catch {
      setError(t.aiImport.failed);
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      bgcolor: AI_SEARCH_BLUE_SOFT,
      color: 'text.primary',
      pr: 0.75,
      '& fieldset': {
        borderWidth: 1.5,
        borderColor: AI_SEARCH_BLUE,
      },
      '&:hover fieldset': {
        borderColor: AI_SEARCH_BLUE,
      },
      '&.Mui-focused fieldset': {
        borderWidth: 1.5,
        borderColor: AI_SEARCH_BLUE,
      },
      '&.Mui-focused': {
        bgcolor: AI_SEARCH_BLUE_SOFT,
      },
    },
    '& .MuiInputBase-input': {
      color: 'text.primary',
    },
    '& .MuiInputBase-input::placeholder': {
      color: '#9CA3AF',
      opacity: 1,
    },
  } as const;

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      hidden
      onChange={(e) => handleFilesPicked(e.target.files)}
    />
  );

  const previewRow =
    previews.length > 0 ? (
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
              border: '1.5px solid',
              borderColor: AI_SEARCH_BLUE,
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
    ) : null;

  if (isComposer) {
    return (
      <Stack spacing={1} component="form" onSubmit={handleAnalyze}>
        {fileInput}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            p: 1,
            borderRadius: 2.5,
            border: '1.5px solid',
            borderColor: AI_SEARCH_BLUE,
            bgcolor: AI_SEARCH_BLUE_SOFT,
          }}
        >
          <IconButton
            type="button"
            size="small"
            aria-label={t.aiImport.attachImages}
            disabled={loading || files.length >= MAX_AI_IMAGES}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              flexShrink: 0,
              color: AI_SEARCH_BLUE,
              border: '1px solid',
              borderColor: AI_SEARCH_BLUE,
              borderRadius: 2,
              width: 38,
              height: 38,
              mb: 0.15,
            }}
          >
            <ImagesIcon size={18} weight="bold" />
          </IconButton>

          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={placeholder}
            disabled={loading}
            variant="standard"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (!loading) void handleAnalyze();
              }
            }}
            sx={{
              '& .MuiInputBase-root': {
                color: 'text.primary',
                fontSize: '0.95rem',
                py: 0.75,
                '&:before, &:after': { display: 'none' },
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#9CA3AF',
                opacity: 1,
              },
            }}
          />

          <IconButton
            type="submit"
            size="small"
            aria-label={loading ? t.aiImport.analyzing : t.aiImport.analyze}
            disabled={loading || (!text.trim() && files.length === 0)}
            sx={{
              flexShrink: 0,
              bgcolor: AI_SEARCH_BLUE,
              color: AI_SEARCH_BLUE_ON,
              borderRadius: 2,
              width: 38,
              height: 38,
              mb: 0.15,
              '&:hover': { bgcolor: AI_SEARCH_BLUE_HOVER },
              '&.Mui-disabled': {
                bgcolor: AI_SEARCH_BLUE,
                color: AI_SEARCH_BLUE_ON,
                opacity: 0.45,
              },
            }}
          >
            {loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PaperPlaneIcon size={18} weight="fill" />
            )}
          </IconButton>
        </Box>
        {previewRow}
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

  return (
    <Box
      sx={{
        borderRadius: 2.75,
        border: '1.5px solid',
        borderColor: AI_SEARCH_BLUE,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? AI_SEARCH_BLUE_MUTED : AI_SEARCH_BLUE_SOFT,
        overflow: 'hidden',
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.25,
          width: '100%',
          px: { xs: 1.75, sm: 2.25 },
          py: { xs: 1.75, sm: 2 },
          border: 0,
          bgcolor: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          textAlign: 'left',
          '&:hover': {
            bgcolor: AI_SEARCH_BLUE_MUTED,
          },
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2.25,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            bgcolor: AI_SEARCH_BLUE_SOFT,
            color: AI_SEARCH_BLUE,
          }}
        >
          <SparkleIcon size={18} weight="duotone" />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1, pt: 0.15 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.35, lineHeight: 1.4, color: '#9CA3AF' }}>
            {hint}
          </Typography>
        </Box>

        <Box
          sx={{
            mt: 0.5,
            color: AI_SEARCH_BLUE,
            display: 'inline-flex',
            transition: 'transform 0.18s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          <CaretDownIcon size={18} weight="bold" />
        </Box>
      </Box>

      <Collapse in={open} unmountOnExit>
        <Box
          component="form"
          onSubmit={handleAnalyze}
          sx={{ px: { xs: 1.75, sm: 2.25 }, pb: { xs: 1.75, sm: 2.25 } }}
        >
          <Stack spacing={1.5}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={placeholder}
              sx={fieldSx}
            />

            {fileInput}

            <Stack spacing={1}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<ImagesIcon size={18} weight="bold" />}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || files.length >= MAX_AI_IMAGES}
                sx={{
                  alignSelf: 'flex-start',
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 2.5,
                  borderColor: AI_SEARCH_BLUE,
                  color: AI_SEARCH_BLUE,
                  '&:hover': {
                    borderColor: AI_SEARCH_BLUE_HOVER,
                    bgcolor: AI_SEARCH_BLUE_MUTED,
                  },
                }}
              >
                {t.aiImport.attachImages}
                {files.length > 0 ? ` (${files.length}/${MAX_AI_IMAGES})` : ''}
              </Button>
              <Typography variant="caption" sx={{ color: '#9CA3AF', lineHeight: 1.35 }}>
                {t.aiImport.attachHint}
              </Typography>

              {previewRow}
            </Stack>

            {error ? (
              <Alert severity="error" sx={{ borderRadius: 2.5, py: 0 }}>
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
                py: 1.2,
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
          </Stack>
        </Box>
      </Collapse>

      {success && !open ? (
        <Box sx={{ px: { xs: 1.75, sm: 2.25 }, pb: { xs: 1.5, sm: 1.75 } }}>
          <Alert severity="success" sx={{ borderRadius: 2.5, py: 0 }}>
            {success}
          </Alert>
        </Box>
      ) : null}
    </Box>
  );
}

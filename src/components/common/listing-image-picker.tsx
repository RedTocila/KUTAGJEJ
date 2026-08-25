'use client';

import * as React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { ImageLightbox, useObjectUrls } from '@/components/common/image-lightbox';

const GRID_THUMB_SX = {
  position: 'relative',
  width: 96,
  height: 80,
  borderRadius: 1.5,
  overflow: 'hidden',
  border: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
} as const;

const HERO_THUMB_SX = {
  position: 'relative',
  width: 148,
  height: 148,
  borderRadius: 3,
  overflow: 'hidden',
  border: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
} as const;

const GALLERY_THUMB_SX = {
  position: 'relative',
  boxSizing: 'border-box',
  width: '100%',
  aspectRatio: '5 / 4',
  borderRadius: 1.5,
  overflow: 'hidden',
} as const;

const removeButtonSx = {
  position: 'absolute',
  top: 6,
  right: 6,
  bgcolor: 'rgba(0,0,0,0.55)',
  color: '#fff',
  p: 0.35,
  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
} as const;

const emptyHoverSx = {
  '&:hover:not(:disabled)': {
    borderColor: 'primary.main',
    color: 'primary.main',
    bgcolor: (t: { palette: { mode: string } }) =>
      t.palette.mode === 'dark' ? 'rgba(130, 201, 30, 0.08)' : 'rgba(118, 186, 27, 0.06)',
  },
} as const;

function ThumbPreview({
  src,
  alt,
  onRemove,
  onPreview,
  sx = GRID_THUMB_SX,
}: {
  src: string;
  alt?: string;
  onRemove: () => void;
  onPreview: () => void;
  sx?: typeof GRID_THUMB_SX | typeof HERO_THUMB_SX;
}) {
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label="Shiko foton"
      onClick={onPreview}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPreview();
        }
      }}
      sx={{ ...sx, cursor: 'zoom-in' }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ''}
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
      <IconButton
        size="small"
        type="button"
        aria-label="Hiq foton"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove();
        }}
        sx={removeButtonSx}
      >
        <XIcon size={12} weight="bold" />
      </IconButton>
    </Box>
  );
}

function EmptyAddButton({
  onClick,
  plusSize,
  disabled,
  sx,
  ariaLabel = 'Shto foto',
}: {
  onClick: () => void;
  plusSize: number;
  disabled?: boolean;
  ariaLabel?: string;
  sx: object;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px dashed',
        borderColor: 'divider',
        bgcolor: 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        color: 'text.secondary',
        p: 0,
        font: 'inherit',
        transition: 'border-color 0.15s, color 0.15s, background-color 0.15s',
        ...emptyHoverSx,
        ...sx,
      }}
    >
      <PlusIcon size={plusSize} weight="bold" />
    </Box>
  );
}

export interface ListingImagePickerProps {
  value: File[];
  onChange: (files: File[]) => void;
  /** Already-uploaded image URLs (edit mode). */
  existingUrls?: string[];
  onExistingUrlsChange?: (urls: string[]) => void;
  max?: number;
  label?: string;
  disabled?: boolean;
  /**
   * `grid` — equal thumbs (single-photo uses this). Multi-photo listing forms
   * render as `gallery` automatically.
   * `hero` — centered large square, e.g. product / menu item photo.
   * `gallery` — large cover, extra photos wrap below (no slider).
   */
  variant?: 'grid' | 'hero' | 'gallery';
}

/**
 * Reusable image picker for listing forms. Holds the selected `File[]` in the
 * parent via value/onChange; the parent uploads them (e.g. via
 * `uploadListingImages`) on submit.
 */
export function ListingImagePicker({
  value,
  onChange,
  existingUrls = [],
  onExistingUrlsChange,
  max = 5,
  label = 'Foto',
  disabled = false,
  variant = 'grid',
}: ListingImagePickerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const total = existingUrls.length + value.length;
  const slotsLeft = Math.max(0, max - total);
  const isHero = variant === 'hero';
  const isGallery = variant === 'gallery' || (variant === 'grid' && max > 1);
  const thumbSx = isHero ? HERO_THUMB_SX : GRID_THUMB_SX;
  const fileUrls = useObjectUrls(value);
  const previewUrls = React.useMemo(() => [...existingUrls, ...fileUrls], [existingUrls, fileUrls]);
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (previewIndex == null) return;
    if (previewUrls.length === 0) {
      setPreviewIndex(null);
      return;
    }
    if (previewIndex >= previewUrls.length) {
      setPreviewIndex(previewUrls.length - 1);
    }
  }, [previewIndex, previewUrls.length]);

  const openPicker = () => {
    if (disabled || slotsLeft <= 0) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(ev.target.files ?? []);
    if (!picked.length) return;
    const next = [...value, ...picked].slice(0, slotsLeft + value.length);
    onChange(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const removeExisting = (index: number) => {
    onExistingUrlsChange?.(existingUrls.filter((_, i) => i !== index));
  };

  const removeAt = (index: number) => {
    if (index < existingUrls.length) {
      removeExisting(index);
    } else {
      removeImage(index - existingUrls.length);
    }
  };

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple={max > 1}
      style={{ display: 'none' }}
      onChange={handleFileChange}
    />
  );

  const lightbox = (
    <ImageLightbox
      open={previewIndex != null}
      urls={previewUrls}
      index={previewIndex ?? 0}
      onClose={() => setPreviewIndex(null)}
      onIndexChange={setPreviewIndex}
    />
  );

  const countLabel = (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'baseline', justifyContent: isHero ? 'center' : 'flex-start' }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {total} / {max}
      </Typography>
    </Stack>
  );

  if (isGallery) {
    const coverSrc = previewUrls[0] ?? '';
    const extraUrls = previewUrls.slice(1);
    const showAddSlot = slotsLeft > 0 && !disabled && previewUrls.length > 0;

    return (
      <Stack spacing={1.25}>
        {countLabel}
        {fileInput}

        {previewUrls.length === 0 ? (
          <EmptyAddButton
            onClick={openPicker}
            plusSize={40}
            disabled={disabled}
            sx={{
              width: '100%',
              aspectRatio: '16 / 10',
              maxHeight: { xs: 240, sm: 300 },
              borderRadius: 1.5,
            }}
          />
        ) : (
          <Box
            role="button"
            tabIndex={0}
            aria-label="Shiko foton e kopertinës"
            onClick={() => setPreviewIndex(0)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setPreviewIndex(0);
              }
            }}
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 10',
              maxHeight: { xs: 240, sm: 300 },
              borderRadius: 1.5,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              cursor: 'zoom-in',
              bgcolor: 'background.paper',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverSrc}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <IconButton
              size="small"
              type="button"
              aria-label="Hiq foton e kopertinës"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                removeAt(0);
              }}
              sx={removeButtonSx}
            >
              <XIcon size={12} weight="bold" />
            </IconButton>
          </Box>
        )}

        {previewUrls.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 1.25,
              width: '100%',
            }}
          >
            {extraUrls.map((url, extraIdx) => {
              const idx = extraIdx + 1;
              return (
                <Box
                  key={`extra-${idx}-${url}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Fotoja ${idx + 1}`}
                  onClick={() => setPreviewIndex(idx)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setPreviewIndex(idx);
                    }
                  }}
                  sx={{
                    ...GALLERY_THUMB_SX,
                    p: 0,
                    font: 'inherit',
                    cursor: 'zoom-in',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'transparent',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    referrerPolicy="no-referrer"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <IconButton
                    size="small"
                    type="button"
                    aria-label={`Hiq foton ${idx + 1}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      removeAt(idx);
                    }}
                    sx={{ ...removeButtonSx, top: 2, right: 2, p: 0.2 }}
                  >
                    <XIcon size={10} weight="bold" />
                  </IconButton>
                </Box>
              );
            })}
            {showAddSlot ? (
              <EmptyAddButton
                onClick={openPicker}
                plusSize={22}
                disabled={disabled}
                sx={GALLERY_THUMB_SX}
              />
            ) : null}
          </Box>
        ) : null}

        {lightbox}
      </Stack>
    );
  }

  return (
    <Stack spacing={isHero ? 1.25 : 1.5} sx={isHero ? { alignItems: 'center', textAlign: 'center' } : undefined}>
      {countLabel}
      {fileInput}

      <Stack
        direction="row"
        sx={{
          flexWrap: 'wrap',
          gap: 1.5,
          justifyContent: isHero ? 'center' : 'flex-start',
          width: isHero ? '100%' : undefined,
        }}
      >
        {existingUrls.map((url, idx) => (
          <ThumbPreview
            key={`url-${url}-${idx}`}
            src={url}
            sx={thumbSx}
            onPreview={() => setPreviewIndex(idx)}
            onRemove={() => {
              removeExisting(idx);
            }}
          />
        ))}
        {value.map((img, idx) => (
          <ThumbPreview
            key={`${img.name}-${idx}`}
            src={fileUrls[idx] ?? ''}
            alt={img.name}
            sx={thumbSx}
            onPreview={() => setPreviewIndex(existingUrls.length + idx)}
            onRemove={() => {
              removeImage(idx);
            }}
          />
        ))}
        {slotsLeft > 0 && !disabled ? (
          <EmptyAddButton
            onClick={openPicker}
            plusSize={isHero ? 36 : 28}
            sx={{
              ...thumbSx,
              bgcolor: isHero ? 'action.hover' : 'transparent',
            }}
          />
        ) : null}
      </Stack>

      {lightbox}
    </Stack>
  );
}

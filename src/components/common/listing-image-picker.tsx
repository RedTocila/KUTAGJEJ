'use client';

import * as React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { ArrowDown as ArrowDownIcon } from '@phosphor-icons/react/dist/ssr/ArrowDown';
import { ArrowUp as ArrowUpIcon } from '@phosphor-icons/react/dist/ssr/ArrowUp';
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

const AVATAR_THUMB_SX = {
  position: 'relative',
  width: 120,
  height: 120,
  borderRadius: '50%',
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

type ThumbSx = typeof GRID_THUMB_SX | typeof HERO_THUMB_SX | typeof AVATAR_THUMB_SX;

const removeButtonBaseSx = {
  position: 'absolute',
  zIndex: 2,
  bgcolor: 'rgba(0,0,0,0.62)',
  color: '#fff',
  p: 0,
  touchAction: 'manipulation',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.82)' },
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: -8,
  },
} as const;

const coverRemoveButtonSx = {
  ...removeButtonBaseSx,
  top: 8,
  right: 8,
  width: 40,
  height: 40,
  minWidth: 40,
} as const;

const thumbRemoveButtonSx = {
  ...removeButtonBaseSx,
  top: 4,
  right: 4,
  width: 32,
  height: 32,
  minWidth: 32,
} as const;

const emptyHoverSx = {
  '&:hover:not(:disabled)': {
    borderColor: 'primary.main',
    color: 'primary.main',
    bgcolor: (t: { palette: { mode: string } }) =>
      t.palette.mode === 'dark' ? 'rgba(130, 201, 30, 0.08)' : 'rgba(118, 186, 27, 0.06)',
  },
} as const;

function RemoveImageButton({ label, onRemove, cover }: { label: string; onRemove: () => void; cover?: boolean }) {
  return (
    <IconButton
      size="small"
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRemove();
      }}
      sx={cover ? coverRemoveButtonSx : thumbRemoveButtonSx}
    >
      <XIcon size={cover ? 20 : 16} weight="bold" />
    </IconButton>
  );
}

function MoveImageButtons({
  index,
  count,
  onMove,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
}) {
  if (count < 2) return null;

  const buttonSx = {
    bgcolor: 'rgba(0,0,0,0.62)',
    color: '#fff',
    p: 0,
    width: 26,
    height: 26,
    '&:hover': { bgcolor: 'rgba(0,0,0,0.82)' },
  } as const;

  return (
    <Stack
      direction="row"
      spacing={0.25}
      sx={{
        position: 'absolute',
        zIndex: 2,
        left: 4,
        bottom: 4,
      }}
    >
      <IconButton
        size="small"
        type="button"
        disabled={index === 0}
        aria-label={`Zhvendos foton ${index + 1} lart`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onMove(index, index - 1);
        }}
        sx={buttonSx}
      >
        <ArrowUpIcon size={14} weight="bold" />
      </IconButton>
      <IconButton
        size="small"
        type="button"
        disabled={index === count - 1}
        aria-label={`Zhvendos foton ${index + 1} poshtë`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onMove(index, index + 1);
        }}
        sx={buttonSx}
      >
        <ArrowDownIcon size={14} weight="bold" />
      </IconButton>
    </Stack>
  );
}

function ThumbPreview({
  src,
  alt,
  onRemove,
  onPreview,
  move,
  dragHandlers,
  dropActive = false,
  sx = GRID_THUMB_SX,
}: {
  src: string;
  alt?: string;
  onRemove: () => void;
  onPreview: () => void;
  move?: {
    index: number;
    count: number;
    onMove: (from: number, to: number) => void;
  };
  dragHandlers?: React.HTMLAttributes<HTMLDivElement>;
  dropActive?: boolean;
  sx?: ThumbSx;
}) {
  return (
    <Box
      {...dragHandlers}
      sx={{
        position: 'relative',
        width: sx.width,
        height: sx.height,
        flexShrink: 0,
        outline: dropActive ? '2px solid' : 'none',
        outlineColor: 'primary.main',
        borderRadius: sx.borderRadius,
      }}
    >
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
        sx={{ ...sx, width: '100%', height: '100%', cursor: 'zoom-in' }}
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
      </Box>
      <RemoveImageButton label="Hiq foton" onRemove={onRemove} />
      {move ? <MoveImageButtons {...move} /> : null}
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
   * `gallery` — large cover (16:10), extra photos wrap below (no slider).
   * `avatar` — circular profile photo.
   */
  variant?: 'grid' | 'hero' | 'gallery' | 'avatar';
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
  const isAvatar = variant === 'avatar';
  const isGallery = variant === 'gallery' || (variant === 'grid' && max > 1);
  const thumbSx: ThumbSx = isAvatar ? AVATAR_THUMB_SX : isHero ? HERO_THUMB_SX : GRID_THUMB_SX;
  const fileUrls = useObjectUrls(value);
  const previewUrls = React.useMemo(() => [...existingUrls, ...fileUrls], [existingUrls, fileUrls]);
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null);
  const [draggedExistingIndex, setDraggedExistingIndex] = React.useState<number | null>(null);
  const [dragOverExistingIndex, setDragOverExistingIndex] = React.useState<number | null>(null);

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

  const reorderExisting = (from: number, to: number) => {
    if (
      !onExistingUrlsChange ||
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= existingUrls.length ||
      to >= existingUrls.length
    ) {
      return;
    }
    const next = [...existingUrls];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    onExistingUrlsChange(next);
  };

  const existingDragHandlers = (index: number) => ({
    draggable: !disabled && Boolean(onExistingUrlsChange) && existingUrls.length > 1,
    onDragStart: (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled || !onExistingUrlsChange || existingUrls.length < 2) return;
      setDraggedExistingIndex(index);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    },
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => {
      if (draggedExistingIndex == null || draggedExistingIndex === index) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDragOverExistingIndex(index);
    },
    onDrop: (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (draggedExistingIndex != null) reorderExisting(draggedExistingIndex, index);
      setDraggedExistingIndex(null);
      setDragOverExistingIndex(null);
    },
    onDragEnd: () => {
      setDraggedExistingIndex(null);
      setDragOverExistingIndex(null);
    },
  });

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
  const reorderHint =
    existingUrls.length > 1 ? (
      <Typography variant="caption" color="text.secondary">
        Tërhiqni fotot për t’i riorganizuar.
      </Typography>
    ) : null;

  if (isGallery) {
    const coverSrc = previewUrls[0] ?? '';
    const extraUrls = previewUrls.slice(1);
    const showAddSlot = slotsLeft > 0 && !disabled && previewUrls.length > 0;

    return (
      <Stack spacing={1.25}>
        {countLabel}
        {reorderHint}
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
            {...existingDragHandlers(0)}
            sx={{
              position: 'relative',
              width: '100%',
              borderRadius: 1.5,
              outline: dragOverExistingIndex === 0 ? '2px solid' : 'none',
              outlineColor: 'primary.main',
            }}
          >
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
            </Box>
            <RemoveImageButton cover label="Hiq foton e kopertinës" onRemove={() => removeAt(0)} />
            <MoveImageButtons index={0} count={existingUrls.length} onMove={reorderExisting} />
          </Box>
        )}

        {previewUrls.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 1.25,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            {extraUrls.map((url, extraIdx) => {
              const idx = extraIdx + 1;
              return (
                <Box
                  key={`extra-${idx}-${url}`}
                  {...existingDragHandlers(idx)}
                  sx={{
                    position: 'relative',
                    minWidth: 0,
                    borderRadius: 1.5,
                    outline: dragOverExistingIndex === idx ? '2px solid' : 'none',
                    outlineColor: 'primary.main',
                  }}
                >
                  <Box
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
                  </Box>
                  <RemoveImageButton label={`Hiq foton ${idx + 1}`} onRemove={() => removeAt(idx)} />
                  <MoveImageButtons index={idx} count={existingUrls.length} onMove={reorderExisting} />
                </Box>
              );
            })}
            {showAddSlot ? (
              <EmptyAddButton onClick={openPicker} plusSize={22} disabled={disabled} sx={GALLERY_THUMB_SX} />
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
      {reorderHint}
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
            dragHandlers={existingDragHandlers(idx)}
            dropActive={dragOverExistingIndex === idx}
            move={{
              index: idx,
              count: existingUrls.length,
              onMove: reorderExisting,
            }}
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
            plusSize={isHero || isAvatar ? 36 : 28}
            sx={{
              ...thumbSx,
              bgcolor: isHero || isAvatar ? 'action.hover' : 'transparent',
            }}
          />
        ) : null}
      </Stack>

      {lightbox}
    </Stack>
  );
}

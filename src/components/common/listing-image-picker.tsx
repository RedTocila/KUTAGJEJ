'use client';

import * as React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

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

const removeButtonSx = {
  position: 'absolute',
  top: 6,
  right: 6,
  bgcolor: 'rgba(0,0,0,0.55)',
  color: '#fff',
  p: 0.35,
  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
} as const;

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
  sx?: typeof GRID_THUMB_SX | typeof HERO_THUMB_SX;
}

function ImagePreview({ file, onRemove, sx = GRID_THUMB_SX }: ImagePreviewProps) {
  const [src, setSrc] = React.useState<string>('');

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <Box sx={sx}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={file.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
      <IconButton size="small" onClick={onRemove} sx={removeButtonSx}>
        <XIcon size={12} weight="bold" />
      </IconButton>
    </Box>
  );
}

function UrlPreview({
  url,
  onRemove,
  sx = GRID_THUMB_SX,
}: {
  url: string;
  onRemove: () => void;
  sx?: typeof GRID_THUMB_SX | typeof HERO_THUMB_SX;
}) {
  return (
    <Box sx={sx}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <IconButton size="small" onClick={onRemove} sx={removeButtonSx}>
        <XIcon size={12} weight="bold" />
      </IconButton>
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
  /** Centered large square — product / menu item photo. */
  variant?: 'grid' | 'hero';
}

/**
 * Reusable image picker for listing forms. Holds the selected `File[]` in the
 * parent via value/onChange; the parent uploads them (e.g. via
 * `uploadListingImages`) on submit. Mirrors the car form's photo UI.
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
  const thumbSx = isHero ? HERO_THUMB_SX : GRID_THUMB_SX;

  const handleFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(ev.target.files ?? []);
    if (!picked.length) return;
    onChange([...value, ...picked].slice(0, slotsLeft + value.length));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const removeExisting = (index: number) => {
    onExistingUrlsChange?.(existingUrls.filter((_, i) => i !== index));
  };

  return (
    <Stack spacing={isHero ? 1.25 : 1.5} sx={isHero ? { alignItems: 'center', textAlign: 'center' } : undefined}>
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

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
          <UrlPreview
            key={`url-${url}-${idx}`}
            url={url}
            sx={thumbSx}
            onRemove={() => {
              removeExisting(idx);
            }}
          />
        ))}
        {value.map((img, idx) => (
          <ImagePreview
            key={`${img.name}-${idx}`}
            file={img}
            sx={thumbSx}
            onRemove={() => {
              removeImage(idx);
            }}
          />
        ))}
        {slotsLeft > 0 && !disabled ? (
          <Box
            component="button"
            type="button"
            aria-label="Shto foto"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            sx={{
              ...thumbSx,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              borderStyle: 'dashed',
              borderWidth: 2,
              bgcolor: isHero ? 'action.hover' : 'transparent',
              cursor: 'pointer',
              color: 'text.secondary',
              p: 0,
              font: 'inherit',
              transition: 'border-color 0.15s, color 0.15s, background-color 0.15s',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
                bgcolor: (t) =>
                  t.palette.mode === 'dark' ? 'rgba(130, 201, 30, 0.08)' : 'rgba(118, 186, 27, 0.06)',
              },
            }}
          >
            <PlusIcon size={isHero ? 36 : 28} weight="bold" />
          </Box>
        ) : null}
      </Stack>

      {slotsLeft > 0 && !disabled ? (
        <Typography variant="caption" color="text.disabled">
          {max === 1 ? '1 foto · JPG, PNG, WEBP' : `Deri në ${max} foto · JPG, PNG, WEBP`}
        </Typography>
      ) : null}
    </Stack>
  );
}

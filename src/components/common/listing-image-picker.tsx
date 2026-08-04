'use client';

import * as React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

const THUMB_SX = {
  position: 'relative',
  width: 96,
  height: 80,
  borderRadius: 1.5,
  overflow: 'hidden',
  border: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
} as const;

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
}

function ImagePreview({ file, onRemove }: ImagePreviewProps) {
  const [src, setSrc] = React.useState<string>('');

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <Box sx={THUMB_SX}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={file.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          bgcolor: 'rgba(0,0,0,0.55)',
          color: '#fff',
          p: 0.25,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
        }}
      >
        <XIcon size={12} weight="bold" />
      </IconButton>
    </Box>
  );
}

function UrlPreview({ url, onRemove }: { url: string; onRemove: () => void }) {
  return (
    <Box sx={THUMB_SX}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          bgcolor: 'rgba(0,0,0,0.55)',
          color: '#fff',
          p: 0.25,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
        }}
      >
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
}: ListingImagePickerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const total = existingUrls.length + value.length;
  const slotsLeft = Math.max(0, max - total);

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
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
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

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
        {existingUrls.map((url, idx) => (
          <UrlPreview
            key={`url-${url}-${idx}`}
            url={url}
            onRemove={() => {
              removeExisting(idx);
            }}
          />
        ))}
        {value.map((img, idx) => (
          <ImagePreview
            key={`${img.name}-${idx}`}
            file={img}
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
              ...THUMB_SX,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderStyle: 'dashed',
              borderWidth: 2,
              bgcolor: 'transparent',
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
            <PlusIcon size={28} weight="bold" />
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

'use client';

import * as React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';

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
    <Box
      sx={{
        position: 'relative',
        width: 96,
        height: 80,
        borderRadius: 1.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
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

export interface ListingImagePickerProps {
  value: File[];
  onChange: (files: File[]) => void;
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
  max = 5,
  label = 'Foto',
  disabled = false,
}: ListingImagePickerProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(ev.target.files ?? []);
    if (!picked.length) return;
    onChange([...value, ...picked].slice(0, max));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {value.length} / {max}
        </Typography>
      </Stack>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {value.length > 0 ? (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
          {value.map((img, idx) => (
            <ImagePreview
              key={`${img.name}-${idx}`}
              file={img}
              onRemove={() => {
                removeImage(idx);
              }}
            />
          ))}
        </Stack>
      ) : null}

      {value.length < max && !disabled ? (
        <Box
          onClick={() => {
            fileInputRef.current?.click();
          }}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            p: 3,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            cursor: 'pointer',
            color: 'text.secondary',
            transition: 'border-color 0.15s, color 0.15s',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
            },
          }}
        >
          <ImageIcon size={32} />
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            Kliko për të shtuar foto
            <br />
            <Typography component="span" variant="caption" color="text.disabled">
              Deri në {max} foto · JPG, PNG, WEBP
            </Typography>
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}

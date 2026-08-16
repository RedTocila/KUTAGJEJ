'use client';

import * as React from 'react';
import { Box, ButtonBase, IconButton, Stack, Typography } from '@mui/material';
import { Camera as CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { ImageLightbox } from '@/components/common/image-lightbox';
import { primaryMainAlpha } from '@/lib/css-var-alpha';

function useObjectUrl(file: File | null): string | null {
  const [src, setSrc] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!file) {
      setSrc(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return src;
}

function PhotoSlot({
  label,
  hint,
  previewUrl,
  active,
  aspect,
  round,
  emptyIcon,
  onPick,
  onClear,
  onPreview,
}: {
  label: string;
  hint: string;
  previewUrl: string | null;
  active?: boolean;
  aspect?: string;
  round?: boolean;
  emptyIcon: React.ReactNode;
  onPick: () => void;
  onClear: () => void;
  onPreview?: () => void;
}) {
  return (
    <Stack
      spacing={1}
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        border: '1.5px solid',
        borderColor: active ? 'primary.main' : 'divider',
        bgcolor: active ? primaryMainAlpha(0.06) : 'background.paper',
        boxShadow: active ? `inset 0 0 0 1px ${primaryMainAlpha(0.12)}` : 'none',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      <Stack spacing={0.25}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.35 }}>{hint}</Typography>
      </Stack>

      <Box
        sx={{
          position: 'relative',
          width: round ? 120 : '100%',
          alignSelf: round ? 'center' : 'stretch',
          overflow: 'visible',
          isolation: 'isolate',
        }}
      >
        <ButtonBase
          onClick={() => {
            if (previewUrl) onPreview?.();
            else onPick();
          }}
          sx={{
            display: 'block',
            width: '100%',
            aspectRatio: round ? '1 / 1' : aspect || '2 / 1',
            borderRadius: round ? '50%' : 2,
            overflow: 'hidden',
            border: '1px dashed',
            borderColor: previewUrl ? 'transparent' : 'divider',
            bgcolor: 'action.hover',
            position: 'relative',
            zIndex: 0,
            cursor: previewUrl ? 'zoom-in' : 'pointer',
          }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
            />
          ) : (
            <Stack
              spacing={0.75}
              sx={{
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.secondary',
                px: 1,
              }}
            >
              {emptyIcon}
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Zgjidh foto</Typography>
            </Stack>
          )}
        </ButtonBase>

        {previewUrl ? (
          <Stack
            direction="row"
            sx={{
              position: 'absolute',
              top: 4,
              left: 4,
              right: 4,
              zIndex: 2,
              justifyContent: 'space-between',
              pointerEvents: 'none',
            }}
          >
            <IconButton
              size="small"
              aria-label={`Ndrysho ${label}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPick();
              }}
              sx={{
                pointerEvents: 'auto',
                bgcolor: 'rgba(0,0,0,0.72)',
                color: '#fff',
                width: 32,
                height: 32,
                boxShadow: '0 1px 4px rgba(0,0,0,0.45)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.88)' },
              }}
            >
              <CameraIcon size={15} weight="bold" />
            </IconButton>
            <IconButton
              size="small"
              aria-label={`Hiq ${label}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
              sx={{
                pointerEvents: 'auto',
                bgcolor: 'rgba(0,0,0,0.72)',
                color: '#fff',
                width: 32,
                height: 32,
                boxShadow: '0 1px 4px rgba(0,0,0,0.45)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.88)' },
              }}
            >
              <XIcon size={15} weight="bold" />
            </IconButton>
          </Stack>
        ) : null}
      </Box>
    </Stack>
  );
}

export function ProfessionalProfilePhotosEditor({
  coverFile,
  avatarFile,
  coverUrl,
  avatarUrl,
  focus = 'cover',
  onCoverFile,
  onAvatarFile,
  onCoverUrl,
  onAvatarUrl,
}: {
  coverFile: File | null;
  avatarFile: File | null;
  coverUrl: string;
  avatarUrl: string;
  focus?: 'cover' | 'avatar';
  onCoverFile: (file: File | null) => void;
  onAvatarFile: (file: File | null) => void;
  onCoverUrl: (url: string) => void;
  onAvatarUrl: (url: string) => void;
}) {
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const coverObjectUrl = useObjectUrl(coverFile);
  const avatarObjectUrl = useObjectUrl(avatarFile);
  const coverPreview = coverObjectUrl || coverUrl || null;
  const avatarPreview = avatarObjectUrl || avatarUrl || null;
  const [preview, setPreview] = React.useState<'cover' | 'avatar' | null>(null);
  const previewUrls = [coverPreview, avatarPreview].filter((url): url is string => Boolean(url));
  const previewIndex =
    preview === 'cover' && coverPreview
      ? previewUrls.indexOf(coverPreview)
      : preview === 'avatar' && avatarPreview
        ? previewUrls.indexOf(avatarPreview)
        : 0;

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if (focus === 'avatar') avatarInputRef.current?.focus();
      else coverInputRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(t);
  }, [focus]);

  return (
    <Stack spacing={2}>
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onCoverFile(file);
          if (file) onCoverUrl('');
          e.target.value = '';
        }}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onAvatarFile(file);
          if (file) onAvatarUrl('');
          e.target.value = '';
        }}
      />

      <PhotoSlot
        label="Kopertina"
        hint="Shfaqet lart në profilin publik"
        previewUrl={coverPreview}
        active={focus === 'cover'}
        aspect="2 / 1"
        emptyIcon={<ImageIcon size={28} weight="duotone" />}
        onPick={() => coverInputRef.current?.click()}
        onPreview={() => setPreview('cover')}
        onClear={() => {
          onCoverFile(null);
          onCoverUrl('');
        }}
      />

      <PhotoSlot
        label="Foto profili"
        hint="Rrethi poshtë kopertinës"
        previewUrl={avatarPreview}
        active={focus === 'avatar'}
        round
        emptyIcon={<UserCircleIcon size={36} weight="duotone" />}
        onPick={() => avatarInputRef.current?.click()}
        onPreview={() => setPreview('avatar')}
        onClear={() => {
          onAvatarFile(null);
          onAvatarUrl('');
        }}
      />

      <ImageLightbox
        open={preview != null && previewUrls.length > 0}
        urls={previewUrls}
        index={Math.max(0, previewIndex)}
        onClose={() => setPreview(null)}
        onIndexChange={(index) => {
          const url = previewUrls[index];
          if (url && url === coverPreview) setPreview('cover');
          else if (url && url === avatarPreview) setPreview('avatar');
        }}
      />
    </Stack>
  );
}

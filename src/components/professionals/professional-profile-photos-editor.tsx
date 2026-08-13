'use client';

import * as React from 'react';
import { Box, ButtonBase, IconButton, Stack, Typography } from '@mui/material';
import { Camera as CameraIcon } from '@phosphor-icons/react/dist/ssr/Camera';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

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

      <Box sx={{ position: 'relative', width: round ? 'auto' : '100%', alignSelf: round ? 'center' : 'stretch' }}>
        <ButtonBase
          onClick={onPick}
          sx={{
            display: 'block',
            width: round ? 120 : '100%',
            aspectRatio: round ? '1 / 1' : aspect || '2 / 1',
            borderRadius: round ? '50%' : 2,
            overflow: 'hidden',
            border: '1px dashed',
            borderColor: previewUrl ? 'transparent' : 'divider',
            bgcolor: 'action.hover',
            position: 'relative',
          }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
          {previewUrl ? (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                pb: 1,
                background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.45))',
                opacity: 0,
                transition: 'opacity 0.15s',
                '.MuiButtonBase-root:hover &': { opacity: 1 },
              }}
            >
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: '#fff' }}>
                <CameraIcon size={14} weight="bold" />
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700 }}>Ndrysho</Typography>
              </Stack>
            </Box>
          ) : null}
        </ButtonBase>

        {previewUrl ? (
          <IconButton
            size="small"
            aria-label={`Hiq ${label}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }}
            sx={{
              position: 'absolute',
              top: 6,
              right: round ? '50%' : 6,
              transform: round ? 'translate(48px, 0)' : 'none',
              bgcolor: 'rgba(0,0,0,0.6)',
              color: '#fff',
              width: 28,
              height: 28,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
            }}
          >
            <XIcon size={14} weight="bold" />
          </IconButton>
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
        onClear={() => {
          onAvatarFile(null);
          onAvatarUrl('');
        }}
      />
    </Stack>
  );
}

'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { BoostCoinIcon } from '@/components/core/boost-coin-icon';
import {
  ANNOUNCE_COST_BC,
  clearBusinessAnnouncement,
  upsertBusinessAnnouncement,
  type BusinessAnnouncement,
} from '@/lib/listing-announcement-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { useUser } from '@/hooks/use-user';
import { productButtonSx, productDialogSlotProps, productFieldSx } from '@/styles/product-sx';

export type BusinessAnnouncementDialogProps = {
  open: boolean;
  listingId: string;
  initial: BusinessAnnouncement | null;
  onClose: () => void;
  onSaved: (result: {
    announcement: BusinessAnnouncement | null;
    refreshedAt?: string | null;
    boostCredits?: number;
  }) => void;
};

export function BusinessAnnouncementDialog({
  open,
  listingId,
  initial,
  onClose,
  onSaved,
}: BusinessAnnouncementDialogProps) {
  const { checkSession } = useUser();
  const hasExisting = Boolean(initial?.title?.trim());

  const [title, setTitle] = React.useState('');
  const [subtitle, setSubtitle] = React.useState('');
  const [bannerUrl, setBannerUrl] = React.useState('');
  const [reAnnounce, setReAnnounce] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(initial?.title?.trim() || '');
    setSubtitle(initial?.subtitle?.trim() || '');
    setBannerUrl(initial?.bannerUrl?.trim() || '');
    setReAnnounce(false);
  }, [open, initial]);

  const willCharge = !hasExisting || reAnnounce;

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const res = await uploadListingImages([file], 'business-announcements');
    setUploading(false);
    if (res.error || !res.urls[0]) {
      setError(res.error || 'Ngarkimi i bannerit dështoi.');
      return;
    }
    setBannerUrl(res.urls[0]);
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Titulli është i detyrueshëm.');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await upsertBusinessAnnouncement({
      listingId,
      title: trimmed,
      subtitle: subtitle.trim() || null,
      bannerUrl: bannerUrl.trim() || null,
      reAnnounce: willCharge,
    });
    setSaving(false);
    if (res.error || !res.announcement) {
      setError(res.error || 'Shpallja dështoi.');
      return;
    }
    void checkSession();
    onSaved({
      announcement: res.announcement,
      refreshedAt: res.refreshedAt,
      boostCredits: res.boostCredits,
    });
    onClose();
  };

  const handleClear = async () => {
    if (!hasExisting || clearing) return;
    setClearing(true);
    setError(null);
    const res = await clearBusinessAnnouncement(listingId);
    setClearing(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSaved({ announcement: null });
    onClose();
  };

  const busy = saving || clearing || uploading;

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={productDialogSlotProps}
    >
      <DialogTitle
        sx={{
          position: 'relative',
          px: 2.5,
          pt: 2.5,
          pb: 1,
          pr: 6,
          fontWeight: 800,
          fontSize: '1.125rem',
          letterSpacing: '-0.01em',
        }}
      >
        {hasExisting ? 'Ndrysho shpalljen' : 'Shto shpallje'}
        <IconButton
          aria-label="Mbyll"
          onClick={handleClose}
          disabled={busy}
          size="small"
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'text.secondary',
            borderRadius: 2,
            '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
          }}
        >
          <XIcon size={18} weight="bold" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, pb: 1.5, pt: '8px !important' }}>
        <Stack spacing={2.25}>
          {error ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.45 }}
          >
            Shpallja shfaqet si shirit në fund të fotos. Publikimi e vendos njoftimin në krye të listës.
          </Typography>

          <TextField
            label="Titulli"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            slotProps={{ htmlInput: { maxLength: 80 } }}
            placeholder="p.sh. 20% ZBRITJE"
            disabled={busy}
            sx={productFieldSx}
          />
          <TextField
            label="Nëntitulli (opsionale)"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 160 } }}
            placeholder="p.sh. Me rezervim online · Wifi, parking"
            disabled={busy}
            sx={productFieldSx}
          />

          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1.25, fontWeight: 600, fontSize: '0.8125rem' }}
            >
              Banner (opsionale)
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(e) => {
                void handleUpload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {bannerUrl ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '21 / 9',
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                >
                  <IconButton
                    size="small"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Ndrysho bannerin"
                    sx={{
                      bgcolor: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                    }}
                  >
                    {uploading ? <CircularProgress size={14} color="inherit" /> : <ImageIcon size={14} />}
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={busy}
                    onClick={() => setBannerUrl('')}
                    aria-label="Hiq bannerin"
                    sx={{
                      bgcolor: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                    }}
                  >
                    <XIcon size={14} weight="bold" />
                  </IconButton>
                </Stack>
              </Box>
            ) : (
              <Box
                component="button"
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Ngarko banner"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.75,
                  width: '100%',
                  minHeight: 108,
                  px: 2,
                  py: 2.5,
                  m: 0,
                  borderRadius: 2.5,
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  color: 'text.secondary',
                  cursor: busy ? 'default' : 'pointer',
                  font: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.15s, color 0.15s, background-color 0.15s',
                  '&:hover': busy
                    ? undefined
                    : {
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        bgcolor: (t) =>
                          t.palette.mode === 'dark'
                            ? 'rgba(130, 201, 30, 0.08)'
                            : 'rgba(118, 186, 27, 0.06)',
                      },
                  '&.Mui-disabled, &:disabled': {
                    opacity: 0.6,
                  },
                }}
              >
                {uploading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  <ImageIcon size={26} weight="duotone" />
                )}
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                  {uploading ? 'Duke ngarkuar…' : 'Ngarko banner'}
                </Typography>
              </Box>
            )}
          </Box>

          {hasExisting ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={reAnnounce}
                  onChange={(e) => setReAnnounce(e.target.checked)}
                  disabled={busy}
                  size="small"
                />
              }
              sx={{ alignItems: 'center', ml: 0, mr: 0 }}
              label={
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Rishpall dhe vendose në krye · {ANNOUNCE_COST_BC}
                  </Typography>
                  <BoostCoinIcon size={14} />
                </Stack>
              }
            />
          ) : (
            <Alert severity="info" icon={<BoostCoinIcon size={18} />} sx={{ borderRadius: 2 }}>
              Publikimi kushton {ANNOUNCE_COST_BC} Boost Coins dhe e vendos njoftimin në krye të listës.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          pb: 2.5,
          pt: 1,
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {hasExisting ? (
          <Button
            color="error"
            disabled={busy}
            onClick={() => void handleClear()}
            sx={{ ...productButtonSx, mr: 'auto', fontWeight: 700, px: 2 }}
          >
            {clearing ? <CircularProgress size={16} color="inherit" /> : 'Hiq'}
          </Button>
        ) : null}
        <Button
          variant="contained"
          disabled={busy || !title.trim()}
          onClick={() => void handleSave()}
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : willCharge ? (
              <BoostCoinIcon size={16} />
            ) : undefined
          }
          sx={{ ...productButtonSx, px: 2.5 }}
        >
          {willCharge ? `Shpall · ${ANNOUNCE_COST_BC} BC` : 'Ruaj'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

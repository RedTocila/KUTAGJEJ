'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { AdminPageHeader } from '@/components/dashboard/layout/admin-page-header';
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { usePlatformAdminGuard } from '@/hooks/use-platform-admin';
import {
  createHomeBanner,
  deleteHomeBanner,
  listAdminHomeBanners,
  updateHomeBanner,
  type AdminHomeBanner,
  type HomeBannerInput,
} from '@/lib/admin-home-banners-client';
import { uploadListingImages } from '@/lib/uploads-client';

const EMPTY_FORM: HomeBannerInput = {
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaLabel: '',
  ctaHref: '/prona',
  order: 0,
  isActive: true,
};

function BannerDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: AdminHomeBanner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = React.useState<HomeBannerInput>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setForm({
        title: initial.title,
        subtitle: initial.subtitle || '',
        imageUrl: initial.imageUrl || '',
        ctaLabel: initial.ctaLabel || '',
        ctaHref: initial.ctaHref || '',
        order: initial.order,
        isActive: initial.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, initial]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const res = await uploadListingImages([file], 'home-banners');
    setUploading(false);
    if (res.error || !res.urls[0]) {
      setError(res.error || 'Ngarkimi i imazhit dështoi.');
      return;
    }
    setForm((f) => ({ ...f, imageUrl: res.urls[0] }));
  };

  const handleSave = async () => {
    const title = form.title.trim();
    if (!title) {
      setError('Titulli është i detyrueshëm.');
      return;
    }
    const href = form.ctaHref.trim();
    if (href && !href.startsWith('/')) {
      setError('Linku duhet të fillojë me "/" (p.sh. /prona).');
      return;
    }

    setSaving(true);
    setError(null);
    const body: HomeBannerInput = {
      ...form,
      title,
      subtitle: form.subtitle.trim(),
      imageUrl: form.imageUrl.trim(),
      ctaHref: href,
      ctaLabel: '',
    };
    const res = initial ? await updateHomeBanner(initial.id, body) : await createHomeBanner(body);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSaved();
  };

  return (
    <ProductDialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <ProductDialogTitle onClose={saving ? undefined : onClose}>
        {initial ? 'Ndrysho banner-in' : 'Banner i ri'}
      </ProductDialogTitle>
      <ProductDialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error ? (
            <Alert severity="error" sx={{ borderRadius: 1.5 }}>
              {error}
            </Alert>
          ) : null}
          <TextField
            label="Titulli"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            fullWidth
            required
            slotProps={{ htmlInput: { maxLength: 140 } }}
          />
          <TextField
            label="Nëntitulli"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            fullWidth
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 280 } }}
          />
          <TextField
            label="Linku (e gjithë karta)"
            placeholder="/prona ose /user/dashboard/prona"
            value={form.ctaHref}
            onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
            fullWidth
            helperText="Kur përdoruesi prek banner-in, hapet ky link."
          />
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Imazhi (opsional)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Nëse nuk ngarkoni imazh, përdoret gradienti i platformës.
            </Typography>
            {form.imageUrl && /^https?:\/\//i.test(form.imageUrl) ? (
              <Box
                component="img"
                src={form.imageUrl}
                alt=""
                sx={{
                  width: '100%',
                  maxHeight: 160,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            ) : null}
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ImageIcon />}
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                sx={{ textTransform: 'none' }}
              >
                {uploading ? 'Duke ngarkuar…' : 'Ngarko imazh'}
              </Button>
              {form.imageUrl ? (
                <Button
                  color="inherit"
                  disabled={uploading}
                  onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                  sx={{ textTransform: 'none' }}
                >
                  Hiq
                </Button>
              ) : null}
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void handleUpload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </Stack>
          <TextField
            label="Renditja"
            type="number"
            value={form.order}
            onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
            fullWidth
            helperText="Numri më i vogël shfaqet i pari (max 3 në homepage)."
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
            }
            label="Aktiv (i dukshëm në homepage)"
          />
        </Stack>
      </ProductDialogContent>
      <ProductDialogActions>
        <Button onClick={onClose} disabled={saving}>
          Anulo
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || uploading}>
          {saving ? 'Po ruhet...' : 'Ruaj'}
        </Button>
      </ProductDialogActions>
    </ProductDialog>
  );
}

export function HomeBannersAdminPage() {
  const { user, isPlatformAdmin } = usePlatformAdminGuard();
  const [banners, setBanners] = React.useState<AdminHomeBanner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AdminHomeBanner | null>(null);
  const [deleting, setDeleting] = React.useState<AdminHomeBanner | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const { banners: items, error: err } = await listAdminHomeBanners();
    if (err) setError(err);
    else setBanners(items ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!user || !isPlatformAdmin) return;
    void load();
  }, [user, isPlatformAdmin, load]);

  if (!user || !isPlatformAdmin) return null;

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        icon={React.createElement(ImageIcon, { size: 22, weight: 'duotone' })}
        eyebrow="Përmbajtja"
        title="Bannerat"
        description="Postet e karuselit në krye të faqes kryesore. E gjithë karta është e klikueshme."
        actions={
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Shto banner
          </Button>
        }
      />

      {error ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflowX: 'auto',
        }}
      >
        {loading ? (
          <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : banners.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
            Nuk ka ende banera. Shtoni një për ta shfaqur në homepage.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Titulli</TableCell>
                <TableCell>Linku</TableCell>
                <TableCell align="center">Renditja</TableCell>
                <TableCell align="center">Statusi</TableCell>
                <TableCell align="right">Veprime</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {banners.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 36,
                          borderRadius: 1,
                          flexShrink: 0,
                          bgcolor: 'action.hover',
                          backgroundImage:
                            b.imageUrl && /^https?:\/\//i.test(b.imageUrl)
                              ? `url(${b.imageUrl})`
                              : 'linear-gradient(135deg, #3a8c00, #75be14)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }} noWrap>
                          {b.title}
                        </Typography>
                        {b.subtitle ? (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {b.subtitle}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                      {b.ctaHref || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{b.order}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      color={b.isActive ? 'success' : 'default'}
                      label={b.isActive ? 'Aktiv' : 'Joaktiv'}
                      sx={{ fontWeight: 700 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(b);
                        setDialogOpen(true);
                      }}
                    >
                      <PencilIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleting(b)}>
                      <TrashIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <BannerDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          void load();
        }}
      />

      <ProductDialog
        open={Boolean(deleting)}
        onClose={deleteBusy ? undefined : () => setDeleting(null)}
        maxWidth="xs"
        fullWidth
      >
        <ProductDialogTitle onClose={deleteBusy ? undefined : () => setDeleting(null)}>Fshi banner-in</ProductDialogTitle>
        <ProductDialogContent>
          <Typography>
            A jeni i sigurt që doni të fshini <strong>{deleting?.title}</strong>?
          </Typography>
        </ProductDialogContent>
        <ProductDialogActions>
          <Button onClick={() => setDeleting(null)} disabled={deleteBusy}>
            Anulo
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteBusy}
            onClick={async () => {
              if (!deleting) return;
              setDeleteBusy(true);
              const res = await deleteHomeBanner(deleting.id);
              setDeleteBusy(false);
              if (!res.error) {
                setDeleting(null);
                void load();
              }
            }}
          >
            {deleteBusy ? 'Po fshihet...' : 'Fshi'}
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </Stack>
  );
}

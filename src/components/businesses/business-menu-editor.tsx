'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  type TextFieldProps,
} from '@mui/material';
import { PencilSimple as PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Sparkle as SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { UploadSimple as UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';

import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { ListingFormActions } from '@/components/user/listing-form-ui';
import { importMenuFromImages } from '@/lib/ai-menu-client';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import {
  AI_SEARCH_BLUE,
  AI_SEARCH_BLUE_MUTED,
  AI_SEARCH_BLUE_SOFT,
} from '@/lib/home-categories';
import {
  updateBusinessMenu,
  type BusinessMenuCategory,
  type BusinessMenuItem,
  type BusinessMineListing,
} from '@/lib/directory-listings-client';
import { uploadListingImages } from '@/lib/uploads-client';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function hydrateMenu(listing: BusinessMineListing): {
  categories: BusinessMenuCategory[];
  items: BusinessMenuItem[];
} {
  const categories = (listing.menuCategories ?? []).map((c, i) => ({
    id: c.id || newId(),
    name: c.name ?? '',
    sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : i,
  }));
  const items: BusinessMenuItem[] = (listing.menuItems ?? []).map((item, i): BusinessMenuItem => ({
    id: item.id || newId(),
    categoryId: item.categoryId,
    name: item.name ?? '',
    description: item.description ?? '',
    price: Number(item.price) || 0,
    currency: item.currency === 'LEK' ? 'LEK' : 'EUR',
    imageUrl: item.imageUrl ?? null,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
  }));
  return { categories, items };
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.75,
    bgcolor: 'background.paper',
    fontSize: '0.9rem',
  },
  '& .MuiInputLabel-root': {
    fontWeight: 600,
    fontSize: '0.8rem',
  },
} as const;

function MenuField(props: TextFieldProps) {
  const { sx, slotProps, ...rest } = props;
  const inputLabelSlot =
    typeof slotProps?.inputLabel === 'object' && slotProps.inputLabel !== null
      ? slotProps.inputLabel
      : {};
  return (
    <TextField
      {...rest}
      size="small"
      fullWidth
      slotProps={{
        ...slotProps,
        inputLabel: { ...inputLabelSlot, shrink: true },
      }}
      sx={[fieldSx, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}

type ProductDraft = {
  id: string | null;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  currency: 'EUR' | 'LEK';
  imageUrl: string | null;
  imageFile: File | null;
};

function emptyProductDraft(categoryId: string): ProductDraft {
  return {
    id: null,
    categoryId,
    name: '',
    description: '',
    price: '',
    currency: 'EUR',
    imageUrl: null,
    imageFile: null,
  };
}

export function BusinessMenuEditor({
  listing,
}: {
  listing: BusinessMineListing;
  backHref?: string;
  backLabel?: string;
}) {
  const initial = React.useMemo(() => hydrateMenu(listing), [listing]);
  const [categories, setCategories] = React.useState<BusinessMenuCategory[]>(initial.categories);
  const [items, setItems] = React.useState<BusinessMenuItem[]>(initial.items);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiNotice, setAiNotice] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [categoryNameDraft, setCategoryNameDraft] = React.useState('');
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null);

  const [productDialogOpen, setProductDialogOpen] = React.useState(false);
  const [productDraft, setProductDraft] = React.useState<ProductDraft | null>(null);
  const [productSaving, setProductSaving] = React.useState(false);
  const [productError, setProductError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const next = hydrateMenu(listing);
    setCategories(next.categories);
    setItems(next.items);
  }, [listing]);

  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCategoryNameDraft('');
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: BusinessMenuCategory) => {
    setEditingCategoryId(cat.id);
    setCategoryNameDraft(cat.name);
    setCategoryDialogOpen(true);
  };

  const saveCategoryDialog = () => {
    const name = categoryNameDraft.trim();
    if (!name) return;
    if (editingCategoryId) {
      setCategories((prev) =>
        prev.map((c) => (c.id === editingCategoryId ? { ...c, name } : c)),
      );
    } else {
      setCategories((prev) => [...prev, { id: newId(), name, sortOrder: prev.length }]);
    }
    setCategoryDialogOpen(false);
  };

  const openAddProduct = (categoryId: string) => {
    setProductError(null);
    setProductDraft(emptyProductDraft(categoryId));
    setProductDialogOpen(true);
  };

  const openEditProduct = (item: BusinessMenuItem) => {
    setProductError(null);
    setProductDraft({
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      price: item.price ? String(item.price) : '',
      currency: item.currency,
      imageUrl: item.imageUrl,
      imageFile: null,
    });
    setProductDialogOpen(true);
  };

  const saveProductDialog = async () => {
    if (!productDraft) return;
    const name = productDraft.name.trim();
    if (!name) {
      setProductError('Shkruani emrin e artikullit.');
      return;
    }
    setProductSaving(true);
    setProductError(null);
    try {
      let imageUrl = productDraft.imageUrl;
      if (productDraft.imageFile) {
        const up = await uploadListingImages([productDraft.imageFile], 'business-menu');
        if (up.error) {
          setProductError(up.error);
          return;
        }
        imageUrl = up.urls[0] ?? null;
      }

      const nextItem: BusinessMenuItem = {
        id: productDraft.id || newId(),
        categoryId: productDraft.categoryId,
        name,
        description: productDraft.description.trim(),
        price: Number(productDraft.price) || 0,
        currency: productDraft.currency,
        imageUrl,
        sortOrder: 0,
      };

      setItems((prev) => {
        const exists = prev.some((row) => row.id === nextItem.id);
        if (exists) return prev.map((row) => (row.id === nextItem.id ? { ...nextItem, sortOrder: row.sortOrder } : row));
        return [...prev, { ...nextItem, sortOrder: prev.length }];
      });
      setProductDialogOpen(false);
      setProductDraft(null);
    } finally {
      setProductSaving(false);
    }
  };

  const handleAiFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setAiBusy(true);
    setError(null);
    setAiNotice(null);
    setSuccess(null);
    try {
      const res = await importMenuFromImages(Array.from(files));
      if (res.error) {
        setError(res.error);
        return;
      }
      if (!res.categories.length) {
        setError('Nuk u gjetën artikuj në foto.');
        return;
      }
      setCategories(res.categories);
      setItems(res.items);
      setAiNotice(
        `U importuan ${res.categories.length} kategori · ${res.items.length} artikuj. Kontrolloni dhe ruani.`,
      );
    } finally {
      setAiBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const cats = categories
      .map((c, i) => ({ ...c, name: c.name.trim(), sortOrder: i }))
      .filter((c) => c.name);
    const nextItems = items
      .filter((item) => item.name.trim() && cats.some((c) => c.id === item.categoryId))
      .map((item, i) => ({
        ...item,
        name: item.name.trim(),
        description: item.description.trim(),
        price: Number(item.price) || 0,
        sortOrder: i,
      }));

    setSubmitting(true);
    const res = await updateBusinessMenu(listing.id, {
      menuCategories: cats,
      menuItems: nextItems,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setCategories(cats);
    setItems(nextItems);
    setSuccess('Menuja u ruajt.');
  };

  const busy = submitting || aiBusy;

  return (
    <Box component="form" onSubmit={(e) => void handleSubmit(e)} noValidate>
      <Stack spacing={2.25}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}
        {aiNotice ? <Alert severity="info">{aiNotice}</Alert> : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => void handleAiFiles(e.target.files)}
        />

        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: 'center',
            px: 1.5,
            py: 1.15,
            borderRadius: 2,
            border: '1px solid',
            borderColor: AI_SEARCH_BLUE,
            bgcolor: AI_SEARCH_BLUE_MUTED,
          }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: AI_SEARCH_BLUE_SOFT,
              color: AI_SEARCH_BLUE,
              flexShrink: 0,
            }}
          >
            <SparkleIcon size={18} weight="fill" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', lineHeight: 1.2 }}>
              Importo nga foto
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.3 }}>
              Deri në 20 foto · redaktoni para ruajtjes
            </Typography>
          </Box>
          <Button
            type="button"
            size="small"
            variant="contained"
            disableElevation
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            startIcon={
              aiBusy ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <UploadSimpleIcon size={15} weight="bold" />
              )
            }
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: 1.75,
              flexShrink: 0,
              px: 1.5,
              minHeight: 36,
              bgcolor: AI_SEARCH_BLUE,
              color: '#0B1220',
              '&:hover': { bgcolor: '#8BB8DA', color: '#0B1220' },
              '&.Mui-disabled': { bgcolor: AI_SEARCH_BLUE_SOFT, color: 'text.disabled' },
            }}
          >
            {aiBusy ? '…' : 'Ngarko'}
          </Button>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Kategoritë
            </Typography>
            <Typography
              sx={{
                fontSize: '0.78rem',
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {listing.title}
            </Typography>
          </Box>
          <Button
            type="button"
            size="small"
            variant="outlined"
            startIcon={<PlusIcon size={14} weight="bold" />}
            onClick={openAddCategory}
            disabled={busy}
            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 1.75, flexShrink: 0 }}
          >
            Kategori
          </Button>
        </Stack>

        {categories.length === 0 ? (
          <Box
            sx={{
              py: 4,
              px: 2,
              borderRadius: 2.25,
              border: '1px dashed',
              borderColor: 'divider',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Shtoni një kategori, pastaj shtoni artikujt në të.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {categories.map((cat) => {
              const catItems = items.filter((item) => item.categoryId === cat.id);
              return (
                <Box
                  key={cat.id}
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: (t) =>
                      t.palette.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)',
                    overflow: 'hidden',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      px: 1.75,
                      py: 1.35,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.25 }}>
                        {cat.name || 'Pa emër'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                        {catItems.length} artikuj
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      aria-label="Ndrysho kategorinë"
                      onClick={() => openEditCategory(cat)}
                      sx={{ color: 'text.secondary' }}
                    >
                      <PencilSimpleIcon size={16} />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="Fshi kategorinë"
                      onClick={() => {
                        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
                        setItems((prev) => prev.filter((i) => i.categoryId !== cat.id));
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <TrashIcon size={16} />
                    </IconButton>
                  </Stack>

                  {catItems.length === 0 ? (
                    <Box sx={{ px: 1.75, py: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nuk ka artikuj në këtë kategori.
                      </Typography>
                    </Box>
                  ) : (
                    <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
                      {catItems.map((item) => (
                        <Stack
                          key={item.id}
                          direction="row"
                          spacing={1.25}
                          sx={{
                            alignItems: 'center',
                            px: 1.75,
                            py: 1.25,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                          onClick={() => openEditProduct(item)}
                        >
                          <Box
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: 1.5,
                              overflow: 'hidden',
                              flexShrink: 0,
                              bgcolor: primaryMainAlpha(0.12),
                            }}
                          >
                            {item.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imageUrl}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                            ) : null}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.name}
                            </Typography>
                            {item.description ? (
                              <Typography
                                sx={{
                                  fontSize: '0.72rem',
                                  color: 'text.secondary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.description}
                              </Typography>
                            ) : null}
                          </Box>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: '0.88rem',
                              color: 'primary.main',
                              flexShrink: 0,
                            }}
                          >
                            {formatPrice(item.price, item.currency)}
                          </Typography>
                          <IconButton
                            size="small"
                            aria-label="Fshi artikullin"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItems((prev) => prev.filter((i) => i.id !== item.id));
                            }}
                            sx={{ color: 'text.secondary', flexShrink: 0 }}
                          >
                            <TrashIcon size={15} />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  )}

                  <Box sx={{ px: 1.5, py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button
                      type="button"
                      size="small"
                      startIcon={<PlusIcon size={14} weight="bold" />}
                      onClick={() => openAddProduct(cat.id)}
                      disabled={busy}
                      sx={{ textTransform: 'none', fontWeight: 800 }}
                    >
                      Shto artikull
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}

        <ListingFormActions submitLabel="Ruaj menunë" submitting={busy} />
      </Stack>

      {/* Category dialog */}
      <Dialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {editingCategoryId ? 'Ndrysho kategorinë' : 'Kategori e re'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <MenuField
              label="Emri i kategorisë"
              placeholder="p.sh. Paragjykimet"
              value={categoryNameDraft}
              onChange={(e) => setCategoryNameDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveCategoryDialog();
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setCategoryDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Anulo
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={saveCategoryDialog}
            disabled={!categoryNameDraft.trim()}
            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
          >
            Ruaj
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product dialog */}
      <Dialog
        open={productDialogOpen}
        onClose={() => {
          if (productSaving) return;
          setProductDialogOpen(false);
        }}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {productDraft?.id ? 'Ndrysho artikullin' : 'Artikull i ri'}
        </DialogTitle>
        <DialogContent>
          {productDraft ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {productError ? <Alert severity="error">{productError}</Alert> : null}
              <MenuField
                label="Emri"
                placeholder="p.sh. Bruschetta me domate"
                value={productDraft.name}
                onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })}
                autoFocus
              />
              <MenuField
                label="Përshkrimi"
                placeholder="Opsionale"
                value={productDraft.description}
                onChange={(e) => setProductDraft({ ...productDraft, description: e.target.value })}
                multiline
                minRows={2}
              />
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-end' }}>
                <MenuField
                  label="Çmimi"
                  type="number"
                  placeholder="0"
                  value={productDraft.price}
                  onChange={(e) => setProductDraft({ ...productDraft, price: e.target.value })}
                />
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={productDraft.currency}
                  onChange={(_e, value: 'EUR' | 'LEK' | null) => {
                    if (!value) return;
                    setProductDraft({ ...productDraft, currency: value });
                  }}
                  sx={{
                    flexShrink: 0,
                    height: 40,
                    mb: 0.15,
                    '& .MuiToggleButton-root': {
                      px: 1.35,
                      minWidth: 48,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'none',
                      borderRadius: 1.5,
                    },
                  }}
                >
                  <ToggleButton value="EUR">EUR</ToggleButton>
                  <ToggleButton value="LEK">LEK</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <ListingImagePicker
                label="Foto e artikullit"
                max={1}
                value={productDraft.imageFile ? [productDraft.imageFile] : []}
                onChange={(files) =>
                  setProductDraft({
                    ...productDraft,
                    imageFile: files[0] ?? null,
                    imageUrl: files[0] ? null : productDraft.imageUrl,
                  })
                }
                existingUrls={productDraft.imageFile ? [] : productDraft.imageUrl ? [productDraft.imageUrl] : []}
                onExistingUrlsChange={(urls) =>
                  setProductDraft({
                    ...productDraft,
                    imageUrl: urls[0] ?? null,
                  })
                }
                disabled={productSaving}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button
            onClick={() => setProductDialogOpen(false)}
            disabled={productSaving}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Anulo
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => void saveProductDialog()}
            disabled={productSaving}
            startIcon={productSaving ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
          >
            {productSaving ? 'Duke ruajtur…' : 'Ruaj artikullin'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

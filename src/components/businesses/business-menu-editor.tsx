'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  LinearProgress,
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
import {
  ProductDialog,
  ProductDialogActions,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';
import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { ProductTag } from '@/components/public/product-browse-chrome';
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
import { productButtonSx, productFieldSx } from '@/styles/product-sx';

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
  ...productFieldSx,
  '& .MuiOutlinedInput-root': {
    ...productFieldSx['& .MuiOutlinedInput-root'],
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

function MenuCategoryTabs({
  categories,
  activeId,
  onSelect,
}: {
  categories: BusinessMenuCategory[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const activeRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const scroller = scrollerRef.current;
    const activeEl = activeRef.current;
    if (!scroller || !activeEl) return;
    const target = activeEl.offsetLeft - (scroller.clientWidth - activeEl.offsetWidth) / 2;
    const nextLeft = Math.max(0, Math.min(target, scroller.scrollWidth - scroller.clientWidth));
    if (Math.abs(scroller.scrollLeft - nextLeft) < 1) return;
    if (typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ left: nextLeft, behavior: 'smooth' });
    } else {
      scroller.scrollLeft = nextLeft;
    }
  }, [activeId]);

  return (
    <Box
      ref={scrollerRef}
      sx={{
        width: '100%',
        minWidth: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        overscrollBehaviorX: 'contain',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ width: 'max-content', flexWrap: 'nowrap', pr: 1 }}>
        {categories.map((cat) => {
          const active = cat.id === activeId;
          return (
            <Box
              key={cat.id}
              ref={active ? activeRef : undefined}
              sx={{ flexShrink: 0, display: 'inline-flex' }}
            >
              <ProductTag
                label={cat.name || 'Pa emër'}
                active={active}
                onClick={() => onSelect(cat.id)}
                sx={{ flexShrink: 0 }}
              />
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

/** Visual wait indicator while the vision API runs — eases toward 96% until done. */
function useSimulatedProgress(active: boolean) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    setValue(8);
    const started = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - started;
      setValue(Math.min(96, 8 + 88 * (1 - Math.exp(-elapsed / 16000))));
    }, 200);
    return () => window.clearInterval(id);
  }, [active]);

  return value;
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
  const [activeCategoryId, setActiveCategoryId] = React.useState(
    () => initial.categories[0]?.id ?? '',
  );
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiFileCount, setAiFileCount] = React.useState(0);
  const [aiNotice, setAiNotice] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const aiProgress = useSimulatedProgress(aiBusy);

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
    setActiveCategoryId((prev) =>
      next.categories.some((c) => c.id === prev) ? prev : (next.categories[0]?.id ?? ''),
    );
  }, [listing]);

  React.useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(t);
  }, [success]);

  React.useEffect(() => {
    if (!aiBusy) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [aiBusy]);

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
      const id = newId();
      setCategories((prev) => [...prev, { id, name, sortOrder: prev.length }]);
      setActiveCategoryId(id);
    }
    setCategoryDialogOpen(false);
  };

  const deleteCategory = (catId: string) => {
    const next = categories.filter((c) => c.id !== catId);
    setCategories(next);
    setItems((prev) => prev.filter((i) => i.categoryId !== catId));
    if (activeCategoryId === catId) {
      setActiveCategoryId(next[0]?.id ?? '');
    }
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
    setAiFileCount(files.length);
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
      setActiveCategoryId(res.categories[0]?.id ?? '');
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
  const activeCategory = categories.find((c) => c.id === activeCategoryId) ?? categories[0] ?? null;
  const activeItems = activeCategory
    ? items.filter((item) => item.categoryId === activeCategory.id)
    : [];

  return (
    <Box component="form" onSubmit={(e) => void handleSubmit(e)} noValidate>
      <Stack spacing={2.25}>
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
          spacing={1.15}
          sx={{
            px: 1.5,
            py: 1.15,
            borderRadius: 2,
            border: '1px solid',
            borderColor: aiBusy ? AI_SEARCH_BLUE : 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
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
                {aiBusy
                  ? aiFileCount === 1
                    ? 'Duke analizuar foton me AI…'
                    : `Duke analizuar ${aiFileCount} foto me AI…`
                  : 'Deri në 20 foto · redaktoni para ruajtjes'}
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
              {aiBusy ? 'Analizohet' : 'Ngarko'}
            </Button>
          </Stack>
          {aiBusy ? (
            <Box>
              <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.6 }}>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: AI_SEARCH_BLUE }}>
                  Ju lutem prisni…
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: AI_SEARCH_BLUE }}>
                  {Math.round(aiProgress)}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={aiProgress}
                sx={{
                  height: 8,
                  borderRadius: 999,
                  bgcolor: AI_SEARCH_BLUE_MUTED,
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 999,
                    bgcolor: AI_SEARCH_BLUE,
                  },
                }}
              />
              <Typography
                sx={{
                  mt: 0.85,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  lineHeight: 1.35,
                  color: 'warning.main',
                }}
              >
                Mos e mbyllni faqen derisa analiza të përfundojë.
              </Typography>
            </Box>
          ) : null}
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
          <Stack spacing={1.5}>
            <MenuCategoryTabs
              categories={categories}
              activeId={activeCategory?.id ?? ''}
              onSelect={setActiveCategoryId}
            />

            {activeCategory ? (
              <Box
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
                      {activeCategory.name || 'Pa emër'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                      {activeItems.length} artikuj
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    aria-label="Ndrysho kategorinë"
                    onClick={() => openEditCategory(activeCategory)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <PencilSimpleIcon size={16} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label="Fshi kategorinë"
                    onClick={() => deleteCategory(activeCategory.id)}
                    sx={{ color: 'error.main' }}
                  >
                    <TrashIcon size={16} />
                  </IconButton>
                </Stack>

                {activeItems.length === 0 ? (
                  <Box sx={{ px: 1.75, py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nuk ka artikuj në këtë kategori.
                    </Typography>
                  </Box>
                ) : (
                  <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
                    {activeItems.map((item) => (
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
                    onClick={() => openAddProduct(activeCategory.id)}
                    disabled={busy}
                    sx={{ textTransform: 'none', fontWeight: 800 }}
                  >
                    Shto artikull
                  </Button>
                </Box>
              </Box>
            ) : null}
          </Stack>
        )}

        <ListingFormActions
          submitLabel="Ruaj menunë"
          submitting={submitting}
          disabled={aiBusy}
          error={error}
          success={success}
        />
      </Stack>

      {/* Category dialog */}
      <ProductDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <ProductDialogTitle onClose={() => setCategoryDialogOpen(false)}>
          {editingCategoryId ? 'Ndrysho kategorinë' : 'Kategori e re'}
        </ProductDialogTitle>
        <ProductDialogContent>
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
        </ProductDialogContent>
        <ProductDialogActions>
          <Button
            variant="contained"
            disableElevation
            onClick={saveCategoryDialog}
            disabled={!categoryNameDraft.trim()}
            sx={{ ...productButtonSx, px: 2.5 }}
          >
            Ruaj
          </Button>
        </ProductDialogActions>
      </ProductDialog>

      <ProductDialog
        open={productDialogOpen}
        onClose={() => {
          if (productSaving) return;
          setProductDialogOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <ProductDialogTitle
          onClose={() => {
            if (productSaving) return;
            setProductDialogOpen(false);
          }}
        >
          {productDraft?.id ? 'Ndrysho artikullin' : 'Artikull i ri'}
        </ProductDialogTitle>
        <ProductDialogContent>
          {productDraft ? (
            <Stack spacing={2.25} sx={{ pt: 0.5 }}>
              {productError ? <Alert severity="error">{productError}</Alert> : null}
              <ListingImagePicker
                variant="hero"
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
              <Box
                sx={{
                  height: 1,
                  bgcolor: 'divider',
                  mx: 0.5,
                }}
              />
              <Stack spacing={2}>
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
              </Stack>
            </Stack>
          ) : null}
        </ProductDialogContent>
        <ProductDialogActions>
          <Button
            variant="contained"
            disableElevation
            onClick={() => void saveProductDialog()}
            disabled={productSaving}
            startIcon={productSaving ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ ...productButtonSx, px: 2.5 }}
          >
            {productSaving ? 'Duke ruajtur…' : 'Ruaj artikullin'}
          </Button>
        </ProductDialogActions>
      </ProductDialog>
    </Box>
  );
}

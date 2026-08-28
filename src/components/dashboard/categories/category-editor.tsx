'use client';

import * as React from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { CATEGORY_VISUAL } from '@/components/dashboard/categories/category-config';
import { TransientSuccessAlert } from '@/components/core/transient-success-alert';
import type { ListingCategory } from '@/types/listing-category';
import { updateCategory } from '@/lib/admin-categories-client';
import { productButtonSx, productFieldSx, productPanelSx } from '@/styles/product-sx';

export function CategoryEditor(props: {
  category: ListingCategory;
  helpText: string;
  onSaved: (c: ListingCategory) => void;
}) {
  const theme = useTheme();
  const { category, helpText, onSaved } = props;
  const { Icon, accent } = CATEGORY_VISUAL[category.key];
  const accentColor = theme.palette[accent].main;

  const listingTypesSig = React.useMemo(
    () => JSON.stringify(category.listingTypes.map((t) => ({ slug: t.slug, label: t.label }))),
    [category.listingTypes],
  );

  const apartmentTypesSig = React.useMemo(
    () => JSON.stringify((category.apartmentTypes ?? []).map((t) => ({ slug: t.slug, label: t.label }))),
    [category.apartmentTypes],
  );

  const categorySyncSig = React.useMemo(
    () =>
      `${category.title}|${category.slug}|${listingTypesSig}|${apartmentTypesSig}|${String(category.updatedAt ?? '')}`,
    [category.title, category.slug, category.updatedAt, listingTypesSig, apartmentTypesSig],
  );

  const [title, setTitle] = React.useState(category.title);
  const [slug, setSlug] = React.useState(category.slug);
  const [rows, setRows] = React.useState(() =>
    category.listingTypes.map((t) => ({ slug: t.slug, label: t.label })),
  );
  const [apartmentRows, setApartmentRows] = React.useState(() =>
    (category.apartmentTypes ?? []).map((t) => ({ slug: t.slug, label: t.label })),
  );
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const categoryRef = React.useRef(category);
  categoryRef.current = category;

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const c = categoryRef.current;
      setTitle(c.title);
      setSlug(c.slug);
      setRows(c.listingTypes.map((t) => ({ slug: t.slug, label: t.label })));
      setApartmentRows((c.apartmentTypes ?? []).map((t) => ({ slug: t.slug, label: t.label })));
      setSaveError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [categorySyncSig]);

  const addRow = () => {
    setRows((r) => [...r, { slug: '', label: '' }]);
  };

  const removeRow = (index: number) => {
    setRows((r) => r.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: 'slug' | 'label', value: string) => {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addApartmentRow = () => {
    setApartmentRows((r) => [...r, { slug: '', label: '' }]);
  };

  const removeApartmentRow = (index: number) => {
    setApartmentRows((r) => r.filter((_, i) => i !== index));
  };

  const updateApartmentRow = (index: number, field: 'slug' | 'label', value: string) => {
    setApartmentRows((r) => r.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const copyListingTypesToApartmentTypes = () => {
    setApartmentRows(rows.map((r) => ({ slug: r.slug.trim(), label: r.label.trim() })));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setPending(true);
    try {
      const { category: next, error } = await updateCategory(category.key, {
        title: title.trim(),
        slug: slug.trim(),
        listingTypes: rows.map((row) => ({
          slug: row.slug.trim(),
          label: row.label.trim(),
        })),
        ...(category.key === 'real-estate'
          ? {
              apartmentTypes: apartmentRows.map((row) => ({
                slug: row.slug.trim(),
                label: row.label.trim(),
              })),
            }
          : {}),
      });
      if (error) {
        setSaveError(error);
        return;
      }
      if (next) {
        onSaved(next);
        setSaveSuccess(true);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={(ev) => void save(ev)}
      sx={productPanelSx}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          bgcolor: alpha(accentColor, theme.palette.mode === 'dark' ? 0.1 : 0.06),
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(accentColor, 0.2),
            color: accentColor,
          }}
        >
          {React.createElement(Icon, { size: 24, weight: 'duotone' })}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Redaktim
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={category.key}
          variant="outlined"
          sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
        />
      </Box>

      <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2.5,
            bgcolor: 'action.hover',
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {helpText}
          </Typography>
        </Box>

        <Box sx={productFieldSx}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Titulli & slug
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
            }}
          >
            <TextField
              label="Titulli (në panel)"
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Slug i kategorisë (URL)"
              value={slug}
              onChange={(ev) => setSlug(ev.target.value)}
              required
              fullWidth
              helperText="Shkronja të vogla, numra dhe vizat; duhet të jetë unik."
            />
          </Box>
        </Box>

        {saveError ? (
          <Alert severity="error" sx={{ borderRadius: 1.5 }}>
            {saveError}
          </Alert>
        ) : null}
        <TransientSuccessAlert
          message={saveSuccess ? 'Ndryshimet u ruajtën.' : null}
          onDismiss={() => setSaveSuccess(false)}
          sx={{ borderRadius: 1.5 }}
        />

        <Box sx={productFieldSx}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              mb: 1.5,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Llojet e listimit
            </Typography>
            <Button
              type="button"
              startIcon={React.createElement(PlusIcon, { size: 18 })}
              onClick={addRow}
              variant="outlined"
              size="small"
              sx={productButtonSx}
            >
              Shto rresht
            </Button>
          </Box>

          <TableContainer sx={productPanelSx}>
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: 'action.hover',
                    '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
                  }}
                >
                  <TableCell>Etiketa</TableCell>
                  <TableCell width={220}>Slug</TableCell>
                  <TableCell align="right" width={56} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary" align="center">
                        Shtoni të paktën një lloj listimi.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow
                      key={`${index}-${row.label}`}
                      sx={{
                        '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Etiketa"
                          value={row.label}
                          onChange={(ev) => updateRow(index, 'label', ev.target.value)}
                          placeholder="p.sh. Apartament"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <TextField
                          size="small"
                          fullWidth
                          label="Slug"
                          value={row.slug}
                          onChange={(ev) => updateRow(index, 'slug', ev.target.value)}
                          placeholder="auto nga etiketa"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <IconButton
                          type="button"
                          aria-label="Hiq rreshtin"
                          size="small"
                          color="error"
                          onClick={() => removeRow(index)}
                        >
                          {React.createElement(TrashIcon, { size: 20 })}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {category.key === 'real-estate' ? (
          <Box sx={productFieldSx}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
                mb: 1.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Llojet e apartamenteve (formulari)
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={copyListingTypesToApartmentTypes}
                  disabled={rows.length === 0}
                  sx={productButtonSx}
                >
                  Kopjo nga llojet e listimit
                </Button>
                <Button
                  type="button"
                  startIcon={React.createElement(PlusIcon, { size: 18 })}
                  onClick={addApartmentRow}
                  variant="outlined"
                  size="small"
                  sx={productButtonSx}
                >
                  Shto rresht
                </Button>
              </Stack>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Kjo tabelë është <strong>e veçantë</strong> nga «Llojet e listimit» më sipër. Formulari i pasurisë (kategoria
              «Apartment» në anglisht) lexon <strong>këtë</strong> listë; nëse mbetet bosh, platforma përdor përkohësisht
              llojet e listimit. Për Studio / Two-bedroom etj., shtoni rreshta këtu ose përdorni «Kopjo nga llojet e
              listimit» pastaj Ruaj.
            </Typography>
            <TableContainer sx={productPanelSx}>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: 'action.hover',
                      '& th': { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
                    }}
                  >
                    <TableCell>Etiketa</TableCell>
                    <TableCell width={220}>Slug</TableCell>
                    <TableCell align="right" width={56} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {apartmentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary" align="center">
                          Shtoni të paktën një lloj apartamenti (p.sh. Studio, Dy-dhomësh).
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    apartmentRows.map((row, index) => (
                      <TableRow
                        key={`apt-${index}-${row.label}`}
                        sx={{
                          '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                        }}
                      >
                        <TableCell sx={{ py: 1.5 }}>
                          <TextField
                            size="small"
                            fullWidth
                            label="Etiketa"
                            value={row.label}
                            onChange={(ev) => updateApartmentRow(index, 'label', ev.target.value)}
                            placeholder="p.sh. Dy-dhomësh"
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <TextField
                            size="small"
                            fullWidth
                            label="Slug"
                            value={row.slug}
                            onChange={(ev) => updateApartmentRow(index, 'slug', ev.target.value)}
                            placeholder="auto nga etiketa"
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <IconButton
                            type="button"
                            aria-label="Hiq rreshtin"
                            size="small"
                            color="error"
                            onClick={() => removeApartmentRow(index)}
                          >
                            {React.createElement(TrashIcon, { size: 20 })}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ) : null}

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" size="large" disabled={pending} sx={{ ...productButtonSx, minWidth: 200 }}>
            {pending ? 'Duke u ruajtur…' : 'Ruaj ndryshimet'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

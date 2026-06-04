'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { PROFESSIONAL_CATEGORY_OPTIONS } from '@/lib/professional-constants';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { createProfessionalListing, type ProfessionalPortfolioItem } from '@/lib/directory-listings-client';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ProfessionalListingForm({
  onSuccess,
  backHref,
  backLabel,
}: {
  onSuccess?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [cityId, setCityId] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [servicesHighlight, setServicesHighlight] = React.useState('');
  const [responseTimeHours, setResponseTimeHours] = React.useState('2');
  const [price, setPrice] = React.useState('');
  const [currency, setCurrency] = React.useState<'' | 'EUR' | 'LEK'>('');
  const [imageUrlsText, setImageUrlsText] = React.useState('');
  const [portfolio, setPortfolio] = React.useState<ProfessionalPortfolioItem[]>([]);

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const addPortfolio = () => {
    setPortfolio((prev) => [
      ...prev,
      { id: newId(), title: '', description: '', imageUrl: '', location: '', sortOrder: prev.length },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim() || !category || !cityId) {
      setError('Plotësoni fushat e detyrueshme.');
      return;
    }

    const portfolioItems = portfolio
      .filter((p) => p.title.trim() && p.imageUrl.trim())
      .map((p, i) => ({
        ...p,
        title: p.title.trim(),
        description: p.description.trim(),
        imageUrl: p.imageUrl.trim(),
        location: p.location?.trim() || null,
        sortOrder: i,
      }));

    const imageUrls = imageUrlsText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const hours = Number.parseInt(responseTimeHours, 10);
    const hasPrice = price.trim() !== '';

    setSubmitting(true);
    const res = await createProfessionalListing({
      title: title.trim(),
      description: description.trim(),
      category,
      cityId,
      contactPhone: contactPhone.trim(),
      imageUrls,
      responseTimeHours: Number.isInteger(hours) && hours >= 1 ? hours : null,
      portfolioItems,
      price: hasPrice ? Number(price) : null,
      currency: hasPrice && currency ? currency : null,
      condition: null,
      servicesHighlight: servicesHighlight.trim() || null,
    });
    setSubmitting(false);
    if (res.error) setError(res.error);
    else onSuccess?.();
  };

  return (
    <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
      <Stack spacing={3}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        <TextField label="Titulli i profilit" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
        <FormControl fullWidth required>
          <InputLabel>Kategoria</InputLabel>
          <Select label="Kategoria" value={category} onChange={(e) => setCategory(e.target.value)}>
            {PROFESSIONAL_CATEGORY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth required>
          <InputLabel>Qyteti</InputLabel>
          <Select label="Qyteti" value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {cities.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label="Përshkrimi" value={description} onChange={(e) => setDescription(e.target.value)} required fullWidth multiline minRows={4} />
        <TextField label="Shërbimet (opsionale)" value={servicesHighlight} onChange={(e) => setServicesHighlight(e.target.value)} fullWidth placeholder="p.sh. Dizajn · Branding · Web" />
        <TextField label="Telefon" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required fullWidth />
        <TextField
          label="Koha e përgjigjes (orë)"
          type="number"
          value={responseTimeHours}
          onChange={(e) => setResponseTimeHours(e.target.value)}
          fullWidth
          slotProps={{ htmlInput: { min: 1, max: 168 } }}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Çmimi nga (opsionale)" value={price} onChange={(e) => setPrice(e.target.value)} fullWidth />
          <FormControl fullWidth sx={{ minWidth: 120 }}>
            <InputLabel>Monedha</InputLabel>
            <Select label="Monedha" value={currency} onChange={(e) => setCurrency(e.target.value as 'EUR' | 'LEK' | '')}>
              <MenuItem value="">—</MenuItem>
              {CURRENCY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <TextField label="URL foto profili / kopertinë" value={imageUrlsText} onChange={(e) => setImageUrlsText(e.target.value)} fullWidth multiline minRows={2} />

        <Divider />

        <Stack spacing={1.5}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Portofoli
            </Typography>
            <Button size="small" startIcon={<PlusIcon size={16} />} onClick={addPortfolio}>
              Projekt
            </Button>
          </Stack>
          {portfolio.map((item, index) => (
            <Box key={item.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setPortfolio((prev) => prev.filter((p) => p.id !== item.id))}
                >
                  <TrashIcon size={16} />
                </IconButton>
              </Stack>
              <Stack spacing={1}>
                <TextField
                  size="small"
                  label="Titulli i projektit"
                  value={item.title}
                  onChange={(e) => {
                    const next = [...portfolio];
                    next[index] = { ...item, title: e.target.value };
                    setPortfolio(next);
                  }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Vendndodhja (opsionale)"
                  value={item.location ?? ''}
                  onChange={(e) => {
                    const next = [...portfolio];
                    next[index] = { ...item, location: e.target.value };
                    setPortfolio(next);
                  }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="URL foto"
                  value={item.imageUrl}
                  onChange={(e) => {
                    const next = [...portfolio];
                    next[index] = { ...item, imageUrl: e.target.value };
                    setPortfolio(next);
                  }}
                  fullWidth
                  required
                />
              </Stack>
            </Box>
          ))}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          {backHref ? (
            <Button component={RouterLink} href={backHref} color="inherit">
              {backLabel ?? 'Kthehu'}
            </Button>
          ) : null}
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Duke ruajtur…' : 'Publiko profilin'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

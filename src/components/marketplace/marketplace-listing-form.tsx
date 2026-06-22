'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Button,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import {
  MARKETPLACE_CATEGORY_OPTIONS,
  MARKETPLACE_CONDITION_OPTIONS,
} from '@/lib/marketplace-constants';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { useUser } from '@/hooks/use-user';
import { createMarketplaceListing } from '@/lib/listings-client';
import { uploadListingImages } from '@/lib/uploads-client';

const MAX_MARKETPLACE_IMAGES = 5;

function contactPhoneInitialFromStorage(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('user-data');
    if (!raw) return '';
    const u = JSON.parse(raw) as { phone?: string };
    return typeof u.phone === 'string' ? u.phone.trim() : '';
  } catch {
    return '';
  }
}

function parseFloatStrict(s: string): number | null {
  const t = s.trim();
  if (t === '' || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export interface MarketplaceListingFormProps {
  onSuccess?: () => void;
  backHref?: string;
  backLabel?: string;
}

type MarketplaceFormState = {
  transactionType: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string;
  currency: '' | 'EUR' | 'LEK';
  cityId: string;
  contactPhone: string;
};

function emptyForm(): MarketplaceFormState {
  return {
    transactionType: 'shes',
    title: '',
    description: '',
    category: '',
    condition: '',
    price: '',
    currency: '',
    cityId: '',
    contactPhone: '',
  };
}

function validateForm(f: MarketplaceFormState): string | null {
  if (!f.title.trim()) return 'Titulli i njoftimit është i detyrueshëm.';
  if (!f.description.trim()) return 'Përshkrimi është i detyrueshëm.';
  if (!f.category) return 'Ju lutem zgjidhni kategorinë e artikullit.';
  if (!f.condition) return 'Ju lutem zgjidhni gjendjen e artikullit.';

  if (f.price.trim()) {
    const p = parseFloatStrict(f.price);
    if (p === null || p < 0) return 'Çmimi duhet të jetë një numër pozitiv.';
    if (f.currency !== 'EUR' && f.currency !== 'LEK') return 'Ju lutem zgjidhni monedhën.';
  }

  if (!f.cityId) return 'Ju lutem zgjidhni qytetin.';

  const phone = f.contactPhone.trim();
  if (phone.length < 6) return 'Numri i telefonit duhet të ketë të paktën 6 karaktere.';
  if (phone.length > 40) return 'Numri i telefonit është shumë i gjatë.';
  if (!/^[\d+\s().-]{6,40}$/.test(phone)) {
    return 'Numri i telefonit mund të përmbajë vetëm shifra, hapësira dhe + ( ) . -';
  }

  return null;
}

export function MarketplaceListingForm({ onSuccess, backHref, backLabel = 'Mbrapa' }: MarketplaceListingFormProps) {
  const { user } = useUser();

  const [form, setForm] = React.useState<MarketplaceFormState>(() => ({
    ...emptyForm(),
    contactPhone: contactPhoneInitialFromStorage(),
  }));
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [images, setImages] = React.useState<File[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(true);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listRealEstateLocationsPublic();
      if (cancelled) return;
      setCities(res.cities ?? []);
      setLoadingCities(false);
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (!user) return;
    const p = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (!p) return;
    setForm((prev) => {
      if (prev.contactPhone.trim()) return prev;
      return { ...prev, contactPhone: p };
    });
  }, [user]);

  const onField =
    (key: keyof MarketplaceFormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: ev.target.value }));
    };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);
    const err = validateForm(form);
    if (err) { setSubmitError(err); return; }

    setSubmitting(true);
    try {
      const hasPrice = Boolean(form.price.trim());
      let imageUrls: string[] = [];
      if (images.length) {
        const up = await uploadListingImages(images, 'marketplace');
        if (up.error) { setSubmitError(up.error); return; }
        imageUrls = up.urls;
      }
      const payload = {
        transactionType: 'shes',
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        condition: form.condition,
        price: hasPrice ? parseFloatStrict(form.price) : null,
        currency: hasPrice ? form.currency : null,
        cityId: form.cityId,
        contactPhone: form.contactPhone.trim(),
        imageUrls,
      };
      const { error } = await createMarketplaceListing(payload);
      if (error) { setSubmitError(error); return; }
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack component="form" spacing={3} onSubmit={(e) => void handleSubmit(e)}>
      {submitError ? (
        <Alert severity="error" sx={{ borderRadius: 1.5 }}>{submitError}</Alert>
      ) : null}

      {/* ── Detajet e artikullit ──────────────────────────────────────────── */}
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Detajet e artikullit
            </Typography>

            <TextField
              label="Titulli i njoftimit"
              value={form.title}
              onChange={onField('title')}
              required
              fullWidth
              placeholder="p.sh. iPhone 14 Pro Max 256GB, Karrige zyre, Çantë Adidas…"
            />

            <TextField
              label="Përshkrimi"
              value={form.description}
              onChange={onField('description')}
              required
              fullWidth
              multiline
              minRows={4}
              placeholder="Përshkruani artikullin, gjendjen, çdo detaj të rëndësishëm…"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <SearchableSelect
                label="Kategoria"
                value={form.category}
                onChange={(v) => setForm((p) => ({ ...p, category: v }))}
                options={MARKETPLACE_CATEGORY_OPTIONS}
                emptyLabel="Zgjidhni kategorinë…"
                required
              />

              <SearchableSelect
                label="Gjendja"
                value={form.condition}
                onChange={(v) => setForm((p) => ({ ...p, condition: v }))}
                options={MARKETPLACE_CONDITION_OPTIONS}
                emptyLabel="Zgjidhni gjendjen…"
                required
              />
            </Stack>
          </Stack>

          <Divider />

          {/* ── Çmimi & Qyteti ───────────────────────────────────────────── */}
          <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Çmimi dhe vendndodhja
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Çmimi"
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={onField('price')}
              fullWidth
              placeholder="p.sh. 5000"
              helperText="Opsionale — lëreni bosh nëse është me marrëveshje."
              slotProps={{ input: { endAdornment: <InputAdornment position="end">/ copë</InputAdornment> } }}
            />
            <SearchableSelect
              label="Monedha"
              value={form.currency}
              onChange={(v) => setForm((p) => ({ ...p, currency: v as MarketplaceFormState['currency'] }))}
              options={CURRENCY_OPTIONS}
              emptyLabel="Zgjidhni…"
              disabled={!form.price.trim()}
            />
          </Stack>

            <SearchableSelect
              label="Qyteti"
              value={form.cityId}
              onChange={(v) => setForm((p) => ({ ...p, cityId: v }))}
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
              emptyLabel="Zgjidhni qytetin…"
              required
              disabled={loadingCities || cities.length === 0}
            />

            <TextField
              label="Numri i telefonit"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.contactPhone}
              onChange={onField('contactPhone')}
              required
              fullWidth
              helperText="Do të shfaqet tek të interesuarit për këtë njoftim."
            />
          </Stack>

          <Divider />

          {/* ── Foto ─────────────────────────────────────────────────────── */}
          <ListingImagePicker
            value={images}
            onChange={setImages}
            max={MAX_MARKETPLACE_IMAGES}
            label="Foto të artikullit"
            disabled={submitting}
          />

          {/* ── Veprimet ─────────────────────────────────────────────────── */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1, justifyContent: 'flex-end' }}>
            {backHref ? (
              <Button component={RouterLink} href={backHref} variant="outlined" color="inherit">
                {backLabel}
              </Button>
            ) : null}
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Duke ruajtur…' : 'Ruaj njoftimin'}
            </Button>
          </Stack>
    </Stack>
  );
}

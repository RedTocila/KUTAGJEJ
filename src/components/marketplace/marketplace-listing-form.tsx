'use client';

import * as React from 'react';
import {
  Alert,
  InputAdornment,
  Stack,
} from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';

import { SearchableSelect } from '@/components/core/searchable-select';
import {
  ListingFormActions,
  ListingFormSection,
  ListingTextField,
} from '@/components/user/listing-form-ui';
import {
  activateOkazionAfterCreate,
  OkazionBoostUpsell,
  OkazionPostActions,
  type OkazionBoostMode,
  type OkazionPayMode,
} from '@/components/user/okazion-boost-upsell';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import {
  MARKETPLACE_CATEGORY_OPTIONS,
  MARKETPLACE_CONDITION_OPTIONS,
} from '@/lib/marketplace-constants';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { useUser } from '@/hooks/use-user';
import { createMarketplaceListing, updateMarketplaceListing, type MarketplaceMineListing } from '@/lib/listings-client';
import { contactPhoneFromStorage, resolveContactPhone } from '@/lib/listing-form-defaults';
import { uploadListingImages } from '@/lib/uploads-client';
import { useRouter, useSearchParams } from 'next/navigation';

const MAX_MARKETPLACE_IMAGES = 5;


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
  editListingId?: string;
  initialListing?: MarketplaceMineListing | null;
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

function formFromListing(l: MarketplaceMineListing): MarketplaceFormState {
  const hasPrice = l.price != null;
  return {
    transactionType: 'shes',
    title: l.title || '',
    description: l.description || '',
    category: l.category || '',
    condition: l.condition || '',
    price: hasPrice ? String(l.price) : '',
    currency: l.currency === 'EUR' || l.currency === 'LEK' ? l.currency : hasPrice ? 'EUR' : '',
    cityId: l.cityId ? String(l.cityId) : '',
    contactPhone: l.contactPhone || '',
  };
}

export function MarketplaceListingForm({
  onSuccess,
  backHref,
  backLabel = 'Mbrapa',
  editListingId,
  initialListing,
}: MarketplaceListingFormProps) {
  const isEdit = Boolean(editListingId);
  const { user, checkSession } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsOkazion = searchParams.get('okazion') === '1';

  const [form, setForm] = React.useState<MarketplaceFormState>(() =>
    initialListing ? formFromListing(initialListing) : { ...emptyForm(), contactPhone: contactPhoneFromStorage() },
  );
  const [okazionMode, setOkazionMode] = React.useState<OkazionBoostMode>(wantsOkazion ? 'buy-card' : 'off');
  const okazionPayRef = React.useRef<OkazionPayMode>('buy-card');
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [images, setImages] = React.useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>(
    () => (initialListing?.imageUrls ?? []).filter(Boolean),
  );
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
    if (!initialListing) return;
    setForm(formFromListing(initialListing));
    setExistingImageUrls((initialListing.imageUrls ?? []).filter(Boolean));
    setImages([]);
  }, [initialListing]);

  // AI drafts sometimes only have cityName — map it to cityId once cities load.
  React.useEffect(() => {
    if (!initialListing || form.cityId || !cities.length) return;
    const name = String(initialListing.cityName || '').trim().toLowerCase();
    if (!name) return;
    const match =
      cities.find((c) => c.name.toLowerCase() === name) ||
      cities.find(
        (c) => c.name.toLowerCase().includes(name) || name.includes(c.name.toLowerCase()),
      );
    if (match) setForm((prev) => (prev.cityId ? prev : { ...prev, cityId: match.id }));
  }, [initialListing, cities, form.cityId]);

  React.useEffect(() => {
    if (isEdit) return;
    const p = resolveContactPhone(user);
    if (!p) return;
    setForm((prev) => {
      if (prev.contactPhone.trim()) return prev;
      return { ...prev, contactPhone: p };
    });
  }, [user, isEdit]);

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
      let uploaded: string[] = [];
      if (images.length) {
        const up = await uploadListingImages(images, 'marketplace');
        if (up.error) { setSubmitError(up.error); return; }
        uploaded = up.urls;
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
        imageUrls: [...existingImageUrls, ...uploaded].slice(0, MAX_MARKETPLACE_IMAGES),
      };
      const result =
        isEdit && editListingId
          ? await updateMarketplaceListing(editListingId, payload)
          : await createMarketplaceListing(payload);
      if (result.error) { setSubmitError(result.error); return; }
      if (!isEdit && result.id && (wantsOkazion || okazionMode !== 'off')) {
        const boost = await activateOkazionAfterCreate({
          mode: wantsOkazion ? okazionPayRef.current : okazionMode,
          kind: 'marketplace',
          listingId: result.id,
        });
        if (boost.redirectToCheckout) {
          router.push(boost.redirectToCheckout);
          return;
        }
        if (!boost.ok && boost.message) {
          setSubmitError(boost.message);
        }
        void checkSession();
      }
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack
      ref={formRef}
      component="form"
      spacing={2.25}
      onSubmit={(e) => void handleSubmit(e)}
    >
      {submitError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {submitError}
        </Alert>
      ) : null}

      <ListingFormSection
        icon={<PackageIcon size={20} weight="duotone" />}
        title="Detajet e artikullit"
        description="Titulli, përshkrimi dhe kategoria e produktit."
      >
        <ListingTextField
          label="Titulli i njoftimit"
          value={form.title}
          onChange={onField('title')}
          required
          fullWidth
          placeholder="p.sh. iPhone 14 Pro Max 256GB, Karrige zyre, Çantë Adidas…"
        />
        <ListingImagePicker
          value={images}
          onChange={setImages}
          existingUrls={existingImageUrls}
          onExistingUrlsChange={setExistingImageUrls}
          max={MAX_MARKETPLACE_IMAGES}
          label="Foto të artikullit"
          disabled={submitting}
        />
        <ListingTextField
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
      </ListingFormSection>

      <ListingFormSection
        icon={<MapPinIcon size={20} weight="duotone" />}
        title="Çmimi dhe vendndodhja"
        description="Vendosni çmimin, monedhën dhe qytetin."
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <ListingTextField
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
        <ListingTextField
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
      </ListingFormSection>

      {!isEdit && !wantsOkazion ? (
        <OkazionBoostUpsell value={okazionMode} onChange={setOkazionMode} />
      ) : null}

      {wantsOkazion && !isEdit ? (
        <OkazionPostActions
          submitting={submitting}
          onPost={(mode) => {
            okazionPayRef.current = mode;
            setOkazionMode(mode);
            formRef.current?.requestSubmit();
          }}
        />
      ) : (
        <ListingFormActions
          submitLabel={isEdit ? 'Përditëso njoftimin' : 'Ruaj njoftimin'}
          submitting={submitting}
          backHref={backHref}
          backLabel={backLabel}
        />
      )}
    </Stack>
  );
}

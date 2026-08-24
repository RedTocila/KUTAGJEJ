'use client';

import * as React from 'react';
import {
  InputAdornment,
  Stack,
} from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingMapsLocationFields } from '@/components/listings/listing-maps-location-fields';
import {
  ListingDescriptionField,
  ListingFormActionError,
  ListingFormActions,
  ListingFormSection,
  ListingTextField,
} from '@/components/user/listing-form-ui';
import { ListingBoostChoiceBar } from '@/components/user/listing-boost-choice-bar';
import {
  activateOkazionAfterCreate,
  OkazionPostActions,
  type OkazionBoostMode,
  type OkazionPayMode,
} from '@/components/user/okazion-boost-upsell';
import {
  activatePremiumAfterCreate,
  PREMIUM_PACKAGE_ID,
  PremiumPostActions,
  type PremiumPayMode,
} from '@/components/user/premium-boost-upsell';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import {
  MARKETPLACE_CATEGORY_OPTIONS,
  MARKETPLACE_CONDITION_OPTIONS,
} from '@/lib/marketplace-constants';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { useUser } from '@/hooks/use-user';
import { createMarketplaceListing, updateMarketplaceListing, type MarketplaceMineListing } from '@/lib/listings-client';
import { useCreateListingDefaults } from '@/hooks/use-create-listing-defaults';
import {
  applyEmptyKnownDefaults,
  knownCreateDefaultsFromStorage,
} from '@/lib/listing-form-defaults';
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
  originalPrice: string;
  currency: '' | 'EUR' | 'LEK';
  cityId: string;
  mapsUrl: string;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
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
    originalPrice: '',
    currency: 'EUR',
    cityId: '',
    mapsUrl: '',
    locationLat: null,
    locationLng: null,
    locationAddress: null,
    contactPhone: '',
  };
}

function validateForm(f: MarketplaceFormState): string | null {
  if (!f.title.trim()) return 'Titulli i njoftimit është i detyrueshëm.';

  const price = parseFloatStrict(f.price);
  if (price === null || price < 0) return 'Vendosni një çmim të vlefshëm.';
  if (f.currency && f.currency !== 'EUR' && f.currency !== 'LEK') return 'Ju lutem zgjidhni monedhën.';

  if (f.originalPrice.trim()) {
    const was = parseFloatStrict(f.originalPrice);
    if (was === null || was < 0) return 'Çmimi i mëparshëm duhet të jetë një numër pozitiv.';
    if (was <= price) return 'Çmimi i mëparshëm duhet të jetë më i lartë se çmimi aktual.';
  }

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
    originalPrice: l.originalPrice != null ? String(l.originalPrice) : '',
    currency: l.currency === 'EUR' || l.currency === 'LEK' ? l.currency : hasPrice ? 'EUR' : '',
    cityId: l.cityId ? String(l.cityId) : '',
    mapsUrl: l.mapsUrl ?? '',
    locationLat: l.locationLat ?? null,
    locationLng: l.locationLng ?? null,
    locationAddress: l.locationAddress ?? null,
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
  const { checkSession } = useUser();
  const { applyTo: applyKnown, rememberLocation } = useCreateListingDefaults({ enabled: !isEdit });
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsOkazion = searchParams.get('okazion') === '1';
  const wantsPremium = searchParams.get('premium') === '1';

  const [form, setForm] = React.useState<MarketplaceFormState>(() => {
    const base = initialListing ? formFromListing(initialListing) : emptyForm();
    return applyEmptyKnownDefaults(base, knownCreateDefaultsFromStorage()) as MarketplaceFormState;
  });
  const okazionPayRef = React.useRef<OkazionBoostMode>('buy-card');
  const premiumPayRef = React.useRef<PremiumPayMode>('buy-card');
  const premiumPackageIdRef = React.useRef(PREMIUM_PACKAGE_ID);
  const boostKindRef = React.useRef<'premium' | 'okazion' | null>(null);
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
    setForm(
      applyEmptyKnownDefaults(
        formFromListing(initialListing),
        knownCreateDefaultsFromStorage(),
      ) as MarketplaceFormState,
    );
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
    setForm((prev) => applyKnown(prev) as MarketplaceFormState);
  }, [isEdit, applyKnown]);

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
    if (existingImageUrls.length + images.length < 1) {
      setSubmitError('Shtoni të paktën një foto.');
      return;
    }

    setSubmitting(true);
    try {
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
        category: form.category || null,
        condition: form.condition || null,
        price: parseFloatStrict(form.price),
        originalPrice: form.originalPrice.trim() ? parseFloatStrict(form.originalPrice) : null,
        currency: form.currency === 'LEK' ? 'LEK' : 'EUR',
        cityId: form.cityId || null,
        mapsUrl: form.mapsUrl.trim() || null,
        contactPhone: form.contactPhone.trim(),
        imageUrls: [...existingImageUrls, ...uploaded].slice(0, MAX_MARKETPLACE_IMAGES),
      };
      const result =
        isEdit && editListingId
          ? await updateMarketplaceListing(editListingId, payload)
          : await createMarketplaceListing(payload);
      if (result.error) { setSubmitError(result.error); return; }
      if (!isEdit) {
        rememberLocation({ cityId: form.cityId });
      }
      if (!isEdit && result.id && (wantsPremium || boostKindRef.current === 'premium')) {
        const boost = await activatePremiumAfterCreate({
          mode: premiumPayRef.current,
          kind: 'marketplace',
          listingId: result.id,
          packageId: premiumPackageIdRef.current,
        });
        if (boost.redirectToCheckout) {
          router.push(boost.redirectToCheckout);
          return;
        }
        if (!boost.ok && boost.message) {
          setSubmitError(boost.message);
        }
        void checkSession();
      } else if (!isEdit && result.id && (wantsOkazion || boostKindRef.current === 'okazion')) {
        const boost = await activateOkazionAfterCreate({
          mode: okazionPayRef.current,
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
      <ListingFormSection
        icon={<PackageIcon size={20} weight="duotone" />}
        title="Detajet e artikullit"
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
          label="Foto"
          disabled={submitting}
        />
        <ListingDescriptionField
          label="Përshkrimi"
          value={form.description}
          onChange={onField('description')}
          fullWidth
          placeholder="Përshkruani artikullin, gjendjen, çdo detaj të rëndësishëm…"
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SearchableSelect
            label="Kategoria"
            value={form.category}
            onChange={(v) => setForm((p) => ({ ...p, category: v }))}
            options={MARKETPLACE_CATEGORY_OPTIONS}
            emptyLabel="Zgjidhni kategorinë…"
            clearable
            allowCustom
          />
          <SearchableSelect
            label="Gjendja"
            value={form.condition}
            onChange={(v) => setForm((p) => ({ ...p, condition: v }))}
            options={MARKETPLACE_CONDITION_OPTIONS}
          emptyLabel="Zgjidhni gjendjen… (opsionale)"
          clearable
          />
        </Stack>
      </ListingFormSection>

      <ListingFormSection
        icon={<MapPinIcon size={20} weight="duotone" />}
        title="Çmimi dhe vendndodhja"
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <ListingTextField
            label="Çmimi"
            type="text"
            inputMode="decimal"
            value={form.price}
            onChange={onField('price')}
            required
            fullWidth
            placeholder="p.sh. 5000"
            slotProps={{ input: { endAdornment: <InputAdornment position="end">/ copë</InputAdornment> } }}
          />
          <ListingTextField
            label="Çmimi i mëparshëm"
            type="text"
            inputMode="decimal"
            value={form.originalPrice}
            onChange={onField('originalPrice')}
            fullWidth
            placeholder="p.sh. 6500"
          />
          <SearchableSelect
            label="Monedha"
            value={form.currency}
            onChange={(v) => setForm((p) => ({ ...p, currency: v as MarketplaceFormState['currency'] }))}
            options={CURRENCY_OPTIONS}
            emptyLabel="Zgjidhni…"
            required
          />
        </Stack>
        <SearchableSelect
          label="Qyteti"
          value={form.cityId}
          onChange={(v) => setForm((p) => ({ ...p, cityId: v }))}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Zgjidhni qytetin… (opsionale)"
          clearable
          disabled={loadingCities || cities.length === 0}
        />
        <ListingMapsLocationFields
          value={{
            mapsUrl: form.mapsUrl,
            locationLat: form.locationLat,
            locationLng: form.locationLng,
            locationAddress: form.locationAddress,
          }}
          onChange={(next) =>
            setForm((p) => ({
              ...p,
              mapsUrl: next.mapsUrl,
              locationLat: next.locationLat,
              locationLng: next.locationLng,
              locationAddress: next.locationAddress,
            }))
          }
          cityName={cities.find((c) => c.id === form.cityId)?.name}
          showPreview
          disabled={submitting}
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
        />
      </ListingFormSection>

      <Stack spacing={1.25}>
        <ListingFormActionError error={submitError} />
        {wantsPremium && !isEdit ? (
          <PremiumPostActions
            submitting={submitting}
            onPost={(mode) => {
              premiumPayRef.current = mode;
              boostKindRef.current = 'premium';
              formRef.current?.requestSubmit();
            }}
          />
        ) : wantsOkazion && !isEdit ? (
          <OkazionPostActions
            submitting={submitting}
            onPost={(mode: OkazionPayMode) => {
              okazionPayRef.current = mode;
              boostKindRef.current = 'okazion';
              formRef.current?.requestSubmit();
            }}
          />
        ) : (
          <>
            {!isEdit ? (
              <ListingBoostChoiceBar
                submitting={submitting}
                onPostPremium={(mode, packageId) => {
                  premiumPayRef.current = mode;
                  premiumPackageIdRef.current = packageId;
                  boostKindRef.current = 'premium';
                  formRef.current?.requestSubmit();
                }}
                onPostOkazion={(mode) => {
                  okazionPayRef.current = mode;
                  boostKindRef.current = 'okazion';
                  formRef.current?.requestSubmit();
                }}
              />
            ) : null}
            <ListingFormActions
              submitLabel={isEdit ? 'Përditëso njoftimin' : 'Posto'}
              submitting={submitting}
              backHref={backHref}
              backLabel={backLabel}
              submitProps={{
                onClick: () => {
                  boostKindRef.current = null;
                },
              }}
            />
          </>
        )}
      </Stack>
    </Stack>
  );
}

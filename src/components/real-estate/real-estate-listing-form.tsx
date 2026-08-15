'use client';

import * as React from 'react';
import {
  Alert,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';

import {
  CONDITION_OPTIONS,
  CURRENCY_OPTIONS,
  FURNISHING_OPTIONS,
  needsBedroomsBathFurnishing,
  needsCondition,
  needsFloor,
  needsParkingFloor,
  needsTotalFloors,
  needsYearBuilt,
  REAL_ESTATE_PROPERTY_CATEGORIES,
  TRANSACTION_OPTIONS,
} from '@/lib/real-estate-constants';
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
import type { RealEstatePropertySlug } from '@/lib/real-estate-constants';
import { useUser } from '@/hooks/use-user';
import { createRealEstateListing, updateRealEstateListing, type RealEstateListingPayload } from '@/lib/listings-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { useCreateListingDefaults } from '@/hooks/use-create-listing-defaults';
import {
  applyEmptyKnownDefaults,
  knownCreateDefaultsFromStorage,
} from '@/lib/listing-form-defaults';
import { useRouter, useSearchParams } from 'next/navigation';

const MAX_REAL_ESTATE_IMAGES = 8;


export interface RealEstateListingFormProps {
  /** Called after a successful save (e.g. redirect to dashboard). */
  onSuccess?: () => void;
  /** Optional back link shown next to submit. */
  backHref?: string;
  backLabel?: string;
  /** When set, form updates this listing instead of creating. */
  editListingId?: string;
  initialListing?: RealEstateMineListing | null;
}

type FormState = {
  propertyCategory: RealEstatePropertySlug | '';
  title: string;
  description: string;
  transactionType: '' | 'rent' | 'sale';
  price: string;
  originalPrice: string;
  surfaceM2: string;
  cityId: string;
  zoneId: string;
  mapsUrl: string;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
  currency: '' | 'EUR' | 'LEK';
  condition: (typeof CONDITION_OPTIONS)[number]['value'] | '';
  floor: string;
  totalFloors: string;
  parkingFloor: string;
  bedrooms: string;
  bathrooms: string;
  furnishing: (typeof FURNISHING_OPTIONS)[number]['value'] | '';
  yearBuilt: string;
  contactPhone: string;
};

function emptyForm(): FormState {
  return {
    propertyCategory: '',
    title: '',
    description: '',
    transactionType: '',
    price: '',
    originalPrice: '',
    surfaceM2: '',
    cityId: '',
    zoneId: '',
    mapsUrl: '',
    locationLat: null,
    locationLng: null,
    locationAddress: null,
    currency: '',
    condition: '',
    floor: '',
    totalFloors: '',
    parkingFloor: '',
    bedrooms: '',
    bathrooms: '',
    furnishing: '',
    yearBuilt: '',
    contactPhone: '',
  };
}

function parseIntStrict(s: string): number | null {
  const t = s.trim();
  if (t === '' || !/^-?\d+$/.test(t)) return null;
  return Number.parseInt(t, 10);
}

function parseFloatStrict(s: string): number | null {
  const t = s.trim();
  if (t === '' || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function validateForm(f: FormState): string | null {
  if (!f.propertyCategory) return 'Ju lutemi zgjidhni llojin e pronës.';
  if (!f.title.trim()) return 'Titulli është i detyrueshëm.';
  if (!f.description.trim()) return 'Përshkrimi është i detyrueshëm.';
  if (f.transactionType !== 'rent' && f.transactionType !== 'sale') {
    return 'Ju lutemi zgjidhni me qira ose në shitje.';
  }
  const price = parseFloatStrict(f.price);
  if (price === null || price < 0) return 'Vendosni një çmim të vlefshëm.';
  if (f.currency !== 'EUR' && f.currency !== 'LEK') return 'Ju lutemi zgjidhni monedhën.';
  if (f.originalPrice.trim()) {
    const was = parseFloatStrict(f.originalPrice);
    if (was === null || was < 0) return 'Çmimi i mëparshëm duhet të jetë një numër pozitiv.';
    if (was <= price) return 'Çmimi i mëparshëm duhet të jetë më i lartë se çmimi aktual.';
  }
  const surface = parseFloatStrict(f.surfaceM2);
  if (surface === null || surface <= 0) return 'Sipërfaqja duhet të jetë numër pozitiv (m²).';
  if (!f.cityId || !f.zoneId) return 'Ju lutemi zgjidhni qytetin dhe zonën.';

  const cat = f.propertyCategory;

  if (needsCondition(cat) && f.condition) {
    const ok = CONDITION_OPTIONS.some((o) => o.value === f.condition);
    if (!ok) return 'Ju lutemi zgjidhni gjendjen.';
  }

  if (needsFloor(cat) && f.floor.trim()) {
    const fl = parseIntStrict(f.floor);
    if (fl === null) return 'Kati duhet të jetë numër i plotë (p.sh. 1, 2, …).';
  }

  if (needsTotalFloors(cat) && f.totalFloors.trim()) {
    const tf = parseIntStrict(f.totalFloors);
    if (tf === null || tf < 1) return 'Numri i kateve duhet të jetë numër i plotë pozitiv.';
  }

  if (needsParkingFloor(cat) && f.parkingFloor.trim()) {
    const pf = parseIntStrict(f.parkingFloor);
    if (pf === null) return 'Niveli i parkimit duhet të jetë numër i plotë (negativ për nëntokë).';
  }

  if (needsBedroomsBathFurnishing(cat)) {
    if (f.bedrooms.trim()) {
      const br = parseIntStrict(f.bedrooms);
      if (br === null || br < 0) return 'Dhomat e gjumit duhet të jenë numër i plotë (0 ose më shumë).';
    }
    if (f.bathrooms.trim()) {
      const ba = parseIntStrict(f.bathrooms);
      if (ba === null || ba < 0) return 'Banjot duhet të jenë numër i plotë (0 ose më shumë).';
    }
    if (f.furnishing) {
      const okF = FURNISHING_OPTIONS.some((o) => o.value === f.furnishing);
      if (!okF) return 'Ju lutemi zgjidhni mobilimin.';
    }
  }

  if (needsYearBuilt(cat) && f.yearBuilt.trim()) {
    const y = parseIntStrict(f.yearBuilt);
    if (y === null || y < 1800 || y > 2100) return 'Viti i ndërtimit duhet të jetë vit i vlefshëm.';
  }

  const phone = f.contactPhone.trim();
  if (phone.length < 6) return 'Vendosni një numër telefoni të vlefshëm (të paktën 6 karaktere).';
  if (phone.length > 40) return 'Numri i telefonit është shumë i gjatë.';
  if (!/^[\d+\s().-]{6,40}$/.test(phone)) {
    return 'Numri i telefonit mund të përmbajë vetëm shifra, hapësira dhe + ( ) . -';
  }

  return null;
}

function buildPayload(f: FormState): RealEstateListingPayload {
  const cat = f.propertyCategory as RealEstatePropertySlug;
  const payload: RealEstateListingPayload = {
    propertyCategory: cat,
    title: f.title.trim(),
    description: f.description.trim(),
    transactionType: f.transactionType as 'rent' | 'sale',
    price: parseFloatStrict(f.price)!,
    originalPrice: f.originalPrice.trim() ? parseFloatStrict(f.originalPrice) : null,
    currency: f.currency as 'EUR' | 'LEK',
    surfaceM2: parseFloatStrict(f.surfaceM2)!,
    cityId: f.cityId,
    zoneId: f.zoneId,
    mapsUrl: f.mapsUrl.trim() || null,
    contactPhone: f.contactPhone.trim(),
  };
  if (needsCondition(cat) && f.condition) {
    payload.condition = f.condition as RealEstateListingPayload['condition'];
  }
  if (needsFloor(cat) && f.floor.trim()) payload.floor = parseIntStrict(f.floor)!;
  if (needsTotalFloors(cat) && f.totalFloors.trim()) payload.totalFloors = parseIntStrict(f.totalFloors)!;
  if (needsParkingFloor(cat) && f.parkingFloor.trim()) payload.parkingFloor = parseIntStrict(f.parkingFloor)!;
  if (needsBedroomsBathFurnishing(cat)) {
    if (f.bedrooms.trim()) payload.bedrooms = parseIntStrict(f.bedrooms)!;
    if (f.bathrooms.trim()) payload.bathrooms = parseIntStrict(f.bathrooms)!;
    if (f.furnishing) payload.furnishing = f.furnishing as RealEstateListingPayload['furnishing'];
  }
  if (needsYearBuilt(cat) && f.yearBuilt.trim()) {
    payload.yearBuilt = parseIntStrict(f.yearBuilt)!;
  }
  return payload;
}

function formFromListing(l: RealEstateMineListing): FormState {
  return {
    propertyCategory: (l.propertyCategory as RealEstatePropertySlug) || '',
    title: l.title || '',
    description: l.description || '',
    transactionType: l.transactionType === 'rent' || l.transactionType === 'sale' ? l.transactionType : '',
    price: l.price != null ? String(l.price) : '',
    originalPrice: l.originalPrice != null ? String(l.originalPrice) : '',
    surfaceM2: l.surfaceM2 != null ? String(l.surfaceM2) : '',
    cityId: l.cityId ? String(l.cityId) : '',
    zoneId: l.zoneId ? String(l.zoneId) : '',
    mapsUrl: l.mapsUrl ?? '',
    locationLat: l.locationLat ?? null,
    locationLng: l.locationLng ?? null,
    locationAddress: l.locationAddress ?? null,
    currency: l.currency === 'EUR' || l.currency === 'LEK' ? l.currency : '',
    condition: (l.condition as FormState['condition']) || '',
    floor: l.floor != null ? String(l.floor) : '',
    totalFloors: l.totalFloors != null ? String(l.totalFloors) : '',
    parkingFloor: l.parkingFloor != null ? String(l.parkingFloor) : '',
    bedrooms: l.bedrooms != null ? String(l.bedrooms) : '',
    bathrooms: l.bathrooms != null ? String(l.bathrooms) : '',
    furnishing: (l.furnishing as FormState['furnishing']) || '',
    yearBuilt: l.yearBuilt != null ? String(l.yearBuilt) : '',
    contactPhone: l.contactPhone || '',
  };
}

export function RealEstateListingForm(props: RealEstateListingFormProps) {
  const { onSuccess, backHref, backLabel = 'Prapa', editListingId, initialListing } = props;
  const isEdit = Boolean(editListingId);
  const { checkSession } = useUser();
  const { applyTo: applyKnown, rememberLocation } = useCreateListingDefaults({
    enabled: !isEdit,
    withZone: true,
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsOkazion = searchParams.get('okazion') === '1';
  const wantsPremium = searchParams.get('premium') === '1';
  const [form, setForm] = React.useState<FormState>(() => {
    const base = initialListing ? formFromListing(initialListing) : emptyForm();
    return applyEmptyKnownDefaults(base, knownCreateDefaultsFromStorage(), {
      withZone: true,
    }) as FormState;
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
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [loadingRefs, setLoadingRefs] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const zonesForCity = React.useMemo(() => {
    const c = cities.find((x) => x.id === form.cityId);
    return c?.zones ?? [];
  }, [cities, form.cityId]);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setLoadingRefs(true);
    void (async () => {
      const locRes = await listRealEstateLocationsPublic();
      if (cancelled) return;
      if (locRes.error) {
        setLoadError(locRes.error ?? 'Të dhënat e formularit nuk u ngarkuan.');
        setCities([]);
      } else {
        setCities(locRes.cities ?? []);
      }
      setLoadingRefs(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!initialListing) return;
    setForm(
      applyEmptyKnownDefaults(formFromListing(initialListing), knownCreateDefaultsFromStorage(), {
        withZone: true,
      }) as FormState,
    );
    setExistingImageUrls((initialListing.imageUrls ?? []).filter(Boolean));
    setImages([]);
  }, [initialListing]);

  React.useEffect(() => {
    if (isEdit) return;
    setForm((prev) => applyKnown(prev) as FormState);
  }, [isEdit, applyKnown]);

  const onField =
    (key: keyof FormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: ev.target.value }));
    };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);
    const err = validateForm(form);
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload(form);
      let uploaded: string[] = [];
      if (images.length) {
        const up = await uploadListingImages(images, 'real-estate');
        if (up.error) {
          setSubmitError(up.error);
          return;
        }
        uploaded = up.urls;
      }
      payload.imageUrls = [...existingImageUrls, ...uploaded].slice(0, MAX_REAL_ESTATE_IMAGES);
      const result = isEdit && editListingId
        ? await updateRealEstateListing(editListingId, payload)
        : await createRealEstateListing(payload);
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      if (!isEdit) {
        rememberLocation({ cityId: form.cityId, zoneId: form.zoneId });
      }
      if (!isEdit && result.id && (wantsPremium || boostKindRef.current === 'premium')) {
        const boost = await activatePremiumAfterCreate({
          mode: premiumPayRef.current,
          kind: 'real-estate',
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
          kind: 'real-estate',
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

  const cat = form.propertyCategory;

  return (
    <Stack
      ref={formRef}
      component="form"
      spacing={2.25}
      onSubmit={(e) => void handleSubmit(e)}
    >
      {loadError ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {loadError}
        </Alert>
      ) : null}

      <ListingFormSection
        icon={<BuildingsIcon size={20} weight="duotone" />}
        title="Detajet e njoftimit"
        description="Plotësoni titullin, llojin e pronës dhe fushat e tjera sipas kategorisë."
      >
      <ListingTextField label="Titulli" value={form.title} onChange={onField('title')} required fullWidth />
      <ListingImagePicker
        value={images}
        onChange={setImages}
        existingUrls={existingImageUrls}
        onExistingUrlsChange={setExistingImageUrls}
        max={MAX_REAL_ESTATE_IMAGES}
        label="Foto"
        disabled={submitting}
      />
      <ListingDescriptionField
        label="Përshkrimi"
        value={form.description}
        onChange={onField('description')}
        required
        fullWidth
        minRows={3}
      />

      <SearchableSelect
        label="Lloji i pronës"
        value={form.propertyCategory}
        onChange={(v) => setForm((p) => ({ ...p, propertyCategory: v as RealEstatePropertySlug | '' }))}
        options={REAL_ESTATE_PROPERTY_CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))}
        emptyLabel="Zgjidh…"
        required
        disabled={loadingRefs}
      />

      <FormControl disabled={loadingRefs}>
        <FormLabel>Lloji i transaksionit</FormLabel>
        <RadioGroup
          row
          value={form.transactionType}
          onChange={(_, v) => setForm((p) => ({ ...p, transactionType: v as FormState['transactionType'] }))}
        >
          {TRANSACTION_OPTIONS.map((o) => (
            <FormControlLabel key={o.value} value={o.value} control={<Radio />} label={o.label} />
          ))}
        </RadioGroup>
      </FormControl>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <ListingTextField
          label="Çmimi"
          type="text"
          inputMode="decimal"
          value={form.price}
          onChange={onField('price')}
          required
          fullWidth
        />
        <ListingTextField
          label="Çmimi i mëparshëm"
          type="text"
          inputMode="decimal"
          value={form.originalPrice}
          onChange={onField('originalPrice')}
          fullWidth
          helperText="Opsionale — shfaqet i përshkruar (ishte…)."
        />
        <SearchableSelect
          label="Monedha"
          value={form.currency}
          onChange={(v) => setForm((p) => ({ ...p, currency: v as FormState['currency'] }))}
          options={CURRENCY_OPTIONS}
          emptyLabel="Zgjidh…"
          required
          disabled={loadingRefs}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <SearchableSelect
          label="Qyteti"
          value={form.cityId}
          onChange={(v) => setForm((p) => ({ ...p, cityId: v, zoneId: '' }))}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Zgjidh…"
          required
          disabled={loadingRefs || cities.length === 0}
        />
        <SearchableSelect
          label="Zona"
          value={form.zoneId}
          onChange={(v) => setForm((p) => ({ ...p, zoneId: v }))}
          options={zonesForCity.map((z) => ({ value: z.id, label: z.name }))}
          emptyLabel="Zgjidh…"
          required
          disabled={loadingRefs || !form.cityId || zonesForCity.length === 0}
        />
      </Stack>
      {!loadingRefs && cities.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Ende nuk ka qytete — një administrator i platformës duhet të shtojë qytete dhe zona te Paneli → Vendndodhjet (pasuri).
        </Typography>
      ) : null}
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
        zoneName={zonesForCity.find((z) => z.id === form.zoneId)?.name}
        showPreview
        disabled={submitting}
      />

      <ListingTextField
        label="Sipërfaqja"
        type="text"
        inputMode="decimal"
        value={form.surfaceM2}
        onChange={onField('surfaceM2')}
        required
        fullWidth
        helperText="Sipërfaqja e brendshme ose e truallit në metra katrorë (m²)."
        slotProps={{
          input: {
            endAdornment: <InputAdornment position="end">m²</InputAdornment>,
          },
        }}
      />

      {cat ? (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 700 }}>
            Detaje sipas kategorisë
          </Typography>
        </>
      ) : null}

      {needsCondition(cat) ? (
        <SearchableSelect
          label="Gjendja"
          value={form.condition}
          onChange={(v) => setForm((p) => ({ ...p, condition: v as FormState['condition'] }))}
          options={CONDITION_OPTIONS}
          emptyLabel="Zgjidh…"
          clearable
          disabled={loadingRefs}
        />
      ) : null}

      {needsFloor(cat) ? (
        <ListingTextField
          label="Kati"
          type="text"
          inputMode="numeric"
          value={form.floor}
          onChange={onField('floor')}
          fullWidth
        />
      ) : null}

      {needsTotalFloors(cat) ? (
        <ListingTextField
          label="Numri i kateve (prona)"
          type="text"
          inputMode="numeric"
          value={form.totalFloors}
          onChange={onField('totalFloors')}
          fullWidth
        />
      ) : null}

      {needsParkingFloor(cat) ? (
        <ListingTextField
          label="Niveli i parkimit"
          type="text"
          inputMode="numeric"
          value={form.parkingFloor}
          onChange={onField('parkingFloor')}
          fullWidth
        />
      ) : null}

      {needsBedroomsBathFurnishing(cat) ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <ListingTextField
            label="Dhoma gjumi"
            type="text"
            inputMode="numeric"
            value={form.bedrooms}
            onChange={onField('bedrooms')}
            fullWidth
          />
          <ListingTextField
            label="Banjo"
            type="text"
            inputMode="numeric"
            value={form.bathrooms}
            onChange={onField('bathrooms')}
            fullWidth
          />
        </Stack>
      ) : null}

      {needsBedroomsBathFurnishing(cat) ? (
        <SearchableSelect
          label="Mobilimi"
          value={form.furnishing}
          onChange={(v) => setForm((p) => ({ ...p, furnishing: v as FormState['furnishing'] }))}
          options={FURNISHING_OPTIONS}
          emptyLabel="Zgjidh…"
          clearable
          disabled={loadingRefs}
        />
      ) : null}

      {needsYearBuilt(cat) ? (
        <ListingTextField
          label="Viti i ndërtimit"
          type="text"
          inputMode="numeric"
          value={form.yearBuilt}
          onChange={onField('yearBuilt')}
          fullWidth
        />
      ) : null}

      <ListingTextField
        label="Numri i telefonit"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={form.contactPhone}
        onChange={onField('contactPhone')}
        required
        fullWidth
        helperText="I shfaqet personave të interesuar për këtë njoftim. Është paraplotësuar nga llogaria juaj nëse keni shtuar një numër gjatë regjistrimit ose në profil — mund ta ndryshoni këtu."
      />

      </ListingFormSection>

      <Stack spacing={1.25}>
        <ListingFormActionError error={submitError} />
        {wantsPremium && !isEdit ? (
          <PremiumPostActions
            submitting={submitting}
            disabled={loadingRefs}
            onPost={(mode) => {
              premiumPayRef.current = mode;
              boostKindRef.current = 'premium';
              formRef.current?.requestSubmit();
            }}
          />
        ) : wantsOkazion && !isEdit ? (
          <OkazionPostActions
            submitting={submitting}
            disabled={loadingRefs}
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
                disabled={loadingRefs}
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
              submitLabel={isEdit ? 'Përditëso njoftimin' : 'Posto falas'}
              submitting={submitting}
              disabled={loadingRefs}
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

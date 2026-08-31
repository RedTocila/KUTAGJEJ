'use client';

import * as React from 'react';
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  Stack,
  Typography,
} from '@mui/material';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { SteeringWheel as SteeringWheelIcon } from '@phosphor-icons/react/dist/ssr/SteeringWheel';

import {
  CAR_COLOUR_OPTIONS,
  CAR_EXTRAS,
  CAR_MIN_YEAR,
  FUEL_TYPE_OPTIONS,
  carYearOptions,
  makesForVehicleType,
  modelsForMake,
  type VehicleType,
} from '@/lib/car-constants';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { SearchableSelect } from '@/components/core/searchable-select';
import { VehicleTypePicker } from '@/components/cars/vehicle-type-picker';
import {
  exclusiveLocationPayload,
  inferListingLocationMode,
  ListingLocationChoice,
  type ListingLocationMode,
} from '@/components/listings/listing-location-choice';
import {
  ListingDescriptionField,
  ListingFormActionError,
  ListingFormActions,
  ListingTextField,
  ListingToggle,
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
import { useUser } from '@/hooks/use-user';
import { createCarListing, updateCarListing, type CarMineListing } from '@/lib/listings-client';
import { useCreateListingDefaults } from '@/hooks/use-create-listing-defaults';
import { useListingFormDraft } from '@/hooks/use-listing-form-draft';
import { usePublishListingFormSnapshot } from '@/components/user/listing-form-snapshot-context';
import {
  applyEmptyKnownDefaults,
  knownCreateDefaultsFromStorage,
} from '@/lib/listing-form-defaults';
import { mergeCreateFormState, mergeImageUrls } from '@/lib/listing-form-draft';
import { mirrorRemoteImageUrls, uploadListingImages } from '@/lib/uploads-client';
import { useRouter, useSearchParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function parsePositiveInt(s: string): number | null {
  const t = s.trim();
  if (t === '' || !/^\d+$/.test(t)) return null;
  return Number.parseInt(t, 10);
}

function parseFloatStrict(s: string): number | null {
  const t = s.trim();
  if (t === '' || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CarListingFormProps {
  onSuccess?: () => void;
  backHref?: string;
  backLabel?: string;
  editListingId?: string;
  initialListing?: CarMineListing | null;
}

type CarFormState = {
  vehicleType: VehicleType | '';
  make: string;
  model: string;
  variant: string;
  description: string;
  year: string;
  kilometers: string;
  transmission: '' | 'automatic' | 'manual';
  fuelType: string;
  price: string;
  originalPrice: string;
  currency: '' | 'EUR' | 'LEK';
  color: string;
  isMatte: boolean;
  isMetallic: boolean;
  extras: string[];
  contactPhone: string;
  cityId: string;
  zoneId: string;
  locationMode: ListingLocationMode | '';
  mapsUrl: string;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
};

function emptyForm(): CarFormState {
  return {
    vehicleType: '',
    make: '',
    model: '',
    variant: '',
    description: '',
    year: '',
    kilometers: '',
    transmission: '',
    fuelType: '',
    price: '',
    originalPrice: '',
    currency: 'EUR',
    color: '',
    isMatte: false,
    isMetallic: false,
    extras: [],
    contactPhone: '',
    cityId: '',
    zoneId: '',
    locationMode: '',
    mapsUrl: '',
    locationLat: null,
    locationLng: null,
    locationAddress: null,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type FieldErrors = Partial<Record<keyof CarFormState, string>>;

function validateForm(f: CarFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (f.year.trim()) {
    const year = parsePositiveInt(f.year);
    const currentYear = new Date().getFullYear();
    if (year === null || year < CAR_MIN_YEAR || year > currentYear + 1) {
      errors.year = `Year must be between ${CAR_MIN_YEAR} and ${currentYear + 1}.`;
    }
  }

  if (f.kilometers.trim()) {
    const km = parsePositiveInt(f.kilometers);
    if (km === null) errors.kilometers = 'Kilometres must be a whole number (0 or more).';
  }

  const price = parseFloatStrict(f.price);
  if (price === null || price < 0) errors.price = 'Enter a valid price.';
  if (f.currency !== 'EUR' && f.currency !== 'LEK') errors.currency = 'Please choose a currency.';

  if (f.originalPrice.trim()) {
    const was = parseFloatStrict(f.originalPrice);
    if (was === null || was < 0) errors.originalPrice = 'Enter a valid previous price.';
    else if (price !== null && was <= price) {
      errors.originalPrice = 'Previous price must be higher than the current price.';
    }
  }

  const phone = f.contactPhone.trim();
  if (phone.length < 6) errors.contactPhone = 'Enter a valid phone number (at least 6 characters).';
  else if (phone.length > 40) errors.contactPhone = 'Phone number is too long.';
  else if (!/^[\d+\s().-]{6,40}$/.test(phone)) {
    errors.contactPhone = 'Phone number may only include digits, spaces, and + ( ) . -';
  }

  return errors;
}

const FIELD_ORDER: (keyof CarFormState)[] = [
  'vehicleType',
  'make',
  'model',
  'cityId',
  'description',
  'year',
  'kilometers',
  'transmission',
  'fuelType',
  'price',
  'originalPrice',
  'currency',
  'contactPhone',
  'color',
];

function firstFieldError(errors: FieldErrors): keyof CarFormState | null {
  for (const key of FIELD_ORDER) {
    if (errors[key]) return key;
  }
  return null;
}

function mapServerErrorToField(message: string): keyof CarFormState | null {
  const m = message.toLowerCase();
  if (m.includes('vehicle') || m.includes('category')) return 'vehicleType';
  if (m.includes('city')) return 'cityId';
  if (m.includes('make')) return 'make';
  if (m.includes('model')) return 'model';
  if (m.includes('description')) return 'description';
  if (m.includes('year')) return 'year';
  if (m.includes('kilomet')) return 'kilometers';
  if (m.includes('transmission')) return 'transmission';
  if (m.includes('fuel')) return 'fuelType';
  if (m.includes('mëparshëm') || m.includes('meparshem') || m.includes('previous') || m.includes('original')) {
    return 'originalPrice';
  }
  if (m.includes('price') || m.includes('currency')) return m.includes('currency') ? 'currency' : 'price';
  if (m.includes('colour') || m.includes('color')) return 'color';
  if (m.includes('phone')) return 'contactPhone';
  return null;
}

function formFromListing(l: CarMineListing): CarFormState {
  const finish = l.finish ?? [];
  return {
    vehicleType: (l.vehicleType as VehicleType) || '',
    make: l.make || '',
    model: l.model || '',
    variant: l.variant || '',
    description: l.description || '',
    year: l.year != null ? String(l.year) : '',
    kilometers: l.kilometers != null ? String(l.kilometers) : '',
    transmission: l.transmission === 'automatic' || l.transmission === 'manual' ? l.transmission : '',
    fuelType: l.fuelType || '',
    price: l.price != null ? String(l.price) : '',
    originalPrice: l.originalPrice != null ? String(l.originalPrice) : '',
    currency: l.currency === 'EUR' || l.currency === 'LEK' ? l.currency : '',
    color: l.color || '',
    isMatte: finish.includes('matte'),
    isMetallic: finish.includes('metallic'),
    extras: l.extras ?? [],
    contactPhone: l.contactPhone || '',
    cityId: l.cityId ? String(l.cityId) : '',
    zoneId: l.zoneId ? String(l.zoneId) : '',
    mapsUrl: l.mapsUrl ?? '',
    locationMode: inferListingLocationMode(l.cityId, l.mapsUrl),
    locationLat: l.locationLat ?? null,
    locationLng: l.locationLng ?? null,
    locationAddress: l.locationAddress ?? null,
  };
}

const YEAR_OPTIONS = carYearOptions();
const MAX_IMAGES = 8;

const TRANSMISSION_TOGGLE = [
  { value: 'automatic', label: 'Automatic', Icon: GearSixIcon },
  { value: 'manual', label: 'Manual', Icon: SteeringWheelIcon },
] as const;

const CURRENCY_TOGGLE = CURRENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export function CarListingForm({
  onSuccess,
  backHref,
  backLabel = 'Back',
  editListingId,
  initialListing,
}: CarListingFormProps) {
  const isEdit = Boolean(editListingId);
  const { checkSession } = useUser();
  const { applyTo: applyKnown, rememberLocation } = useCreateListingDefaults({ enabled: !isEdit, withZone: true });
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsOkazion = searchParams.get('okazion') === '1';
  const wantsPremium = searchParams.get('premium') === '1';

  const [form, setForm] = React.useState<CarFormState>(() => {
    const base = initialListing ? formFromListing(initialListing) : emptyForm();
    const next = applyEmptyKnownDefaults(base, knownCreateDefaultsFromStorage(), { withZone: true }) as CarFormState;
    return { ...next, locationMode: next.locationMode || inferListingLocationMode(next.cityId, next.mapsUrl) };
  });
  const okazionPayRef = React.useRef<OkazionBoostMode>('buy-card');
  const premiumPayRef = React.useRef<PremiumPayMode>('buy-card');
  const premiumPackageIdRef = React.useRef(PREMIUM_PACKAGE_ID);
  const boostKindRef = React.useRef<'premium' | 'okazion' | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [images, setImages] = React.useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>(
    () => (initialListing?.imageUrls ?? []).filter(Boolean).slice(0, MAX_IMAGES),
  );
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(true);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const formSnapshot = React.useMemo(
    () => ({ ...form, imageUrls: existingImageUrls }) as Record<string, unknown>,
    [form, existingImageUrls],
  );
  usePublishListingFormSnapshot(formSnapshot, !isEdit);
  const { clearDraft } = useListingFormDraft({
    category: 'cars',
    enabled: !isEdit,
    skipRestore: Boolean(initialListing),
    form,
    setForm,
    existingImageUrls,
    setExistingImageUrls,
    images,
    setImages,
    maxImages: MAX_IMAGES,
  });

  // Load cities once on mount.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await listRealEstateLocationsPublic();
      if (cancelled) return;
      setCities(res.cities ?? []);
      setLoadingCities(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!initialListing) return;
    const fromAi = applyEmptyKnownDefaults(
      formFromListing(initialListing),
      knownCreateDefaultsFromStorage(),
      { withZone: true },
    ) as CarFormState;
    const shaped = {
      ...fromAi,
      locationMode: fromAi.locationMode || inferListingLocationMode(fromAi.cityId, fromAi.mapsUrl),
    };
    if (isEdit) {
      setForm(shaped);
      setExistingImageUrls((initialListing.imageUrls ?? []).filter(Boolean).slice(0, MAX_IMAGES));
      setImages([]);
      return;
    }
    setForm((prev) => {
      const merged = mergeCreateFormState(prev, shaped);
      return {
        ...merged,
        locationMode: merged.locationMode || inferListingLocationMode(merged.cityId, merged.mapsUrl),
      };
    });
    setExistingImageUrls((prev) =>
      mergeImageUrls(prev, (initialListing.imageUrls ?? []).filter(Boolean), MAX_IMAGES),
    );
  }, [initialListing, isEdit]);

  React.useEffect(() => {
    if (isEdit) return;
    setForm((prev) => {
      const next = applyKnown(prev) as CarFormState;
      if (!next.locationMode && next.cityId) return { ...next, locationMode: 'city' };
      return next;
    });
  }, [isEdit, applyKnown]);

  // -------------------------------------------------------------------------
  // Field handlers
  // -------------------------------------------------------------------------

  const clearFieldError = (key: keyof CarFormState) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSubmitError(null);
  };

  const onField =
    (key: keyof CarFormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = ev.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      clearFieldError(key);
    };

  const setSelectField = <K extends keyof CarFormState>(key: K, value: CarFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  };

  const setVehicleType = (value: VehicleType | '') => {
    setForm((prev) => ({
      ...prev,
      vehicleType: value,
      make: '',
      model: '',
    }));
    clearFieldError('vehicleType');
    clearFieldError('make');
    clearFieldError('model');
  };

  const setMake = (value: string) => {
    setForm((prev) => ({ ...prev, make: value, model: '' }));
    clearFieldError('make');
    clearFieldError('model');
  };

  const makeOptions = makesForVehicleType(form.vehicleType);
  const modelOptions = modelsForMake(form.vehicleType, form.make);

  const toggleExtra = (extra: string) => {
    setForm((prev) => {
      const has = prev.extras.includes(extra);
      return {
        ...prev,
        extras: has ? prev.extras.filter((e) => e !== extra) : [...prev.extras, extra],
      };
    });
  };

  const selectColor = (value: string) => {
    setForm((prev) => ({ ...prev, color: prev.color === value ? '' : value }));
    clearFieldError('color');
  };

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const first = firstFieldError(errors);
      setSubmitError(first ? errors[first]! : 'Plotësoni fushat e detyrueshme.');
      return;
    }
    setFieldErrors({});
    if (existingImageUrls.length + images.length < 1) {
      setSubmitError('Shtoni të paktën një foto.');
      return;
    }

    setSubmitting(true);
    const loc = exclusiveLocationPayload(form.locationMode, form);
    try {
      if (isEdit && editListingId) {
        let uploaded: string[] = [];
        if (images.length) {
          const up = await uploadListingImages(images, 'cars');
          if (up.error) {
            setSubmitError(up.error);
            return;
          }
          uploaded = up.urls;
        }
        const finish: string[] = [];
        if (form.isMatte) finish.push('matte');
        if (form.isMetallic) finish.push('metallic');
        const result = await updateCarListing(editListingId, {
          vehicleType: form.vehicleType,
          make: form.make,
          model: form.model.trim(),
          variant: form.variant.trim(),
          description: form.description.trim(),
          year: form.year.trim() ? Number(form.year) : null,
          kilometers: form.kilometers.trim() ? Number(form.kilometers) : null,
          transmission: form.transmission || null,
          fuelType: form.fuelType || null,
          price: Number(form.price),
          originalPrice: form.originalPrice.trim() ? Number(form.originalPrice) : null,
          currency: form.currency || 'EUR',
          color: form.color || null,
          finish,
          extras: form.extras,
          contactPhone: form.contactPhone.trim(),
          cityId: loc.cityId,
        zoneId: loc.zoneId,
          mapsUrl: loc.mapsUrl,
          imageUrls: [...existingImageUrls, ...uploaded].slice(0, MAX_IMAGES),
        });
        if (result.error) {
          const field = mapServerErrorToField(result.error);
          if (field) {
            setFieldErrors({ [field]: result.error });
          }
          setSubmitError(result.error);
          return;
        }
      } else {
        // Mirror AI-scraped remote URLs into our storage (browser fetch is blocked by CORS).
        let hostedUrls: string[] = [];
        if (existingImageUrls.length) {
          const mirrored = await mirrorRemoteImageUrls(existingImageUrls, 'cars');
          if (mirrored.error && !mirrored.urls.length) {
            setSubmitError(mirrored.error);
            return;
          }
          hostedUrls = mirrored.urls;
        }

        let uploaded: string[] = [];
        if (images.length) {
          const up = await uploadListingImages(images, 'cars');
          if (up.error) {
            setSubmitError(up.error);
            return;
          }
          uploaded = up.urls;
        }

        const imageUrls = [...hostedUrls, ...uploaded].slice(0, MAX_IMAGES);

        const fd = new FormData();
        fd.append('vehicleType', form.vehicleType);
        fd.append('make', form.make);
        fd.append('model', form.model.trim());
        fd.append('variant', form.variant.trim());
        fd.append('description', form.description.trim());
        fd.append('year', form.year.trim());
        fd.append('kilometers', form.kilometers.trim());
        fd.append('transmission', form.transmission);
        fd.append('fuelType', form.fuelType);
        fd.append('price', form.price.trim());
        if (form.originalPrice.trim()) fd.append('originalPrice', form.originalPrice.trim());
        fd.append('currency', form.currency);
        fd.append('color', form.color);
        if (form.isMatte) fd.append('finish', 'matte');
        if (form.isMetallic) fd.append('finish', 'metallic');
        form.extras.forEach((e) => fd.append('extras[]', e));
        fd.append('contactPhone', form.contactPhone.trim());
        if (loc.cityId) fd.append('cityId', loc.cityId);
        if (loc.mapsUrl) fd.append('mapsUrl', loc.mapsUrl);
        if (imageUrls.length) {
          fd.append('imageUrls', JSON.stringify(imageUrls));
        }

        const { error, id } = await createCarListing(fd);
        if (error) {
          const field = mapServerErrorToField(error);
          if (field) {
            setFieldErrors({ [field]: error });
          }
          setSubmitError(error);
          return;
        }
        clearDraft();
        if (id && (wantsPremium || boostKindRef.current === 'premium')) {
          const boost = await activatePremiumAfterCreate({
            mode: premiumPayRef.current,
            kind: 'car',
            listingId: id,
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
        } else if (id && (wantsOkazion || boostKindRef.current === 'okazion')) {
          const boost = await activateOkazionAfterCreate({
            mode: okazionPayRef.current,
            kind: 'car',
            listingId: id,
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
      }
      if (!isEdit) {
        if (loc.cityId) rememberLocation({ cityId: loc.cityId, zoneId: loc.zoneId });
      }
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Stack
      ref={formRef}
      component="form"
      spacing={3}
      onSubmit={(e) => void handleSubmit(e)}
    >
      {/* ── Car identity ─────────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <ListingImagePicker
          value={images}
          onChange={setImages}
          existingUrls={existingImageUrls}
          onExistingUrlsChange={setExistingImageUrls}
          max={MAX_IMAGES}
          label="Foto"
          disabled={submitting}
        />

        <Box
          sx={{
            p: 1.75,
            borderRadius: 3,
            border: '1px solid',
            borderColor: form.vehicleType ? 'primary.main' : 'divider',
            bgcolor: form.vehicleType ? primaryMainAlpha(0.06) : 'transparent',
            boxShadow: form.vehicleType ? `inset 0 0 0 1px ${primaryMainAlpha(0.12)}` : 'none',
            transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
          }}
        >
          <VehicleTypePicker
            value={form.vehicleType}
            onChange={setVehicleType}
            label="Category"
            error={Boolean(fieldErrors.vehicleType)}
            helperText={fieldErrors.vehicleType}
          />
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SearchableSelect
            label="Make"
            value={form.make}
            onChange={setMake}
            options={makeOptions.map((m) => ({ value: m, label: m }))}
            emptyLabel={form.vehicleType ? 'Select make…' : 'Select category first…'}
            allowCustom
            disabled={!form.vehicleType}
            error={Boolean(fieldErrors.make)}
            helperText={fieldErrors.make}
          />

          <SearchableSelect
            label="Model"
            value={form.model}
            onChange={(v) => setSelectField('model', v)}
            options={modelOptions.map((m) => ({ value: m, label: m }))}
            emptyLabel={form.make ? 'Select model…' : 'Select make first…'}
            allowCustom
            disabled={!form.make}
            error={Boolean(fieldErrors.model)}
            helperText={fieldErrors.model}
          />
        </Stack>

        <ListingTextField
          label="Variant / subtitle"
          value={form.variant}
          onChange={onField('variant')}
          fullWidth
          placeholder="e.g. Sportback, Competition, S-Line…"
        />

        <ListingLocationChoice
          mode={form.locationMode}
          onModeChange={(locationMode) => {
            setForm((p) => ({ ...p, locationMode }));
            clearFieldError('cityId');
          }}
          cityId={form.cityId}
          onCityIdChange={(cityId) => {
            setForm((p) => ({ ...p, cityId, zoneId: '' }));
            clearFieldError('cityId');
          }}
          zoneId={form.zoneId}
          onZoneIdChange={(zoneId) => setForm((p) => ({ ...p, zoneId }))}
          cities={cities}
          maps={{
            mapsUrl: form.mapsUrl,
            locationLat: form.locationLat,
            locationLng: form.locationLng,
            locationAddress: form.locationAddress,
          }}
          onMapsChange={(next) =>
            setForm((p) => ({
              ...p,
              mapsUrl: next.mapsUrl,
              locationLat: next.locationLat,
              locationLng: next.locationLng,
              locationAddress: next.locationAddress,
            }))
          }
          loadingCities={loadingCities}
          disabled={submitting}
          cityError={Boolean(fieldErrors.cityId)}
          cityHelperText={fieldErrors.cityId}
          showZone
          labels={{
            modeLabel: 'Location',
            cityMode: 'City / zone',
            mapMode: 'Map Link',
            cityLabel: 'City',
            cityEmpty: 'Select city…',
            mapsLabel: 'Google Maps link',
            mapsPlaceholder: 'https://maps.app.goo.gl/… or maps.google.com/…',
            openMapsAria: 'Open Google Maps',
          }}
        />

        <ListingDescriptionField
          label="Description"
          value={form.description}
          onChange={onField('description')}
          fullWidth
          placeholder="Describe the car's condition, service history, any additional info…"
          error={Boolean(fieldErrors.description)}
          helperText={fieldErrors.description}
        />
      </Stack>

      <Divider />

      {/* ── Key details ──────────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SearchableSelect
            label="Year"
            value={form.year}
            onChange={(v) => setSelectField('year', v)}
            options={YEAR_OPTIONS.map((y) => ({ value: String(y), label: String(y) }))}
            emptyLabel="Select year…"
            error={Boolean(fieldErrors.year)}
            helperText={fieldErrors.year}
          />

          <ListingTextField
            label="Kilometres"
            type="text"
            inputMode="numeric"
            value={form.kilometers}
            onChange={onField('kilometers')}
            fullWidth
            placeholder="e.g. 85000"
            error={Boolean(fieldErrors.kilometers)}
            helperText={fieldErrors.kilometers}
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">km</InputAdornment>,
              },
            }}
          />
        </Stack>

        <ListingToggle
          label="Transmission"
          value={form.transmission}
          onChange={(v) => setSelectField('transmission', v as CarFormState['transmission'])}
          options={TRANSMISSION_TOGGLE}
          error={Boolean(fieldErrors.transmission)}
          helperText={fieldErrors.transmission}
        />

        <SearchableSelect
          label="Fuel type"
          value={form.fuelType}
          onChange={(v) => setSelectField('fuelType', v)}
          options={FUEL_TYPE_OPTIONS}
          emptyLabel="Select fuel type…"
          error={Boolean(fieldErrors.fuelType)}
          helperText={fieldErrors.fuelType}
        />
      </Stack>

      <Divider />

      {/* ── Price ────────────────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Stack direction="row" spacing={2}>
          <ListingTextField
            label="Price"
            type="text"
            inputMode="decimal"
            value={form.price}
            onChange={onField('price')}
            required
            fullWidth
            error={Boolean(fieldErrors.price)}
            helperText={fieldErrors.price}
          />
          <ListingTextField
            label="Previous price"
            type="text"
            inputMode="decimal"
            value={form.originalPrice}
            onChange={onField('originalPrice')}
            fullWidth
            error={Boolean(fieldErrors.originalPrice)}
            helperText={fieldErrors.originalPrice}
          />
        </Stack>
        <ListingToggle
          label="Currency"
          value={form.currency}
          onChange={(v) => setSelectField('currency', v as CarFormState['currency'])}
          options={CURRENCY_TOGGLE}
          required
          error={Boolean(fieldErrors.currency)}
          helperText={fieldErrors.currency}
        />

        <ListingTextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.contactPhone}
          onChange={onField('contactPhone')}
          required
          fullWidth
          error={Boolean(fieldErrors.contactPhone)}
          helperText={fieldErrors.contactPhone}
        />
      </Stack>

      <Divider />

      {/* ── Exterior colour ──────────────────────────────────────────────── */}
      <Stack spacing={1.5}>
        {fieldErrors.color ? (
          <Typography variant="caption" color="error">
            {fieldErrors.color}
          </Typography>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 0.25,
          }}
        >
          {CAR_COLOUR_OPTIONS.map(({ value, label, hex }) => (
            <FormControlLabel
              key={value}
              control={
                <Checkbox
                  size="small"
                  checked={form.color === value}
                  onChange={() => {
                    selectColor(value);
                  }}
                />
              }
              label={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      bgcolor: hex,
                      border: '1.5px solid',
                      borderColor: value === 'white' ? 'divider' : 'transparent',
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="body2">{label}</Typography>
                </Stack>
              }
              sx={{ mx: 0 }}
            />
          ))}
        </Box>

        <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={form.isMatte}
                onChange={(e) => {
                  setForm((p) => ({ ...p, isMatte: e.target.checked }));
                }}
              />
            }
            label="Matte"
          />
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={form.isMetallic}
                onChange={(e) => {
                  setForm((p) => ({ ...p, isMetallic: e.target.checked }));
                }}
              />
            }
            label="Metallic"
          />
        </Stack>
      </Stack>

      <Divider />

      {/* ── Extras ───────────────────────────────────────────────────────── */}
      <Stack spacing={1.5}>
        {form.extras.length > 0 ? (
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
            {form.extras.length} selected
          </Typography>
        ) : null}

        <FormGroup>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 0,
            }}
          >
            {CAR_EXTRAS.map((extra) => (
              <FormControlLabel
                key={extra}
                control={
                  <Checkbox
                    size="small"
                    checked={form.extras.includes(extra)}
                    onChange={() => {
                      toggleExtra(extra);
                    }}
                  />
                }
                label={<Typography variant="body2">{extra}</Typography>}
                sx={{ mx: 0 }}
              />
            ))}
          </Box>
        </FormGroup>
      </Stack>

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

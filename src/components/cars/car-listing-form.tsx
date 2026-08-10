'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  InputAdornment,
  Stack,
  Typography,
} from '@mui/material';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { SteeringWheel as SteeringWheelIcon } from '@phosphor-icons/react/dist/ssr/SteeringWheel';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import {
  CAR_COLOUR_OPTIONS,
  CAR_EXTRAS,
  FUEL_TYPE_OPTIONS,
  carYearOptions,
  makesForVehicleType,
  modelsForMake,
  type VehicleType,
} from '@/lib/car-constants';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { SearchableSelect } from '@/components/core/searchable-select';
import { VehicleTypePicker } from '@/components/cars/vehicle-type-picker';
import {
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
import {
  applyEmptyKnownDefaults,
  knownCreateDefaultsFromStorage,
} from '@/lib/listing-form-defaults';
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
    currency: '',
    color: '',
    isMatte: false,
    isMetallic: false,
    extras: [],
    contactPhone: '',
    cityId: '',
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type FieldErrors = Partial<Record<keyof CarFormState, string>>;

function validateForm(f: CarFormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!f.vehicleType) errors.vehicleType = 'Ju lutem zgjidhni kategorinë e automjetit.';
  if (!f.make) errors.make = 'Ju lutem zgjidhni markën.';
  if (!f.model.trim()) errors.model = 'Ju lutem zgjidhni modelin.';
  if (!f.description.trim()) errors.description = 'Përshkrimi është i detyrueshëm.';

  const year = parsePositiveInt(f.year);
  const currentYear = new Date().getFullYear();
  if (year === null || year < 1970 || year > currentYear + 1) {
    errors.year = `Year must be between 1970 and ${currentYear + 1}.`;
  }

  const km = parsePositiveInt(f.kilometers);
  if (km === null) errors.kilometers = 'Kilometres must be a whole number (0 or more).';

  if (!f.transmission) errors.transmission = 'Please select the transmission type.';
  if (!f.fuelType) errors.fuelType = 'Please select the fuel type.';

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

  if (!f.color) errors.color = 'Please select the exterior colour.';

  if (!f.cityId) errors.cityId = 'Please select a city.';

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

// ---------------------------------------------------------------------------
// Image preview item
// ---------------------------------------------------------------------------

interface ImagePreviewProps {
  file: File;
  onRemove: () => void;
}

function ImagePreview({ file, onRemove }: ImagePreviewProps) {
  const [src, setSrc] = React.useState<string>('');

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: 96,
        height: 80,
        borderRadius: 1.5,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={file.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          bgcolor: 'rgba(0,0,0,0.55)',
          color: '#fff',
          p: 0.25,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
        }}
      >
        <XIcon size={12} weight="bold" />
      </IconButton>
    </Box>
  );
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
  const { applyTo: applyKnown, rememberLocation } = useCreateListingDefaults({ enabled: !isEdit });
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsOkazion = searchParams.get('okazion') === '1';
  const wantsPremium = searchParams.get('premium') === '1';

  const [form, setForm] = React.useState<CarFormState>(() => {
    const base = initialListing ? formFromListing(initialListing) : emptyForm();
    return applyEmptyKnownDefaults(base, knownCreateDefaultsFromStorage()) as CarFormState;
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
    setForm(
      applyEmptyKnownDefaults(formFromListing(initialListing), knownCreateDefaultsFromStorage()) as CarFormState,
    );
    setExistingImageUrls((initialListing.imageUrls ?? []).filter(Boolean).slice(0, MAX_IMAGES));
    setImages([]);
  }, [initialListing]);

  React.useEffect(() => {
    if (isEdit) return;
    setForm((prev) => applyKnown(prev) as CarFormState);
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

  const catalogMakes = makesForVehicleType(form.vehicleType);
  const makeOptions =
    form.make && !catalogMakes.includes(form.make) ? [form.make, ...catalogMakes] : catalogMakes;
  const catalogModels = modelsForMake(form.vehicleType, form.make);
  const modelOptions =
    form.model && !catalogModels.includes(form.model)
      ? [form.model, ...catalogModels]
      : catalogModels;

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
  // Image handling
  // -------------------------------------------------------------------------

  const handleFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(ev.target.files ?? []);
    if (!picked.length) return;
    setImages((prev) => {
      const slots = Math.max(0, MAX_IMAGES - existingImageUrls.length);
      return [...prev, ...picked].slice(0, slots);
    });
    // Reset input so the same file can be picked again after removing.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingUrl = (index: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
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

    setSubmitting(true);
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
          year: Number(form.year),
          kilometers: Number(form.kilometers),
          transmission: form.transmission,
          fuelType: form.fuelType,
          price: Number(form.price),
          originalPrice: form.originalPrice.trim() ? Number(form.originalPrice) : null,
          currency: form.currency,
          color: form.color,
          finish,
          extras: form.extras,
          contactPhone: form.contactPhone.trim(),
          cityId: form.cityId,
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
        fd.append('cityId', form.cityId);
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
        rememberLocation({ cityId: form.cityId });
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
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Vehicle details
        </Typography>

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
            required
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
            required
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
            required
            disabled={!form.make}
            error={Boolean(fieldErrors.model)}
            helperText={fieldErrors.model}
          />
        </Stack>

        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Photos
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {existingImageUrls.length + images.length} / {MAX_IMAGES}
            </Typography>
          </Stack>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
            {existingImageUrls.map((url, idx) => (
              <Box
                key={`url-${url}-${idx}`}
                sx={{
                  position: 'relative',
                  width: 96,
                  height: 80,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <IconButton
                  size="small"
                  onClick={() => {
                    removeExistingUrl(idx);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    p: 0.25,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                  }}
                >
                  <XIcon size={12} weight="bold" />
                </IconButton>
              </Box>
            ))}
            {images.map((img, idx) => (
              <ImagePreview
                key={`${img.name}-${idx}`}
                file={img}
                onRemove={() => {
                  removeImage(idx);
                }}
              />
            ))}
            {existingImageUrls.length + images.length < MAX_IMAGES ? (
              <Box
                component="button"
                type="button"
                aria-label="Add photos"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                sx={{
                  position: 'relative',
                  width: 96,
                  height: 80,
                  borderRadius: 1.5,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed',
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  color: 'text.secondary',
                  p: 0,
                  font: 'inherit',
                  transition: 'border-color 0.15s, color 0.15s, background-color 0.15s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: (t) =>
                      t.palette.mode === 'dark' ? 'rgba(130, 201, 30, 0.08)' : 'rgba(118, 186, 27, 0.06)',
                  },
                }}
              >
                <PlusIcon size={28} weight="bold" />
              </Box>
            ) : null}
          </Stack>

          {existingImageUrls.length + images.length < MAX_IMAGES ? (
            <Typography variant="caption" color="text.disabled">
              Up to {MAX_IMAGES} images · JPG, PNG, WEBP
            </Typography>
          ) : null}
        </Stack>

        <ListingTextField
          label="Variant / subtitle"
          value={form.variant}
          onChange={onField('variant')}
          fullWidth
          placeholder="e.g. Sportback, Competition, S-Line…"
        />

        <Box>
          <SearchableSelect
            label="City"
            value={form.cityId}
            onChange={(v) => setSelectField('cityId', v)}
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            emptyLabel="Select city…"
            required
            disabled={loadingCities || cities.length === 0}
            error={Boolean(fieldErrors.cityId)}
            helperText={
              fieldErrors.cityId ||
              (!loadingCities && cities.length === 0
                ? 'No cities available yet — a platform admin must add them under Dashboard → Vendndodhjet (pasuri).'
                : undefined)
            }
          />
        </Box>

        <ListingTextField
          label="Description"
          value={form.description}
          onChange={onField('description')}
          required
          fullWidth
          multiline
          minRows={4}
          placeholder="Describe the car's condition, service history, any additional info…"
          error={Boolean(fieldErrors.description)}
          helperText={fieldErrors.description}
        />
      </Stack>

      <Divider />

      {/* ── Key details ──────────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Specifications
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SearchableSelect
            label="Year"
            value={form.year}
            onChange={(v) => setSelectField('year', v)}
            options={YEAR_OPTIONS.map((y) => ({ value: String(y), label: String(y) }))}
            emptyLabel="Select year…"
            required
            error={Boolean(fieldErrors.year)}
            helperText={fieldErrors.year}
          />

          <ListingTextField
            label="Kilometres"
            type="text"
            inputMode="numeric"
            value={form.kilometers}
            onChange={onField('kilometers')}
            required
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
          required
          error={Boolean(fieldErrors.transmission)}
          helperText={fieldErrors.transmission}
        />

        <SearchableSelect
          label="Fuel type"
          value={form.fuelType}
          onChange={(v) => setSelectField('fuelType', v)}
          options={FUEL_TYPE_OPTIONS}
          emptyLabel="Select fuel type…"
          required
          error={Boolean(fieldErrors.fuelType)}
          helperText={fieldErrors.fuelType}
        />
      </Stack>

      <Divider />

      {/* ── Price ────────────────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Price &amp; contact
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
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
            helperText={fieldErrors.originalPrice || 'Optional — shown as the old struck-through price.'}
          />
          <ListingToggle
            label="Currency"
            value={form.currency}
            onChange={(v) => setSelectField('currency', v as CarFormState['currency'])}
            options={CURRENCY_TOGGLE}
            required
            error={Boolean(fieldErrors.currency)}
            helperText={fieldErrors.currency}
            fullWidth={false}
          />
        </Stack>

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
          helperText={fieldErrors.contactPhone || 'Shown to interested buyers for this listing.'}
        />
      </Stack>

      <Divider />

      {/* ── Exterior colour ──────────────────────────────────────────────── */}
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Exterior colour
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Select the base colour. Only one colour can be active at a time.
        </Typography>
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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Extras
          </Typography>
          {form.extras.length > 0 ? (
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
              {form.extras.length} selected
            </Typography>
          ) : null}
        </Stack>

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
              submitLabel={isEdit ? 'Përditëso njoftimin' : 'Posto falas'}
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

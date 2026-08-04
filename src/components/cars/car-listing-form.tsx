'use client';

import * as React from 'react';
import {
  Alert,
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
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import {
  CAR_COLOUR_OPTIONS,
  CAR_EXTRAS,
  CAR_MAKES,
  FUEL_TYPE_OPTIONS,
  TRANSMISSION_OPTIONS,
  carYearOptions,
} from '@/lib/car-constants';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { SearchableSelect } from '@/components/core/searchable-select';
import {
  ListingFormActions,
  ListingTextField,
} from '@/components/user/listing-form-ui';
import { useUser } from '@/hooks/use-user';
import { createCarListing, updateCarListing, type CarMineListing } from '@/lib/listings-client';
import { contactPhoneFromStorage, resolveContactPhone } from '@/lib/listing-form-defaults';
import { uploadListingImages } from '@/lib/uploads-client';

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
  make: string;
  model: string;
  variant: string;
  description: string;
  year: string;
  kilometers: string;
  transmission: '' | 'automatic' | 'manual';
  fuelType: string;
  price: string;
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
    make: '',
    model: '',
    variant: '',
    description: '',
    year: '',
    kilometers: '',
    transmission: '',
    fuelType: '',
    price: '',
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

  if (!f.make) errors.make = 'Please select the car make.';
  if (!f.model.trim()) errors.model = 'Car model is required.';
  if (!f.description.trim()) errors.description = 'Description is required.';

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
  'make',
  'model',
  'description',
  'year',
  'kilometers',
  'transmission',
  'fuelType',
  'price',
  'currency',
  'contactPhone',
  'color',
  'cityId',
];

function firstFieldError(errors: FieldErrors): keyof CarFormState | null {
  for (const key of FIELD_ORDER) {
    if (errors[key]) return key;
  }
  return null;
}

function mapServerErrorToField(message: string): keyof CarFormState | null {
  const m = message.toLowerCase();
  if (m.includes('city')) return 'cityId';
  if (m.includes('make')) return 'make';
  if (m.includes('model')) return 'model';
  if (m.includes('description')) return 'description';
  if (m.includes('year')) return 'year';
  if (m.includes('kilomet')) return 'kilometers';
  if (m.includes('transmission')) return 'transmission';
  if (m.includes('fuel')) return 'fuelType';
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
    make: l.make || '',
    model: l.model || '',
    variant: l.variant || '',
    description: l.description || '',
    year: l.year != null ? String(l.year) : '',
    kilometers: l.kilometers != null ? String(l.kilometers) : '',
    transmission: l.transmission === 'automatic' || l.transmission === 'manual' ? l.transmission : '',
    fuelType: l.fuelType || '',
    price: l.price != null ? String(l.price) : '',
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
const MAX_IMAGES = 5;

export function CarListingForm({
  onSuccess,
  backHref,
  backLabel = 'Back',
  editListingId,
  initialListing,
}: CarListingFormProps) {
  const isEdit = Boolean(editListingId);
  const { user } = useUser();

  const [form, setForm] = React.useState<CarFormState>(() =>
    initialListing ? formFromListing(initialListing) : { ...emptyForm(), contactPhone: contactPhoneFromStorage() },
  );
  const [images, setImages] = React.useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>(
    () => (initialListing?.imageUrls ?? []).filter(Boolean),
  );
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(true);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cityFieldRef = React.useRef<HTMLDivElement>(null);

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
    setForm(formFromListing(initialListing));
    setExistingImageUrls((initialListing.imageUrls ?? []).filter(Boolean));
    setImages([]);
  }, [initialListing]);

  // Pre-fill phone from user profile when it becomes available.
  React.useEffect(() => {
    if (isEdit) return;
    const p = resolveContactPhone(user);
    if (!p) return;
    setForm((prev) => {
      if (prev.contactPhone.trim()) return prev;
      return { ...prev, contactPhone: p };
    });
  }, [user, isEdit]);

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
      if (first === 'cityId') {
        cityFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
          make: form.make,
          model: form.model.trim(),
          variant: form.variant.trim(),
          description: form.description.trim(),
          year: Number(form.year),
          kilometers: Number(form.kilometers),
          transmission: form.transmission,
          fuelType: form.fuelType,
          price: Number(form.price),
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
            if (field === 'cityId') {
              cityFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          } else {
            setSubmitError(result.error);
          }
          return;
        }
      } else {
        const fd = new FormData();
        fd.append('make', form.make);
        fd.append('model', form.model.trim());
        fd.append('variant', form.variant.trim());
        fd.append('description', form.description.trim());
        fd.append('year', form.year.trim());
        fd.append('kilometers', form.kilometers.trim());
        fd.append('transmission', form.transmission);
        fd.append('fuelType', form.fuelType);
        fd.append('price', form.price.trim());
        fd.append('currency', form.currency);
        fd.append('color', form.color);
        if (form.isMatte) fd.append('finish', 'matte');
        if (form.isMetallic) fd.append('finish', 'metallic');
        form.extras.forEach((e) => fd.append('extras[]', e));
        fd.append('contactPhone', form.contactPhone.trim());
        fd.append('cityId', form.cityId);
        images.forEach((img) => fd.append('images', img, img.name));

        const { error } = await createCarListing(fd);
        if (error) {
          const field = mapServerErrorToField(error);
          if (field) {
            setFieldErrors({ [field]: error });
            if (field === 'cityId') {
              cityFieldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          } else {
            setSubmitError(error);
          }
          return;
        }
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
    <Stack component="form" spacing={3} onSubmit={(e) => void handleSubmit(e)}>
      {submitError ? (
        <Alert severity="error" sx={{ borderRadius: 1.5 }}>
          {submitError}
        </Alert>
      ) : null}

      {/* ── Car identity ─────────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Car details
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SearchableSelect
            label="Make"
            value={form.make}
            onChange={(v) => setSelectField('make', v)}
            options={CAR_MAKES.map((m) => ({ value: m, label: m }))}
            emptyLabel="Select make…"
            required
            error={Boolean(fieldErrors.make)}
            helperText={fieldErrors.make}
          />

          <ListingTextField
            label="Model"
            value={form.model}
            onChange={onField('model')}
            required
            fullWidth
            placeholder="e.g. A7"
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
          helperText="This text will appear in the listing title alongside the make and model."
        />

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

        <FormControl component="fieldset" required error={Boolean(fieldErrors.transmission)}>
          <FormLabel component="legend" sx={{ mb: 0.5, fontSize: '0.875rem', fontWeight: 600 }}>
            Transmission
          </FormLabel>
          <RadioGroup
            row
            value={form.transmission}
            onChange={(_, v) => setSelectField('transmission', v as CarFormState['transmission'])}
          >
            {TRANSMISSION_OPTIONS.map((o) => (
              <FormControlLabel key={o.value} value={o.value} control={<Radio />} label={o.label} />
            ))}
          </RadioGroup>
          {fieldErrors.transmission ? (
            <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
              {fieldErrors.transmission}
            </Typography>
          ) : null}
        </FormControl>

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

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
          <SearchableSelect
            label="Currency"
            value={form.currency}
            onChange={(v) => setSelectField('currency', v as CarFormState['currency'])}
            options={CURRENCY_OPTIONS}
            emptyLabel="Select…"
            required
            error={Boolean(fieldErrors.currency)}
            helperText={fieldErrors.currency}
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

      <Divider />

      {/* ── City ─────────────────────────────────────────────────────────── */}
      <Stack spacing={1.5} ref={cityFieldRef}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Location
        </Typography>

        <SearchableSelect
          label="City"
          value={form.cityId}
          onChange={(v) => setSelectField('cityId', v)}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Select city…"
          required
          disabled={loadingCities || cities.length === 0}
          error={Boolean(fieldErrors.cityId)}
          helperText={fieldErrors.cityId}
        />

        {!loadingCities && cities.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No cities available yet — a platform admin must add them under Dashboard → Vendndodhjet (pasuri).
          </Typography>
        ) : null}
      </Stack>

      <ListingFormActions
        submitLabel={isEdit ? 'Përditëso njoftimin' : 'Ruaj njoftimin'}
        submitting={submitting}
        backHref={backHref}
        backLabel={backLabel}
      />
    </Stack>
  );
}

'use client';

import * as React from 'react';
import RouterLink from 'next/link';
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
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  type SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Image as ImageIcon } from '@phosphor-icons/react/dist/ssr/Image';

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
import { useUser } from '@/hooks/use-user';
import { createCarListing } from '@/lib/listings-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function validateForm(f: CarFormState): string | null {
  if (!f.make) return 'Please select the car make.';
  if (!f.model.trim()) return 'Car model is required.';
  if (!f.description.trim()) return 'Description is required.';

  const year = parsePositiveInt(f.year);
  const currentYear = new Date().getFullYear();
  if (year === null || year < 1970 || year > currentYear + 1) {
    return `Year must be between 1970 and ${currentYear + 1}.`;
  }

  const km = parsePositiveInt(f.kilometers);
  if (km === null) return 'Kilometres must be a whole number (0 or more).';

  if (!f.transmission) return 'Please select the transmission type.';
  if (!f.fuelType) return 'Please select the fuel type.';

  const price = parseFloatStrict(f.price);
  if (price === null || price < 0) return 'Enter a valid price.';
  if (f.currency !== 'EUR' && f.currency !== 'LEK') return 'Please choose a currency.';

  if (!f.color) return 'Please select the exterior colour.';

  if (!f.cityId) return 'Please select a city.';

  const phone = f.contactPhone.trim();
  if (phone.length < 6) return 'Enter a valid phone number (at least 6 characters).';
  if (phone.length > 40) return 'Phone number is too long.';
  if (!/^[\d+\s().-]{6,40}$/.test(phone)) {
    return 'Phone number may only include digits, spaces, and + ( ) . -';
  }

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

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

const YEAR_OPTIONS = carYearOptions();
const MAX_IMAGES = 5;

export function CarListingForm({ onSuccess, backHref, backLabel = 'Back' }: CarListingFormProps) {
  const { user } = useUser();

  const [form, setForm] = React.useState<CarFormState>(() => ({
    ...emptyForm(),
    contactPhone: contactPhoneInitialFromStorage(),
  }));
  const [images, setImages] = React.useState<File[]>([]);
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [loadingCities, setLoadingCities] = React.useState(true);
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

  // Pre-fill phone from user profile when it becomes available.
  React.useEffect(() => {
    if (!user) return;
    const p = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (!p) return;
    setForm((prev) => {
      if (prev.contactPhone.trim()) return prev;
      return { ...prev, contactPhone: p };
    });
  }, [user]);

  // -------------------------------------------------------------------------
  // Field handlers
  // -------------------------------------------------------------------------

  const onField =
    (key: keyof CarFormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: ev.target.value }));
    };

  const onSelect =
    (key: keyof CarFormState) =>
    (ev: SelectChangeEvent<string>) => {
      setForm((prev) => ({ ...prev, [key]: ev.target.value }));
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
  };

  // -------------------------------------------------------------------------
  // Image handling
  // -------------------------------------------------------------------------

  const handleFileChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(ev.target.files ?? []);
    if (!picked.length) return;
    setImages((prev) => {
      const combined = [...prev, ...picked];
      return combined.slice(0, MAX_IMAGES);
    });
    // Reset input so the same file can be picked again after removing.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

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
        setSubmitError(error);
        return;
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
          <FormControl fullWidth required>
            <InputLabel id="car-make-label">Make</InputLabel>
            <Select<string>
              labelId="car-make-label"
              label="Make"
              value={form.make}
              onChange={onSelect('make')}
            >
              <MenuItem value="">
                <em>Select make…</em>
              </MenuItem>
              {CAR_MAKES.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Model"
            value={form.model}
            onChange={onField('model')}
            required
            fullWidth
            placeholder="e.g. A7"
          />
        </Stack>

        <TextField
          label="Variant / subtitle"
          value={form.variant}
          onChange={onField('variant')}
          fullWidth
          placeholder="e.g. Sportback, Competition, S-Line…"
          helperText="This text will appear in the listing title alongside the make and model."
        />

        <TextField
          label="Description"
          value={form.description}
          onChange={onField('description')}
          required
          fullWidth
          multiline
          minRows={4}
          placeholder="Describe the car's condition, service history, any additional info…"
        />
      </Stack>

      <Divider />

      {/* ── Key details ──────────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Specifications
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl fullWidth required>
            <InputLabel id="car-year-label">Year</InputLabel>
            <Select<string>
              labelId="car-year-label"
              label="Year"
              value={form.year}
              onChange={onSelect('year')}
            >
              <MenuItem value="">
                <em>Select year…</em>
              </MenuItem>
              {YEAR_OPTIONS.map((y) => (
                <MenuItem key={y} value={String(y)}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Kilometres"
            type="text"
            inputMode="numeric"
            value={form.kilometers}
            onChange={onField('kilometers')}
            required
            fullWidth
            placeholder="e.g. 85000"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">km</InputAdornment>,
              },
            }}
          />
        </Stack>

        <FormControl component="fieldset" required>
          <FormLabel component="legend" sx={{ mb: 0.5, fontSize: '0.875rem', fontWeight: 600 }}>
            Transmission
          </FormLabel>
          <RadioGroup
            row
            value={form.transmission}
            onChange={(_, v) => setForm((p) => ({ ...p, transmission: v as CarFormState['transmission'] }))}
          >
            {TRANSMISSION_OPTIONS.map((o) => (
              <FormControlLabel key={o.value} value={o.value} control={<Radio />} label={o.label} />
            ))}
          </RadioGroup>
        </FormControl>

        <FormControl fullWidth required>
          <InputLabel id="car-fuel-label">Fuel type</InputLabel>
          <Select<string>
            labelId="car-fuel-label"
            label="Fuel type"
            value={form.fuelType}
            onChange={onSelect('fuelType')}
          >
            <MenuItem value="">
              <em>Select fuel type…</em>
            </MenuItem>
            {FUEL_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Divider />

      {/* ── Price ────────────────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Price &amp; contact
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Price"
            type="text"
            inputMode="decimal"
            value={form.price}
            onChange={onField('price')}
            required
            fullWidth
          />
          <FormControl fullWidth required>
            <InputLabel id="car-cur-label">Currency</InputLabel>
            <Select<string>
              labelId="car-cur-label"
              label="Currency"
              value={form.currency}
              onChange={onSelect('currency')}
            >
              <MenuItem value="">
                <em>Select…</em>
              </MenuItem>
              {CURRENCY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.contactPhone}
          onChange={onField('contactPhone')}
          required
          fullWidth
          helperText="Shown to interested buyers for this listing."
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
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Location
        </Typography>

        <FormControl fullWidth required disabled={loadingCities || cities.length === 0}>
          <InputLabel id="car-city-label">City</InputLabel>
          <Select<string>
            labelId="car-city-label"
            label="City"
            value={form.cityId}
            onChange={onSelect('cityId')}
          >
            <MenuItem value="">
              <em>Select city…</em>
            </MenuItem>
            {cities.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!loadingCities && cities.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No cities available yet — a platform admin must add them under Dashboard → Vendndodhjet (pasuri).
          </Typography>
        ) : null}
      </Stack>

      <Divider />

      {/* ── Photos ───────────────────────────────────────────────────────── */}
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Photos
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {images.length} / {MAX_IMAGES}
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

        {images.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            {images.map((img, idx) => (
              <ImagePreview
                key={`${img.name}-${idx}`}
                file={img}
                onRemove={() => {
                  removeImage(idx);
                }}
              />
            ))}
          </Stack>
        ) : null}

        {images.length < MAX_IMAGES ? (
          <Box
            onClick={() => {
              fileInputRef.current?.click();
            }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              p: 3,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              cursor: 'pointer',
              color: 'text.secondary',
              transition: 'border-color 0.15s, color 0.15s',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
              },
            }}
          >
            <ImageIcon size={32} />
            <Typography variant="body2" sx={{ textAlign: 'center' }}>
              Click to add photos
              <br />
              <Typography component="span" variant="caption" color="text.disabled">
                Up to {MAX_IMAGES} images · JPG, PNG, WEBP
              </Typography>
            </Typography>
          </Box>
        ) : null}
      </Stack>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1, justifyContent: 'flex-end' }}>
        {backHref ? (
          <Button component={RouterLink} href={backHref} variant="outlined" color="inherit">
            {backLabel}
          </Button>
        ) : null}
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save listing'}
        </Button>
      </Stack>
    </Stack>
  );
}

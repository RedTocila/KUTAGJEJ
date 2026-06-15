'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

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
import type { RealEstatePropertySlug } from '@/lib/real-estate-constants';
import { useUser } from '@/hooks/use-user';
import { createRealEstateListing, type RealEstateListingPayload } from '@/lib/listings-client';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';

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

export interface RealEstateListingFormProps {
  /** Called after a successful save (e.g. redirect to dashboard). */
  onSuccess?: () => void;
  /** Optional back link shown next to submit. */
  backHref?: string;
  backLabel?: string;
}

type FormState = {
  propertyCategory: RealEstatePropertySlug | '';
  title: string;
  description: string;
  transactionType: '' | 'rent' | 'sale';
  price: string;
  surfaceM2: string;
  cityId: string;
  zoneId: string;
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
    surfaceM2: '',
    cityId: '',
    zoneId: '',
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
  if (!f.propertyCategory) return 'Please choose a property type.';
  if (!f.title.trim()) return 'Title is required.';
  if (!f.description.trim()) return 'Description is required.';
  if (f.transactionType !== 'rent' && f.transactionType !== 'sale') {
    return 'Please choose rent or sale.';
  }
  const price = parseFloatStrict(f.price);
  if (price === null || price < 0) return 'Enter a valid price.';
  if (f.currency !== 'EUR' && f.currency !== 'LEK') return 'Please choose a currency.';
  const surface = parseFloatStrict(f.surfaceM2);
  if (surface === null || surface <= 0) return 'Surface must be a positive number (m²).';
  if (!f.cityId || !f.zoneId) return 'Please select a city and a zone.';

  const cat = f.propertyCategory;

  if (needsCondition(cat)) {
    const ok = CONDITION_OPTIONS.some((o) => o.value === f.condition);
    if (!ok) return 'Please select the condition.';
  }

  if (needsFloor(cat)) {
    const fl = parseIntStrict(f.floor);
    if (fl === null) return 'Floor must be a whole number (e.g. 1, 2, …).';
  }

  if (needsTotalFloors(cat)) {
    const tf = parseIntStrict(f.totalFloors);
    if (tf === null || tf < 1) return 'Total floors must be a positive whole number.';
  }

  if (needsParkingFloor(cat)) {
    const pf = parseIntStrict(f.parkingFloor);
    if (pf === null) return 'Parking level must be a whole number (negative for underground).';
  }

  if (needsBedroomsBathFurnishing(cat)) {
    const br = parseIntStrict(f.bedrooms);
    const ba = parseIntStrict(f.bathrooms);
    if (br === null || br < 0) return 'Bedrooms must be a whole number (0 or more).';
    if (ba === null || ba < 0) return 'Bathrooms must be a whole number (0 or more).';
    const okF = FURNISHING_OPTIONS.some((o) => o.value === f.furnishing);
    if (!okF) return 'Please select furnishing.';
  }

  if (needsYearBuilt(cat)) {
    const y = parseIntStrict(f.yearBuilt);
    if (y === null || y < 1800 || y > 2100) return 'Year built must be a valid year.';
  }

  const phone = f.contactPhone.trim();
  if (phone.length < 6) return 'Enter a valid phone number (at least 6 characters).';
  if (phone.length > 40) return 'Phone number is too long.';
  if (!/^[\d+\s().-]{6,40}$/.test(phone)) {
    return 'Phone number may only include digits, spaces, and + ( ) . -';
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
    currency: f.currency as 'EUR' | 'LEK',
    surfaceM2: parseFloatStrict(f.surfaceM2)!,
    cityId: f.cityId,
    zoneId: f.zoneId,
    contactPhone: f.contactPhone.trim(),
  };
  if (needsCondition(cat)) payload.condition = f.condition as RealEstateListingPayload['condition'];
  if (needsFloor(cat)) payload.floor = parseIntStrict(f.floor)!;
  if (needsTotalFloors(cat)) payload.totalFloors = parseIntStrict(f.totalFloors)!;
  if (needsParkingFloor(cat)) payload.parkingFloor = parseIntStrict(f.parkingFloor)!;
  if (needsBedroomsBathFurnishing(cat)) {
    payload.bedrooms = parseIntStrict(f.bedrooms)!;
    payload.bathrooms = parseIntStrict(f.bathrooms)!;
    payload.furnishing = f.furnishing as RealEstateListingPayload['furnishing'];
  }
  if (needsYearBuilt(cat)) payload.yearBuilt = parseIntStrict(f.yearBuilt)!;
  return payload;
}

export function RealEstateListingForm(props: RealEstateListingFormProps) {
  const { onSuccess, backHref, backLabel = 'Back' } = props;
  const { user } = useUser();
  const [form, setForm] = React.useState<FormState>(() => ({
    ...emptyForm(),
    contactPhone: contactPhoneInitialFromStorage(),
  }));
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
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
    setForm((prev) => ({ ...emptyForm(), contactPhone: prev.contactPhone }));
    setLoadError(null);
    setSubmitError(null);
    setLoadingRefs(true);
    void (async () => {
      const locRes = await listRealEstateLocationsPublic();
      if (cancelled) return;
      if (locRes.error) {
        setLoadError(locRes.error ?? 'Failed to load form data.');
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
    if (!user) return;
    const isPortal =
      user.accountType === 'individual' ||
      user.accountType === 'business' ||
      user.role === 'business-user';
    if (!isPortal) return;
    const p = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (!p) return;
    setForm((prev) => {
      if (prev.contactPhone.trim()) return prev;
      return { ...prev, contactPhone: p };
    });
  }, [user]);

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
      const { error } = await createRealEstateListing(payload);
      if (error) {
        setSubmitError(error);
        return;
      }
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  const cat = form.propertyCategory;

  return (
    <Stack component="form" spacing={2.5} onSubmit={(e) => void handleSubmit(e)}>
      <Typography variant="body2" color="text.secondary">
        Immovable property — use English for now. Fill in title, description, and property type first; other fields depend
        on the type you choose.
      </Typography>

      {loadError ? (
        <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
          {loadError}
        </Alert>
      ) : null}
      {submitError ? (
        <Alert severity="error" sx={{ borderRadius: 1.5 }}>
          {submitError}
        </Alert>
      ) : null}

      <TextField label="Title" value={form.title} onChange={onField('title')} required fullWidth />
      <TextField
        label="Description"
        value={form.description}
        onChange={onField('description')}
        required
        fullWidth
        multiline
        minRows={3}
      />

      <SearchableSelect
        label="Property type"
        value={form.propertyCategory}
        onChange={(v) => setForm((p) => ({ ...p, propertyCategory: v as RealEstatePropertySlug | '' }))}
        options={REAL_ESTATE_PROPERTY_CATEGORIES.map((c) => ({ value: c.slug, label: c.label }))}
        emptyLabel="Select…"
        required
        disabled={loadingRefs}
      />

      <FormControl disabled={loadingRefs}>
        <FormLabel>Transaction type</FormLabel>
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
        <TextField
          label="Price"
          type="text"
          inputMode="decimal"
          value={form.price}
          onChange={onField('price')}
          required
          fullWidth
        />
        <SearchableSelect
          label="Currency"
          value={form.currency}
          onChange={(v) => setForm((p) => ({ ...p, currency: v as FormState['currency'] }))}
          options={CURRENCY_OPTIONS}
          emptyLabel="Select…"
          required
          disabled={loadingRefs}
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <SearchableSelect
          label="City"
          value={form.cityId}
          onChange={(v) => setForm((p) => ({ ...p, cityId: v, zoneId: '' }))}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Select…"
          required
          disabled={loadingRefs || cities.length === 0}
        />
        <SearchableSelect
          label="Zone"
          value={form.zoneId}
          onChange={(v) => setForm((p) => ({ ...p, zoneId: v }))}
          options={zonesForCity.map((z) => ({ value: z.id, label: z.name }))}
          emptyLabel="Select…"
          required
          disabled={loadingRefs || !form.cityId || zonesForCity.length === 0}
        />
      </Stack>
      {!loadingRefs && cities.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No cities yet — a platform admin must add cities and zones under Dashboard → Vendndodhjet (pasuri).
        </Typography>
      ) : null}

      <TextField
        label="Surface"
        type="text"
        inputMode="decimal"
        value={form.surfaceM2}
        onChange={onField('surfaceM2')}
        required
        fullWidth
        helperText="Interior or plot area in square metres (m²)."
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
            Category-specific details
          </Typography>
        </>
      ) : null}

      {needsCondition(cat) ? (
        <SearchableSelect
          label="Condition"
          value={form.condition}
          onChange={(v) => setForm((p) => ({ ...p, condition: v as FormState['condition'] }))}
          options={CONDITION_OPTIONS}
          emptyLabel="Select…"
          required
          disabled={loadingRefs}
        />
      ) : null}

      {needsFloor(cat) ? (
        <TextField
          label="Floor"
          type="text"
          inputMode="numeric"
          value={form.floor}
          onChange={onField('floor')}
          required
          fullWidth
          helperText="Which floor the unit is on (e.g. 1 = first floor)."
        />
      ) : null}

      {needsTotalFloors(cat) ? (
        <TextField
          label="Total floors (property)"
          type="text"
          inputMode="numeric"
          value={form.totalFloors}
          onChange={onField('totalFloors')}
          required
          fullWidth
          helperText="How many levels the villa has in total."
        />
      ) : null}

      {needsParkingFloor(cat) ? (
        <TextField
          label="Parking level"
          type="text"
          inputMode="numeric"
          value={form.parkingFloor}
          onChange={onField('parkingFloor')}
          required
          fullWidth
          helperText="Use negative numbers for underground levels (e.g. -1, -2)."
        />
      ) : null}

      {needsBedroomsBathFurnishing(cat) ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Bedrooms"
            type="text"
            inputMode="numeric"
            value={form.bedrooms}
            onChange={onField('bedrooms')}
            required
            fullWidth
          />
          <TextField
            label="Bathrooms"
            type="text"
            inputMode="numeric"
            value={form.bathrooms}
            onChange={onField('bathrooms')}
            required
            fullWidth
          />
        </Stack>
      ) : null}

      {needsBedroomsBathFurnishing(cat) ? (
        <SearchableSelect
          label="Furnishing"
          value={form.furnishing}
          onChange={(v) => setForm((p) => ({ ...p, furnishing: v as FormState['furnishing'] }))}
          options={FURNISHING_OPTIONS}
          emptyLabel="Select…"
          required
          disabled={loadingRefs}
        />
      ) : null}

      {needsYearBuilt(cat) ? (
        <TextField
          label="Year built"
          type="text"
          inputMode="numeric"
          value={form.yearBuilt}
          onChange={onField('yearBuilt')}
          required
          fullWidth
        />
      ) : null}

      <TextField
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={form.contactPhone}
        onChange={onField('contactPhone')}
        required
        fullWidth
        helperText="Shown to interested parties for this listing. Pre-filled from your account if you added a phone when registering or in your profile — you can change it here."
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1, justifyContent: 'flex-end' }}>
        {backHref ? (
          <Button component={RouterLink} href={backHref} variant="outlined" color="inherit">
            {backLabel}
          </Button>
        ) : null}
        <Button type="submit" variant="contained" disabled={submitting || loadingRefs}>
          {submitting ? 'Saving…' : 'Save listing'}
        </Button>
      </Stack>
    </Stack>
  );
}

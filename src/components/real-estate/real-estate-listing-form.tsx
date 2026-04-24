'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
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

import {
  CONDITION_OPTIONS,
  CURRENCY_OPTIONS,
  FURNISHING_OPTIONS,
  needsApartmentType,
  needsBedroomsBathFurnishing,
  needsCondition,
  needsFloor,
  needsParkingFloor,
  needsTotalFloors,
  needsYearBuilt,
  REAL_ESTATE_PROPERTY_CATEGORIES,
  TRANSACTION_OPTIONS,
} from '@/lib/real-estate-constants';
import type { RealEstatePropertySlug } from '@/lib/real-estate-constants';
import {
  createRealEstateListing,
  listCategoriesPublic,
  type RealEstateListingPayload,
} from '@/lib/listings-client';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import type { ListingTypeOption } from '@/types/listing-category';

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
  apartmentTypeSlug: string;
  floor: string;
  totalFloors: string;
  parkingFloor: string;
  bedrooms: string;
  bathrooms: string;
  furnishing: (typeof FURNISHING_OPTIONS)[number]['value'] | '';
  yearBuilt: string;
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
    apartmentTypeSlug: '',
    floor: '',
    totalFloors: '',
    parkingFloor: '',
    bedrooms: '',
    bathrooms: '',
    furnishing: '',
    yearBuilt: '',
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

function validateForm(
  f: FormState,
  apartmentTypeOptions: ListingTypeOption[],
): string | null {
  if (!f.propertyCategory) return 'Please choose a property category.';
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

    if (needsApartmentType(cat)) {
      if (apartmentTypeOptions.length === 0) {
        return 'No apartment type options are available. A platform admin must add rows under Dashboard → Kategoritë → Real estate (either «Apartment types (listing form)» or «Llojet e listimit»).';
      }
    if (!apartmentTypeOptions.some((o) => o.slug === f.apartmentTypeSlug)) {
      return 'Please select an apartment type.';
    }
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
  };
  if (needsCondition(cat)) payload.condition = f.condition as RealEstateListingPayload['condition'];
  if (needsApartmentType(cat)) payload.apartmentTypeSlug = f.apartmentTypeSlug;
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
  const [form, setForm] = React.useState<FormState>(() => emptyForm());
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [apartmentTypes, setApartmentTypes] = React.useState<ListingTypeOption[]>([]);
  /** True when dedicated `apartmentTypes` is empty but we use `listingTypes` from the same category (legacy admin data). */
  const [apartmentTypesFromListingFallback, setApartmentTypesFromListingFallback] = React.useState(false);
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
    setForm(emptyForm());
    setLoadError(null);
    setSubmitError(null);
    setLoadingRefs(true);
    void (async () => {
      const [locRes, catRes] = await Promise.all([listRealEstateLocationsPublic(), listCategoriesPublic()]);
      if (cancelled) return;
      if (locRes.error || catRes.error) {
        setLoadError(locRes.error ?? catRes.error ?? 'Failed to load form data.');
        setCities([]);
        setApartmentTypes([]);
        setApartmentTypesFromListingFallback(false);
      } else {
        setCities(locRes.cities ?? []);
        const re = (catRes.categories ?? []).find((c) => c.key === 'real-estate');
        const dedicated = re?.apartmentTypes ?? [];
        const listing = re?.listingTypes ?? [];
        if (dedicated.length > 0) {
          setApartmentTypes(dedicated);
          setApartmentTypesFromListingFallback(false);
        } else if (listing.length > 0) {
          setApartmentTypes(listing);
          setApartmentTypesFromListingFallback(true);
        } else {
          setApartmentTypes([]);
          setApartmentTypesFromListingFallback(false);
        }
      }
      setLoadingRefs(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onField =
    (key: keyof FormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: ev.target.value }));
    };

  const onSelect =
    (key: keyof FormState) =>
    (ev: SelectChangeEvent<string>) => {
      const v = ev.target.value;
      setForm((prev) => {
        const next = { ...prev, [key]: v } as FormState;
        if (key === 'cityId') next.zoneId = '';
        return next;
      });
    };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);
    const err = validateForm(form, apartmentTypes);
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
        Immovable property — all fields use English for now. Required fields depend on the category you pick.
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

      <FormControl fullWidth required disabled={loadingRefs}>
        <InputLabel id="re-cat-label">Property category</InputLabel>
        <Select<string>
          labelId="re-cat-label"
          label="Property category"
          value={form.propertyCategory}
          onChange={onSelect('propertyCategory')}
        >
          <MenuItem value="">
            <em>Select…</em>
          </MenuItem>
          {REAL_ESTATE_PROPERTY_CATEGORIES.map((c) => (
            <MenuItem key={c.slug} value={c.slug}>
              {c.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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
        <FormControl fullWidth required disabled={loadingRefs}>
          <InputLabel id="re-cur-label">Currency</InputLabel>
          <Select<string>
            labelId="re-cur-label"
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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl fullWidth required disabled={loadingRefs || cities.length === 0}>
          <InputLabel id="re-city-label">City</InputLabel>
          <Select<string> labelId="re-city-label" label="City" value={form.cityId} onChange={onSelect('cityId')}>
            <MenuItem value="">
              <em>Select…</em>
            </MenuItem>
            {cities.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth required disabled={loadingRefs || !form.cityId || zonesForCity.length === 0}>
          <InputLabel id="re-zone-label">Zone</InputLabel>
          <Select<string> labelId="re-zone-label" label="Zone" value={form.zoneId} onChange={onSelect('zoneId')}>
            <MenuItem value="">
              <em>Select…</em>
            </MenuItem>
            {zonesForCity.map((z) => (
              <MenuItem key={z.id} value={z.id}>
                {z.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
        <FormControl fullWidth required disabled={loadingRefs}>
          <InputLabel id="re-cond-label">Condition</InputLabel>
          <Select<string>
            labelId="re-cond-label"
            label="Condition"
            value={form.condition}
            onChange={onSelect('condition')}
          >
            <MenuItem value="">
              <em>Select…</em>
            </MenuItem>
            {CONDITION_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}

      {needsApartmentType(cat) ? (
        <Stack spacing={1}>
          {!loadingRefs && apartmentTypes.length === 0 ? (
            <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
              <strong>Apartment type</strong> has no options: both <strong>Apartment types (listing form)</strong> and{' '}
              <strong>Llojet e listimit</strong> are empty for real estate. Add at least one row in either table under{' '}
              <strong>Dashboard → Kategoritë → Real estate</strong>, click <strong>Ruaj ndryshimet</strong>, then reload
              this page.
            </Alert>
          ) : null}
          {!loadingRefs && apartmentTypesFromListingFallback ? (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
              Options below come from <strong>Llojet e listimit</strong> because <strong>Apartment types (listing form)</strong>{' '}
              is still empty. That is why your «Apartament / Vila» rows did not show before. Add dedicated apartment types
              (e.g. Studio, Two-bedroom) in admin when you want English sub-types only for apartments.
            </Alert>
          ) : null}
          <FormControl fullWidth required disabled={loadingRefs}>
            <InputLabel id="re-apt-type-label">Apartment type</InputLabel>
            <Select<string>
              labelId="re-apt-type-label"
              label="Apartment type"
              value={form.apartmentTypeSlug}
              onChange={onSelect('apartmentTypeSlug')}
            >
              <MenuItem value="">
                <em>Select…</em>
              </MenuItem>
              {!loadingRefs && apartmentTypes.length === 0 ? (
                <MenuItem disabled value="__no-types__" sx={{ whiteSpace: 'normal', py: 1.5 }}>
                  No types available — see warning above
                </MenuItem>
              ) : null}
              {apartmentTypes.map((t) => (
                <MenuItem key={t.slug} value={t.slug}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
            {!loadingRefs && apartmentTypes.length === 0 ? (
              <FormHelperText>Add rows in admin, save, reload this page.</FormHelperText>
            ) : null}
          </FormControl>
        </Stack>
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
        <FormControl fullWidth required disabled={loadingRefs}>
          <InputLabel id="re-furn-label">Furnishing</InputLabel>
          <Select<string>
            labelId="re-furn-label"
            label="Furnishing"
            value={form.furnishing}
            onChange={onSelect('furnishing')}
          >
            <MenuItem value="">
              <em>Select…</em>
            </MenuItem>
            {FURNISHING_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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

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
import type { RealEstatePropertySlug } from '@/lib/real-estate-constants';
import { useUser } from '@/hooks/use-user';
import { createRealEstateListing, updateRealEstateListing, type RealEstateListingPayload } from '@/lib/listings-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { contactPhoneFromStorage, resolveContactPhone } from '@/lib/listing-form-defaults';
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
  if (!f.propertyCategory) return 'Ju lutemi zgjidhni llojin e pronës.';
  if (!f.title.trim()) return 'Titulli është i detyrueshëm.';
  if (!f.description.trim()) return 'Përshkrimi është i detyrueshëm.';
  if (f.transactionType !== 'rent' && f.transactionType !== 'sale') {
    return 'Ju lutemi zgjidhni me qira ose në shitje.';
  }
  const price = parseFloatStrict(f.price);
  if (price === null || price < 0) return 'Vendosni një çmim të vlefshëm.';
  if (f.currency !== 'EUR' && f.currency !== 'LEK') return 'Ju lutemi zgjidhni monedhën.';
  const surface = parseFloatStrict(f.surfaceM2);
  if (surface === null || surface <= 0) return 'Sipërfaqja duhet të jetë numër pozitiv (m²).';
  if (!f.cityId || !f.zoneId) return 'Ju lutemi zgjidhni qytetin dhe zonën.';

  const cat = f.propertyCategory;

  if (needsCondition(cat)) {
    const ok = CONDITION_OPTIONS.some((o) => o.value === f.condition);
    if (!ok) return 'Ju lutemi zgjidhni gjendjen.';
  }

  if (needsFloor(cat)) {
    const fl = parseIntStrict(f.floor);
    if (fl === null) return 'Kati duhet të jetë numër i plotë (p.sh. 1, 2, …).';
  }

  if (needsTotalFloors(cat)) {
    const tf = parseIntStrict(f.totalFloors);
    if (tf === null || tf < 1) return 'Numri i kateve duhet të jetë numër i plotë pozitiv.';
  }

  if (needsParkingFloor(cat)) {
    const pf = parseIntStrict(f.parkingFloor);
    if (pf === null) return 'Niveli i parkimit duhet të jetë numër i plotë (negativ për nëntokë).';
  }

  if (needsBedroomsBathFurnishing(cat)) {
    const br = parseIntStrict(f.bedrooms);
    const ba = parseIntStrict(f.bathrooms);
    if (br === null || br < 0) return 'Dhomat e gjumit duhet të jenë numër i plotë (0 ose më shumë).';
    if (ba === null || ba < 0) return 'Banjot duhet të jenë numër i plotë (0 ose më shumë).';
    const okF = FURNISHING_OPTIONS.some((o) => o.value === f.furnishing);
    if (!okF) return 'Ju lutemi zgjidhni mobilimin.';
  }

  if (needsYearBuilt(cat)) {
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

function formFromListing(l: RealEstateMineListing): FormState {
  return {
    propertyCategory: (l.propertyCategory as RealEstatePropertySlug) || '',
    title: l.title || '',
    description: l.description || '',
    transactionType: l.transactionType === 'rent' || l.transactionType === 'sale' ? l.transactionType : '',
    price: l.price != null ? String(l.price) : '',
    surfaceM2: l.surfaceM2 != null ? String(l.surfaceM2) : '',
    cityId: l.cityId ? String(l.cityId) : '',
    zoneId: l.zoneId ? String(l.zoneId) : '',
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
  const { user, checkSession } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsOkazion = searchParams.get('okazion') === '1';
  const [form, setForm] = React.useState<FormState>(() =>
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
    setForm(formFromListing(initialListing));
    setExistingImageUrls((initialListing.imageUrls ?? []).filter(Boolean));
    setImages([]);
  }, [initialListing]);

  React.useEffect(() => {
    if (!user || isEdit) return;
    const isPortal =
      user.accountType === 'individual' ||
      user.accountType === 'business' ||
      user.role === 'business-user';
    if (!isPortal) return;
    const p = resolveContactPhone(user);
    if (!p) return;
    setForm((prev) => {
      if (prev.contactPhone.trim()) return prev;
      return { ...prev, contactPhone: p };
    });
  }, [user, isEdit]);

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
      if (!isEdit && result.id && (wantsOkazion || okazionMode !== 'off')) {
        const boost = await activateOkazionAfterCreate({
          mode: wantsOkazion ? okazionPayRef.current : okazionMode,
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
      {submitError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {submitError}
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
      <ListingTextField
        label="Përshkrimi"
        value={form.description}
        onChange={onField('description')}
        required
        fullWidth
        multiline
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
          required
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
          required
          fullWidth
          helperText="Në cilin kat ndodhet njësia (p.sh. 1 = kati i parë)."
        />
      ) : null}

      {needsTotalFloors(cat) ? (
        <ListingTextField
          label="Numri i kateve (prona)"
          type="text"
          inputMode="numeric"
          value={form.totalFloors}
          onChange={onField('totalFloors')}
          required
          fullWidth
          helperText="Sa kate ka vila në total."
        />
      ) : null}

      {needsParkingFloor(cat) ? (
        <ListingTextField
          label="Niveli i parkimit"
          type="text"
          inputMode="numeric"
          value={form.parkingFloor}
          onChange={onField('parkingFloor')}
          required
          fullWidth
          helperText="Përdorni numra negativë për nivelet nëntokësore (p.sh. -1, -2)."
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
            required
            fullWidth
          />
          <ListingTextField
            label="Banjo"
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
          label="Mobilimi"
          value={form.furnishing}
          onChange={(v) => setForm((p) => ({ ...p, furnishing: v as FormState['furnishing'] }))}
          options={FURNISHING_OPTIONS}
          emptyLabel="Zgjidh…"
          required
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
          required
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

      {!isEdit && !wantsOkazion ? (
        <OkazionBoostUpsell value={okazionMode} onChange={setOkazionMode} />
      ) : null}

      {wantsOkazion && !isEdit ? (
        <OkazionPostActions
          submitting={submitting}
          disabled={loadingRefs}
          onPost={(mode) => {
            okazionPayRef.current = mode;
            setOkazionMode(mode);
            formRef.current?.requestSubmit();
          }}
        />
      ) : (
        <ListingFormActions
          submitLabel={isEdit ? 'Përditëso njoftimin' : 'Posto njoftimin'}
          submitting={submitting}
          disabled={loadingRefs}
          backHref={backHref}
          backLabel={backLabel}
        />
      )}
    </Stack>
  );
}

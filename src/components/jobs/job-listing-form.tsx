'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Typography,
} from '@mui/material';

import {
  JOB_BENEFIT_PRESETS,
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_GENDER_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { applyEmptyKnownDefaults, knownCreateDefaultsFromStorage } from '@/lib/listing-form-defaults';
import { mergeCreateFormState, mergeImageUrls } from '@/lib/listing-form-draft';
import { createJobListing, updateJobListing, type JobMineListing } from '@/lib/listings-client';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { useCreateListingDefaults } from '@/hooks/use-create-listing-defaults';
import { useListingFormDraft } from '@/hooks/use-listing-form-draft';
import { useUser } from '@/hooks/use-user';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { SearchableSelect } from '@/components/core/searchable-select';
import { JobFormStringList } from '@/components/jobs/job-form-string-list';
import { JobListingFallback } from '@/components/jobs/job-listing-fallback';
import {
  exclusiveLocationPayload,
  inferListingLocationMode,
  ListingLocationChoice,
  type ListingLocationMode,
} from '@/components/listings/listing-location-choice';
import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { ListingBoostChoiceBar } from '@/components/user/listing-boost-choice-bar';
import { usePublishListingFormSnapshot } from '@/components/user/listing-form-snapshot-context';
import {
  ListingDescriptionField,
  ListingFormActionError,
  ListingFormActions,
  ListingFormSection,
  ListingTextField,
  ListingToggle,
} from '@/components/user/listing-form-ui';
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

const MAX_JOB_IMAGES = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFloatStrict(s: string): number | null {
  const t = s.trim();
  if (t === '' || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function parseAgeStrict(s: string): number | null {
  const t = s.trim();
  if (t === '' || !/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobListingFormProps {
  onSuccess?: () => void;
  backHref?: string;
  backLabel?: string;
  editListingId?: string;
  initialListing?: JobMineListing | null;
}

type JobFormState = {
  title: string;
  description: string;
  coverMode: 'image' | 'mockup';
  industry: string;
  cityId: string;
  zoneId: string;
  cityNameHint: string;
  zoneNameHint: string;
  locationMode: ListingLocationMode | '';
  mapsUrl: string;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
  education: string;
  experience: string;
  jobType: string;
  workLocation: string;
  preferredGender: 'male' | 'female' | 'both' | '';
  preferredAgeMin: string;
  preferredAgeMax: string;
  salary: string;
  currency: '' | 'EUR' | 'LEK';
  contactPhone: string;
  responsibilities: string[];
  requirements: string[];
  benefitIds: string[];
  customBenefitEnabled: boolean;
  customBenefit: string;
};

function emptyForm(): JobFormState {
  return {
    title: '',
    description: '',
    coverMode: 'mockup',
    industry: '',
    cityId: '',
    zoneId: '',
    cityNameHint: '',
    zoneNameHint: '',
    locationMode: '',
    mapsUrl: '',
    locationLat: null,
    locationLng: null,
    locationAddress: null,
    education: '',
    experience: '',
    jobType: '',
    workLocation: '',
    preferredGender: '',
    preferredAgeMin: '',
    preferredAgeMax: '',
    salary: '',
    currency: '',
    contactPhone: '',
    responsibilities: [],
    requirements: [],
    benefitIds: [],
    customBenefitEnabled: false,
    customBenefit: '',
  };
}

function normalizeLines(lines: string[]): string[] {
  return lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function normalizeLocationName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('sq-AL')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function buildBenefitsPayload(f: JobFormState): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = [];
  for (const id of f.benefitIds) {
    const preset = JOB_BENEFIT_PRESETS.find((p) => p.id === id);
    if (preset) items.push({ id: preset.id, label: preset.label });
  }
  const custom = f.customBenefit.replace(/\s+/g, ' ').trim();
  if (f.customBenefitEnabled && custom.length >= 3) {
    items.push({ id: 'custom', label: custom });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateForm(f: JobFormState): string | null {
  if (!f.title.trim()) return 'Titulli i punës është i detyrueshëm.';

  if (f.salary.trim()) {
    const s = parseFloatStrict(f.salary);
    if (s === null || s < 0) return 'Paga duhet të jetë një numër pozitiv.';
    if (f.currency !== 'EUR' && f.currency !== 'LEK') return 'Ju lutem zgjidhni monedhën.';
  }

  const hasAgeMin = f.preferredAgeMin.trim() !== '';
  const hasAgeMax = f.preferredAgeMax.trim() !== '';
  if (hasAgeMin !== hasAgeMax) return 'Ju lutem plotësoni moshën minimale dhe maksimale.';
  if (hasAgeMin && hasAgeMax) {
    const minAge = parseAgeStrict(f.preferredAgeMin);
    const maxAge = parseAgeStrict(f.preferredAgeMax);
    if (minAge === null || maxAge === null || minAge < 18 || maxAge > 100) {
      return 'Mosha duhet të jetë nga 18 deri në 65 vjeç.';
    }
    if (minAge > maxAge) return 'Mosha minimale nuk mund të jetë më e madhe se maksimalja.';
  }

  const phone = f.contactPhone.trim();
  if (phone.length < 6) return 'Numri i telefonit duhet të ketë të paktën 6 karaktere.';
  if (phone.length > 40) return 'Numri i telefonit është shumë i gjatë.';
  if (!/^[\d+\s().-]{6,40}$/.test(phone)) {
    return 'Numri i telefonit mund të përmbajë vetëm shifra, hapësira dhe + ( ) . -';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

function formFromListing(l: JobMineListing): JobFormState {
  const benefitIds: string[] = [];
  let customBenefit = '';
  for (const b of l.benefits ?? []) {
    if (b.id === 'custom') customBenefit = b.label || '';
    else if (JOB_BENEFIT_PRESETS.some((p) => p.id === b.id)) benefitIds.push(b.id);
  }
  return {
    title: l.title || '',
    description: l.description || '',
    coverMode:
      l.coverMode === 'image' || l.coverMode === 'mockup' ? l.coverMode : l.imageUrls?.length ? 'image' : 'mockup',
    industry: l.industry || '',
    cityId: l.cityId ? String(l.cityId) : '',
    zoneId: l.zoneId ? String(l.zoneId) : '',
    cityNameHint: l.cityName ?? '',
    zoneNameHint: l.zoneName ?? '',
    mapsUrl: l.mapsUrl ?? '',
    locationMode: inferListingLocationMode(l.cityId, l.mapsUrl),
    locationLat: l.locationLat ?? null,
    locationLng: l.locationLng ?? null,
    locationAddress: l.locationAddress ?? null,
    education: l.education || '',
    experience: JOB_EXPERIENCE_OPTIONS.some((option) => option.value === l.experience) ? l.experience : '',
    jobType: l.jobType || '',
    workLocation: l.workLocation || '',
    preferredGender: l.preferredGender || '',
    preferredAgeMin: l.preferredAgeMin != null ? String(l.preferredAgeMin) : '',
    preferredAgeMax: l.preferredAgeMax != null ? String(l.preferredAgeMax) : '',
    salary: l.salary != null ? String(l.salary) : '',
    currency: l.currency === 'EUR' || l.currency === 'LEK' ? l.currency : '',
    contactPhone: l.contactPhone || '',
    responsibilities: (l.responsibilities?.length ? l.responsibilities : []) as string[],
    requirements: (l.requirements?.length ? l.requirements : []) as string[],
    benefitIds,
    customBenefitEnabled: customBenefit.trim().length > 0,
    customBenefit,
  };
}

export function JobListingForm({
  onSuccess,
  backHref,
  backLabel = 'Mbrapa',
  editListingId,
  initialListing,
}: JobListingFormProps) {
  const isEdit = Boolean(editListingId);
  const { checkSession } = useUser();
  const { applyTo: applyKnown, rememberLocation } = useCreateListingDefaults({ enabled: !isEdit, withZone: true });
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsOkazion = searchParams.get('okazion') === '1';
  const wantsPremium = searchParams.get('premium') === '1';

  const [form, setForm] = React.useState<JobFormState>(() => {
    const base = initialListing ? formFromListing(initialListing) : emptyForm();
    const next = applyEmptyKnownDefaults(base, knownCreateDefaultsFromStorage(), { withZone: true }) as JobFormState;
    return { ...next, locationMode: next.locationMode || inferListingLocationMode(next.cityId, next.mapsUrl) };
  });
  const okazionPayRef = React.useRef<OkazionBoostMode>('buy-card');
  const premiumPayRef = React.useRef<PremiumPayMode>('buy-card');
  const premiumPackageIdRef = React.useRef(PREMIUM_PACKAGE_ID);
  const boostKindRef = React.useRef<'premium' | 'okazion' | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [images, setImages] = React.useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>(() =>
    (initialListing?.imageUrls ?? []).filter(Boolean).slice(0, MAX_JOB_IMAGES)
  );
  const [loadingCities, setLoadingCities] = React.useState(true);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const formSnapshot = React.useMemo(
    () =>
      ({
        ...form,
        imageUrls: form.coverMode === 'image' ? existingImageUrls : [],
      }) as Record<string, unknown>,
    [form, existingImageUrls]
  );
  usePublishListingFormSnapshot(formSnapshot, !isEdit);
  const { clearDraft } = useListingFormDraft({
    category: 'job-listings',
    enabled: !isEdit,
    skipRestore: Boolean(initialListing),
    form,
    setForm,
    existingImageUrls,
    setExistingImageUrls,
    images,
    setImages,
    maxImages: MAX_JOB_IMAGES,
  });

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
    if (!cities.length || form.locationMode === 'map') return;
    const cityHint = normalizeLocationName(form.cityNameHint);
    const zoneHint = normalizeLocationName(form.zoneNameHint);
    if (!cityHint && !zoneHint) return;

    const hintedCity = cityHint
      ? cities.find((city) => normalizeLocationName(city.name) === cityHint)
      : cities.find((city) => city.id === form.cityId);
    if (!hintedCity) return;

    const hintedZone = zoneHint
      ? hintedCity.zones.find((zone) => normalizeLocationName(zone.name) === zoneHint)
      : hintedCity.zones.find((zone) => zone.id === form.zoneId);
    const nextZoneId = hintedZone?.id ?? (hintedCity.id === form.cityId ? form.zoneId : '');
    if (form.cityId === hintedCity.id && form.zoneId === nextZoneId && form.locationMode === 'city') return;

    setForm((previous) => ({
      ...previous,
      cityId: hintedCity.id,
      zoneId: nextZoneId,
      locationMode: 'city',
    }));
  }, [cities, form.cityId, form.cityNameHint, form.locationMode, form.zoneId, form.zoneNameHint]);

  React.useEffect(() => {
    if (!initialListing) return;
    const fromAi = applyEmptyKnownDefaults(formFromListing(initialListing), knownCreateDefaultsFromStorage(), {
      withZone: true,
    }) as JobFormState;
    const shaped = {
      ...fromAi,
      locationMode: fromAi.locationMode || inferListingLocationMode(fromAi.cityId, fromAi.mapsUrl),
    };
    if (isEdit) {
      setForm(shaped);
      setExistingImageUrls((initialListing.imageUrls ?? []).filter(Boolean).slice(0, MAX_JOB_IMAGES));
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
      mergeImageUrls(prev, (initialListing.imageUrls ?? []).filter(Boolean), MAX_JOB_IMAGES)
    );
  }, [initialListing, isEdit]);

  React.useEffect(() => {
    if (isEdit) return;
    setForm((prev) => {
      const next = applyKnown(prev) as JobFormState;
      if (!next.locationMode && next.cityId) {
        return { ...next, locationMode: 'city' };
      }
      return next;
    });
  }, [isEdit, applyKnown]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const onField = (key: keyof JobFormState) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: ev.target.value }));
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
      let uploaded: string[] = [];
      if (images.length) {
        const up = await uploadListingImages(images, 'jobs');
        if (up.error) {
          setSubmitError(up.error);
          return;
        }
        uploaded = up.urls;
      }
      const loc = exclusiveLocationPayload(form.locationMode, form);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        industry: form.industry,
        cityId: loc.cityId,
        zoneId: loc.zoneId,
        mapsUrl: loc.mapsUrl,
        education: form.education,
        experience: form.experience,
        jobType: form.jobType,
        workLocation: form.workLocation,
        preferredGender: form.preferredGender || null,
        preferredAgeMin: form.preferredAgeMin.trim() ? parseAgeStrict(form.preferredAgeMin) : null,
        preferredAgeMax: form.preferredAgeMax.trim() ? parseAgeStrict(form.preferredAgeMax) : null,
        salary: form.salary.trim() ? parseFloatStrict(form.salary) : null,
        currency: form.salary.trim() ? form.currency : null,
        contactPhone: form.contactPhone.trim(),
        responsibilities: normalizeLines(form.responsibilities),
        requirements: normalizeLines(form.requirements),
        benefits: buildBenefitsPayload(form),
        imageUrls: form.coverMode === 'image' ? [...existingImageUrls, ...uploaded].slice(0, MAX_JOB_IMAGES) : [],
        coverMode: form.coverMode,
      };

      const result =
        isEdit && editListingId ? await updateJobListing(editListingId, payload) : await createJobListing(payload);
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      if (!isEdit) {
        clearDraft();
        rememberLocation({ cityId: loc.cityId ?? '', zoneId: loc.zoneId ?? '' });
      }
      if (!isEdit && result.id && (wantsPremium || boostKindRef.current === 'premium')) {
        const boost = await activatePremiumAfterCreate({
          mode: premiumPayRef.current,
          kind: 'job',
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
          kind: 'job',
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

  const preferredRangeEnabled = form.preferredAgeMin.trim() !== '' && form.preferredAgeMax.trim() !== '';
  const preferredAgeRange: [number, number] = [
    parseAgeStrict(form.preferredAgeMin) ?? 18,
    parseAgeStrict(form.preferredAgeMax) ?? 65,
  ];
  const previewSalary = form.salary.trim()
    ? `${formatPrice(Number(form.salary), form.currency)} / muaj`
    : 'Pagë e diskutueshme';
  const previewCity = cities.find((city) => city.id === form.cityId);
  const previewZone = previewCity?.zones.find((zone) => zone.id === form.zoneId);
  const previewLocation =
    form.locationMode === 'map'
      ? form.locationAddress
      : [previewZone?.name, previewCity?.name].filter(Boolean).join(', ');

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Stack ref={formRef} component="form" spacing={2.25} onSubmit={(e) => void handleSubmit(e)}>
      <ListingFormSection>
        <ListingToggle
          label="Kopertina e njoftimit"
          value={form.coverMode}
          onChange={(value) =>
            setForm((previous) => ({
              ...previous,
              coverMode: value === 'image' ? 'image' : 'mockup',
            }))
          }
          options={[
            { value: 'mockup', label: 'Mockup automatik' },
            { value: 'image', label: 'Foto kopertine' },
          ]}
          disabled={submitting}
        />
        {form.coverMode === 'mockup' ? (
          <Stack spacing={0.75} sx={{ width: '100%', maxWidth: 520 }}>
            <Typography variant="caption" color="text.secondary">
              Mockup-i përdoret si kopertinë; fotografia nuk do të shfaqet.
            </Typography>
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                aspectRatio: '5 / 4',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <JobListingFallback position={form.title} salary={previewSalary} location={previewLocation} />
            </Box>
          </Stack>
        ) : (
          <ListingImagePicker
            value={images}
            onChange={setImages}
            existingUrls={existingImageUrls}
            onExistingUrlsChange={setExistingImageUrls}
            max={MAX_JOB_IMAGES}
            variant="gallery"
            label="Foto e kopertinës"
            disabled={submitting}
          />
        )}
        <ListingTextField
          label="Titulli i punës"
          value={form.title}
          onChange={onField('title')}
          required
          fullWidth
          placeholder="p.sh. Menaxher Shitjesh, Programues Backend…"
        />
        <ListingDescriptionField
          label="Përshkrimi i shkurtër"
          value={form.description}
          onChange={onField('description')}
          fullWidth
          placeholder="Prezantim i pozicionit — 2–3 fjali për kandidatët…"
        />
      </ListingFormSection>

      <ListingFormSection>
        <JobFormStringList
          label="Detyrat dhe përgjegjësitë (opsionale)"
          items={form.responsibilities}
          onChange={(responsibilities) => setForm((p) => ({ ...p, responsibilities }))}
          minItems={0}
        />
        <JobFormStringList
          label="Kërkesat (opsionale)"
          items={form.requirements}
          onChange={(requirements) => setForm((p) => ({ ...p, requirements }))}
          minItems={0}
        />
      </ListingFormSection>

      <ListingFormSection>
        <FormGroup>
          {JOB_BENEFIT_PRESETS.map((preset) => (
            <FormControlLabel
              key={preset.id}
              control={
                <Checkbox
                  checked={form.benefitIds.includes(preset.id)}
                  onChange={(e) => {
                    setForm((p) => ({
                      ...p,
                      benefitIds: e.target.checked
                        ? [...p.benefitIds, preset.id]
                        : p.benefitIds.filter((id) => id !== preset.id),
                    }));
                  }}
                />
              }
              label={preset.label}
            />
          ))}
        </FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={form.customBenefitEnabled}
              onChange={(e) => setForm((previous) => ({ ...previous, customBenefitEnabled: e.target.checked }))}
            />
          }
          label="Përfitim tjetër (opsional)"
        />
        {form.customBenefitEnabled ? (
          <ListingTextField
            label="Përfitim tjetër"
            value={form.customBenefit}
            onChange={onField('customBenefit')}
            fullWidth
            placeholder="p.sh. Ditë pushimi shtesë"
          />
        ) : null}
      </ListingFormSection>

      <ListingFormSection>
        <SearchableSelect
          label="Industria"
          value={form.industry}
          onChange={(v) => setForm((p) => ({ ...p, industry: v }))}
          options={JOB_INDUSTRY_OPTIONS}
          emptyLabel="Zgjidhni industrinë…"
          allowCustom
        />
        <ListingLocationChoice
          mode={form.locationMode}
          onModeChange={(locationMode) => setForm((p) => ({ ...p, locationMode }))}
          cityId={form.cityId}
          onCityIdChange={(cityId) => setForm((p) => ({ ...p, cityId, zoneId: '' }))}
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
          showZone
        />
      </ListingFormSection>

      <ListingFormSection>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SearchableSelect
            label="Edukimi (opsionale)"
            value={form.education}
            onChange={(v) => setForm((p) => ({ ...p, education: v }))}
            options={JOB_EDUCATION_OPTIONS}
            emptyLabel="Zgjidhni nivelin…"
            clearable
          />
          <SearchableSelect
            label="Eksperienca (opsionale)"
            value={form.experience}
            onChange={(v) => setForm((p) => ({ ...p, experience: v }))}
            options={JOB_EXPERIENCE_OPTIONS}
            emptyLabel="Zgjidhni eksperiencën…"
            clearable
          />
        </Stack>
      </ListingFormSection>

      <ListingFormSection>
        <ListingToggle
          label="Gjinia e preferuar (opsionale)"
          value={form.preferredGender}
          onChange={(v) =>
            setForm((p) => ({
              ...p,
              preferredGender: v === 'male' || v === 'female' || v === 'both' ? v : '',
            }))
          }
          options={JOB_GENDER_OPTIONS}
          disabled={submitting}
        />
        <Box sx={{ px: 1, pt: 0.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={preferredRangeEnabled}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    preferredAgeMin: e.target.checked ? String(preferredAgeRange[0]) : '',
                    preferredAgeMax: e.target.checked ? String(preferredAgeRange[1]) : '',
                  }))
                }
                disabled={submitting}
              />
            }
            label="Përcakto moshën e preferuar (opsionale)"
          />
          <Box sx={{ px: 1, pt: 1, opacity: preferredRangeEnabled ? 1 : 0.5 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, mb: 0.5 }}>
              {preferredAgeRange[0]} – {preferredAgeRange[1]} vjeç
            </Typography>
            <Slider
              value={preferredAgeRange}
              onChange={(_, value) => {
                if (!Array.isArray(value)) return;
                const [minAge, maxAge] = value;
                setForm((p) => ({
                  ...p,
                  preferredAgeMin: String(minAge),
                  preferredAgeMax: String(maxAge),
                }));
              }}
              min={18}
              max={65}
              step={1}
              valueLabelDisplay="auto"
              disabled={submitting || !preferredRangeEnabled}
              aria-label="Mosha e preferuar"
            />
          </Box>
        </Box>
      </ListingFormSection>

      <ListingFormSection>
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ mb: 0.5, fontSize: '0.875rem', fontWeight: 600 }}>
            Lloji i kontratës
          </FormLabel>
          <RadioGroup
            row
            value={form.jobType}
            onChange={(_, v) => setForm((p) => ({ ...p, jobType: v }))}
            sx={{ gap: 0.5, flexWrap: 'wrap' }}
          >
            {JOB_TYPE_OPTIONS.map((o) => (
              <FormControlLabel key={o.value} value={o.value} control={<Radio />} label={o.label} />
            ))}
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ mb: 0.5, fontSize: '0.875rem', fontWeight: 600 }}>
            Vendi i punës
          </FormLabel>
          <RadioGroup row value={form.workLocation} onChange={(_, v) => setForm((p) => ({ ...p, workLocation: v }))}>
            {WORK_LOCATION_OPTIONS.map((o) => (
              <FormControlLabel key={o.value} value={o.value} control={<Radio />} label={o.label} />
            ))}
          </RadioGroup>
        </FormControl>
      </ListingFormSection>

      <ListingFormSection>
        <ListingTextField
          label="Paga"
          type="text"
          inputMode="numeric"
          value={form.salary}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d]/g, '');
            setForm((p) => ({ ...p, salary: v }));
          }}
          fullWidth
          placeholder="p.sh. 80000"
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">/ muaj</InputAdornment>,
            },
          }}
        />
        <ListingToggle
          label="Monedha"
          value={form.currency}
          onChange={(v) => setForm((p) => ({ ...p, currency: v as JobFormState['currency'] }))}
          options={CURRENCY_OPTIONS}
          disabled={!form.salary.trim()}
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

'use client';

import * as React from 'react';
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
} from '@mui/material';

import {
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_BENEFIT_PRESETS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { SearchableSelect } from '@/components/core/searchable-select';
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
  ListingFormSection,
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
import { JobFormStringList } from '@/components/jobs/job-form-string-list';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { useUser } from '@/hooks/use-user';
import { createJobListing, updateJobListing, type JobMineListing } from '@/lib/listings-client';
import { useCreateListingDefaults } from '@/hooks/use-create-listing-defaults';
import {
  applyEmptyKnownDefaults,
  knownCreateDefaultsFromStorage,
} from '@/lib/listing-form-defaults';
import { uploadListingImages } from '@/lib/uploads-client';
import { useRouter, useSearchParams } from 'next/navigation';

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
  industry: string;
  cityId: string;
  locationMode: ListingLocationMode | '';
  mapsUrl: string;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
  education: string;
  experience: string;
  jobType: string;
  workLocation: string;
  salary: string;
  currency: '' | 'EUR' | 'LEK';
  contactPhone: string;
  responsibilities: string[];
  requirements: string[];
  benefitIds: string[];
  customBenefit: string;
};

function emptyForm(): JobFormState {
  return {
    title: '',
    description: '',
    industry: '',
    cityId: '',
    locationMode: '',
    mapsUrl: '',
    locationLat: null,
    locationLng: null,
    locationAddress: null,
    education: '',
    experience: '',
    jobType: '',
    workLocation: '',
    salary: '',
    currency: '',
    contactPhone: '',
    responsibilities: [''],
    requirements: [''],
    benefitIds: [],
    customBenefit: '',
  };
}

function normalizeLines(lines: string[]): string[] {
  return lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function buildBenefitsPayload(f: JobFormState): { id: string; label: string }[] {
  const items: { id: string; label: string }[] = [];
  for (const id of f.benefitIds) {
    const preset = JOB_BENEFIT_PRESETS.find((p) => p.id === id);
    if (preset) items.push({ id: preset.id, label: preset.label });
  }
  const custom = f.customBenefit.replace(/\s+/g, ' ').trim();
  if (custom.length >= 3) {
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
    industry: l.industry || '',
    cityId: l.cityId ? String(l.cityId) : '',
    mapsUrl: l.mapsUrl ?? '',
    locationMode: inferListingLocationMode(l.cityId, l.mapsUrl),
    locationLat: l.locationLat ?? null,
    locationLng: l.locationLng ?? null,
    locationAddress: l.locationAddress ?? null,
    education: l.education || '',
    experience: l.experience || '',
    jobType: l.jobType || '',
    workLocation: l.workLocation || '',
    salary: l.salary != null ? String(l.salary) : '',
    currency: l.currency === 'EUR' || l.currency === 'LEK' ? l.currency : '',
    contactPhone: l.contactPhone || '',
    responsibilities: (l.responsibilities?.length ? l.responsibilities : ['']) as string[],
    requirements: (l.requirements?.length ? l.requirements : ['']) as string[],
    benefitIds,
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
  const { applyTo: applyKnown, rememberLocation } = useCreateListingDefaults({ enabled: !isEdit });
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsOkazion = searchParams.get('okazion') === '1';
  const wantsPremium = searchParams.get('premium') === '1';

  const [form, setForm] = React.useState<JobFormState>(() => {
    const base = initialListing ? formFromListing(initialListing) : emptyForm();
    const next = applyEmptyKnownDefaults(base, knownCreateDefaultsFromStorage()) as JobFormState;
    return { ...next, locationMode: next.locationMode || inferListingLocationMode(next.cityId, next.mapsUrl) };
  });
  const okazionPayRef = React.useRef<OkazionBoostMode>('buy-card');
  const premiumPayRef = React.useRef<PremiumPayMode>('buy-card');
  const premiumPackageIdRef = React.useRef(PREMIUM_PACKAGE_ID);
  const boostKindRef = React.useRef<'premium' | 'okazion' | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [images, setImages] = React.useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>(
    () => (initialListing?.imageUrls ?? []).filter(Boolean).slice(0, MAX_JOB_IMAGES),
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
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!initialListing) return;
    setForm(() => {
      const next = applyEmptyKnownDefaults(
        formFromListing(initialListing),
        knownCreateDefaultsFromStorage(),
      ) as JobFormState;
      return { ...next, locationMode: next.locationMode || inferListingLocationMode(next.cityId, next.mapsUrl) };
    });
    setExistingImageUrls((initialListing.imageUrls ?? []).filter(Boolean).slice(0, MAX_JOB_IMAGES));
    setImages([]);
  }, [initialListing]);

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

  const onField =
    (key: keyof JobFormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    if (existingImageUrls.length + images.length < 1) {
      setSubmitError('Shtoni të paktën një foto.');
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
        mapsUrl: loc.mapsUrl,
        education: form.education,
        experience: form.experience,
        jobType: form.jobType,
        workLocation: form.workLocation,
        salary: form.salary.trim() ? parseFloatStrict(form.salary) : null,
        currency: form.salary.trim() ? form.currency : null,
        contactPhone: form.contactPhone.trim(),
        responsibilities: normalizeLines(form.responsibilities),
        requirements: normalizeLines(form.requirements),
        benefits: buildBenefitsPayload(form),
        imageUrls: [...existingImageUrls, ...uploaded].slice(0, MAX_JOB_IMAGES),
      };

      const result =
        isEdit && editListingId
          ? await updateJobListing(editListingId, payload)
          : await createJobListing(payload);
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      if (!isEdit) {
        rememberLocation({ cityId: loc.cityId ?? '' });
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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Stack
      ref={formRef}
      component="form"
      spacing={2.25}
      onSubmit={(e) => void handleSubmit(e)}
    >
      <ListingFormSection>
        <ListingTextField
          label="Titulli i punës"
          value={form.title}
          onChange={onField('title')}
          required
          fullWidth
          placeholder="p.sh. Menaxher Shitjesh, Programues Backend…"
        />
        <ListingImagePicker
          value={images}
          onChange={setImages}
          existingUrls={existingImageUrls}
          onExistingUrlsChange={setExistingImageUrls}
          max={MAX_JOB_IMAGES}
          label="Foto e kopertinës"
          disabled={submitting}
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
          label="Detyrat dhe përgjegjësitë"
          items={form.responsibilities}
          onChange={(responsibilities) => setForm((p) => ({ ...p, responsibilities }))}
        />
        <JobFormStringList
          label="Kërkesat"
          items={form.requirements}
          onChange={(requirements) => setForm((p) => ({ ...p, requirements }))}
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
        <ListingTextField
          label="Përfitim tjetër (opsional)"
          value={form.customBenefit}
          onChange={onField('customBenefit')}
          fullWidth
          placeholder="p.sh. Ditë pushimi shtesë"
        />
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
          onCityIdChange={(cityId) => setForm((p) => ({ ...p, cityId }))}
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
        />
      </ListingFormSection>

      <ListingFormSection>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SearchableSelect
            label="Edukimi"
            value={form.education}
            onChange={(v) => setForm((p) => ({ ...p, education: v }))}
            options={JOB_EDUCATION_OPTIONS}
            emptyLabel="Zgjidhni nivelin…"
            clearable
          />
          <SearchableSelect
            label="Eksperienca"
            value={form.experience}
            onChange={(v) => setForm((p) => ({ ...p, experience: v }))}
            options={JOB_EXPERIENCE_OPTIONS}
            emptyLabel="Zgjidhni eksperiencën…"
            clearable
          />
        </Stack>
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
          <RadioGroup
            row
            value={form.workLocation}
            onChange={(_, v) => setForm((p) => ({ ...p, workLocation: v }))}
          >
            {WORK_LOCATION_OPTIONS.map((o) => (
              <FormControlLabel key={o.value} value={o.value} control={<Radio />} label={o.label} />
            ))}
          </RadioGroup>
        </FormControl>
      </ListingFormSection>

      <ListingFormSection>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
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
            fullWidth={false}
          />
        </Stack>
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

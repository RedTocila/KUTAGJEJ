'use client';

import * as React from 'react';
import {
  Alert,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  Typography,
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
import { JobFormStringList } from '@/components/jobs/job-form-string-list';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { useUser } from '@/hooks/use-user';
import { createJobListing, updateJobListing, type JobMineListing } from '@/lib/listings-client';
import { contactPhoneFromStorage, resolveContactPhone } from '@/lib/listing-form-defaults';
import { uploadListingImages } from '@/lib/uploads-client';
import { useRouter, useSearchParams } from 'next/navigation';

const MAX_JOB_IMAGES = 5;

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
  if (!f.description.trim()) return 'Përshkrimi është i detyrueshëm.';
  if (!f.industry) return 'Ju lutem zgjidhni industrinë.';
  if (!f.cityId) return 'Ju lutem zgjidhni qytetin.';
  if (!f.education) return 'Ju lutem zgjidhni nivelin e edukimit.';
  if (!f.experience) return 'Ju lutem zgjidhni eksperiencën e kërkuar.';
  if (!f.jobType) return 'Ju lutem zgjidhni llojin e punës.';
  if (!f.workLocation) return 'Ju lutem zgjidhni vendin e punës.';

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

  const responsibilities = normalizeLines(f.responsibilities);
  if (responsibilities.length < 1) return 'Shtoni të paktën një detyrë.';
  if (responsibilities.some((l) => l.length < 8)) return 'Çdo detyrë duhet të ketë të paktën 8 karaktere.';

  const requirements = normalizeLines(f.requirements);
  if (requirements.length < 1) return 'Shtoni të paktën një kërkesë.';
  if (requirements.some((l) => l.length < 8)) return 'Çdo kërkesë duhet të ketë të paktën 8 karaktere.';

  const benefits = buildBenefitsPayload(f);
  if (benefits.length < 1) return 'Zgjidhni të paktën një përfitim ose shtoni një të personalizuar.';

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
  const { user, checkSession } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsOkazion = searchParams.get('okazion') === '1';
  const wantsPremium = searchParams.get('premium') === '1';

  const [form, setForm] = React.useState<JobFormState>(() =>
    initialListing ? formFromListing(initialListing) : { ...emptyForm(), contactPhone: contactPhoneFromStorage() },
  );
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
    setForm(formFromListing(initialListing));
    setExistingImageUrls((initialListing.imageUrls ?? []).filter(Boolean));
    setImages([]);
  }, [initialListing]);

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
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        industry: form.industry,
        cityId: form.cityId,
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
      {submitError ? (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {submitError}
        </Alert>
      ) : null}

      <ListingFormSection title="Detajet e punës" description="Titulli dhe prezantimi i pozicionit.">
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
          label="Foto (logo / kopertinë — opsionale)"
          disabled={submitting}
        />
        <ListingTextField
          label="Përshkrimi i shkurtër"
          value={form.description}
          onChange={onField('description')}
          required
          fullWidth
          multiline
          minRows={3}
          placeholder="Prezantim i pozicionit — 2–3 fjali për kandidatët…"
          helperText="Detyrat, kërkesat dhe përfitimet plotësohen më poshtë si seksione të veçanta."
        />
      </ListingFormSection>

      <ListingFormSection title="Detyrat dhe kërkesat">
        <JobFormStringList
          label="Detyrat dhe përgjegjësitë"
          hint="Lista e detyrave kryesore (të shfaqen në faqen e njoftimit)."
          items={form.responsibilities}
          onChange={(responsibilities) => setForm((p) => ({ ...p, responsibilities }))}
        />
        <JobFormStringList
          label="Kërkesat"
          hint="Kualifikimet dhe aftësitë e kërkuara."
          items={form.requirements}
          onChange={(requirements) => setForm((p) => ({ ...p, requirements }))}
        />
      </ListingFormSection>

      <ListingFormSection title="Përfitimet" description="Zgjidhni përfitimet që ofroni.">
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

      <ListingFormSection title="Industria dhe vendndodhja">
        <SearchableSelect
          label="Industria"
          value={form.industry}
          onChange={(v) => setForm((p) => ({ ...p, industry: v }))}
          options={JOB_INDUSTRY_OPTIONS}
          emptyLabel="Zgjidhni industrinë…"
          required
        />
        <SearchableSelect
          label="Qyteti"
          value={form.cityId}
          onChange={(v) => setForm((p) => ({ ...p, cityId: v }))}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Zgjidhni qytetin…"
          required
          disabled={loadingCities || cities.length === 0}
        />
        {!loadingCities && cities.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            Nuk ka qytete të disponueshme — një administrator duhet t&apos;i shtojë te Paneli → Vendndodhjet.
          </Typography>
        ) : null}
      </ListingFormSection>

      <ListingFormSection title="Arsimi dhe eksperienca">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <SearchableSelect
            label="Edukimi"
            value={form.education}
            onChange={(v) => setForm((p) => ({ ...p, education: v }))}
            options={JOB_EDUCATION_OPTIONS}
            emptyLabel="Zgjidhni nivelin…"
            required
          />
          <SearchableSelect
            label="Eksperienca"
            value={form.experience}
            onChange={(v) => setForm((p) => ({ ...p, experience: v }))}
            options={JOB_EXPERIENCE_OPTIONS}
            emptyLabel="Zgjidhni eksperiencën…"
            required
          />
        </Stack>
      </ListingFormSection>

      <ListingFormSection title="Lloji i punës">
        <FormControl component="fieldset" required>
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
        <FormControl component="fieldset" required>
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

      <ListingFormSection title="Paga dhe kontakti">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
            helperText="Opsionale — lëreni bosh nëse nuk dëshironi ta shfaqni."
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">/ muaj</InputAdornment>,
              },
            }}
          />
          <SearchableSelect
            label="Monedha"
            value={form.currency}
            onChange={(v) => setForm((p) => ({ ...p, currency: v as JobFormState['currency'] }))}
            options={CURRENCY_OPTIONS}
            emptyLabel="Zgjidhni…"
            disabled={!form.salary.trim()}
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
          helperText="Do të shfaqet tek kandidatët e interesuar për këtë njoftim."
        />
      </ListingFormSection>

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
        <Stack spacing={1.25}>
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
        </Stack>
      )}
    </Stack>
  );
}

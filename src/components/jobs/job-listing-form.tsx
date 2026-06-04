'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Button,
  Divider,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
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
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_BENEFIT_PRESETS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { JobFormStringList } from '@/components/jobs/job-form-string-list';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { useUser } from '@/hooks/use-user';
import { createJobListing } from '@/lib/listings-client';

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

export function JobListingForm({ onSuccess, backHref, backLabel = 'Mbrapa' }: JobListingFormProps) {
  const { user } = useUser();

  const [form, setForm] = React.useState<JobFormState>(() => ({
    ...emptyForm(),
    contactPhone: contactPhoneInitialFromStorage(),
  }));
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
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
    if (!user) return;
    const p = typeof user.phone === 'string' ? user.phone.trim() : '';
    if (!p) return;
    setForm((prev) => {
      if (prev.contactPhone.trim()) return prev;
      return { ...prev, contactPhone: p };
    });
  }, [user]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const onField =
    (key: keyof JobFormState) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: ev.target.value }));
    };

  const onSelect =
    (key: keyof JobFormState) =>
    (ev: SelectChangeEvent<string>) => {
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
      };

      const { error } = await createJobListing(payload);
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

      {/* ── Detajet e punës ──────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Detajet e punës
        </Typography>

        <TextField
          label="Titulli i punës"
          value={form.title}
          onChange={onField('title')}
          required
          fullWidth
          placeholder="p.sh. Menaxher Shitjesh, Programues Backend…"
        />

        <TextField
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
      </Stack>

      <Divider />

      <JobFormStringList
        label="Detyrat dhe përgjegjësitë"
        hint="Lista e detyrave kryesore (të shfaqen në faqen e njoftimit)."
        items={form.responsibilities}
        onChange={(responsibilities) => setForm((p) => ({ ...p, responsibilities }))}
      />

      <Divider />

      <JobFormStringList
        label="Kërkesat"
        hint="Kualifikimet dhe aftësitë e kërkuara."
        items={form.requirements}
        onChange={(requirements) => setForm((p) => ({ ...p, requirements }))}
      />

      <Divider />

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Përfitimet
        </Typography>
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
        <TextField
          label="Përfitim tjetër (opsional)"
          value={form.customBenefit}
          onChange={onField('customBenefit')}
          fullWidth
          placeholder="p.sh. Ditë pushimi shtesë"
        />
      </Stack>

      <Divider />

      {/* ── Industria & Qyteti ───────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Industria dhe vendndodhja
        </Typography>

        <FormControl fullWidth required>
          <InputLabel id="job-industry-label">Industria</InputLabel>
          <Select<string>
            labelId="job-industry-label"
            label="Industria"
            value={form.industry}
            onChange={onSelect('industry')}
          >
            <MenuItem value="">
              <em>Zgjidhni industrinë…</em>
            </MenuItem>
            {JOB_INDUSTRY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth required disabled={loadingCities || cities.length === 0}>
          <InputLabel id="job-city-label">Qyteti</InputLabel>
          <Select<string>
            labelId="job-city-label"
            label="Qyteti"
            value={form.cityId}
            onChange={onSelect('cityId')}
          >
            <MenuItem value="">
              <em>Zgjidhni qytetin…</em>
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
            Nuk ka qytete të disponueshme — një administrator duhet t&apos;i shtojë te Paneli → Vendndodhjet.
          </Typography>
        ) : null}
      </Stack>

      <Divider />

      {/* ── Arsimi & eksperienca ─────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Arsimi dhe eksperienca
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl fullWidth required>
            <InputLabel id="job-edu-label">Edukimi</InputLabel>
            <Select<string>
              labelId="job-edu-label"
              label="Edukimi"
              value={form.education}
              onChange={onSelect('education')}
            >
              <MenuItem value="">
                <em>Zgjidhni nivelin…</em>
              </MenuItem>
              {JOB_EDUCATION_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel id="job-exp-label">Eksperienca</InputLabel>
            <Select<string>
              labelId="job-exp-label"
              label="Eksperienca"
              value={form.experience}
              onChange={onSelect('experience')}
            >
              <MenuItem value="">
                <em>Zgjidhni eksperiencën…</em>
              </MenuItem>
              {JOB_EXPERIENCE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      <Divider />

      {/* ── Lloji i punës & Vendndodhja ──────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Lloji i punës
        </Typography>

        <FormControl component="fieldset" required>
          <FormLabel component="legend" sx={{ mb: 0.5, fontSize: '0.875rem', fontWeight: 600 }}>
            Job Type
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
      </Stack>

      <Divider />

      {/* ── Paga & Kontakti ──────────────────────────────────────────────── */}
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Paga dhe kontakti
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
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
          <FormControl fullWidth disabled={!form.salary.trim()}>
            <InputLabel id="job-cur-label">Monedha</InputLabel>
            <Select<string>
              labelId="job-cur-label"
              label="Monedha"
              value={form.currency}
              onChange={onSelect('currency')}
            >
              <MenuItem value="">
                <em>Zgjidhni…</em>
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
      </Stack>

      {/* ── Veprimet ─────────────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1, justifyContent: 'flex-end' }}>
        {backHref ? (
          <Button component={RouterLink} href={backHref} variant="outlined" color="inherit">
            {backLabel}
          </Button>
        ) : null}
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Duke ruajtur…' : 'Ruaj njoftimin'}
        </Button>
      </Stack>
    </Stack>
  );
}

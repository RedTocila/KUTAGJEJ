'use client';

import * as React from 'react';
import { Checkbox, FormControlLabel, FormGroup, Stack, TextField, Typography } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { ListingMapsLocationFields } from '@/components/listings/listing-maps-location-fields';
import { JobListingDetailView } from '@/components/public/job-listing-detail-view';
import { ListingDescriptionField } from '@/components/user/listing-form-ui';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';
import {
  JOB_BENEFIT_PRESETS,
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { jobMineToPublic } from '@/lib/listing-mine-to-public';
import { updateJobListing, type JobMineListing } from '@/lib/listings-client';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { isPersistableImageUrl } from '@/lib/image-url';
import { commitListingPhotos } from '@/lib/owner-edit-photos';
import { uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';

const MAX_IMAGES = 5;

type JobBenefit = { id: string; label: string };

type Snapshot = {
  title: string;
  description: string;
  industry: string;
  cityId: string | null;
  cityName: string | null;
  mapsUrl: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  jobType: string;
  workLocation: string;
  education: string;
  experience: string;
  salary: number | null;
  currency: 'EUR' | 'LEK' | null;
  contactPhone: string | null;
  responsibilities: string[];
  requirements: string[];
  benefits: JobBenefit[];
};

function snapFrom(d: JobMineListing): Snapshot {
  return {
    title: d.title,
    description: d.description ?? '',
    industry: d.industry,
    cityId: d.cityId ?? null,
    cityName: d.cityName ?? null,
    mapsUrl: d.mapsUrl ?? null,
    locationAddress: d.locationAddress ?? null,
    locationLat: d.locationLat ?? null,
    locationLng: d.locationLng ?? null,
    jobType: d.jobType,
    workLocation: d.workLocation,
    education: d.education,
    experience: d.experience,
    salary: d.salary,
    currency: d.currency === 'EUR' || d.currency === 'LEK' ? d.currency : null,
    contactPhone: d.contactPhone ?? null,
    responsibilities: d.responsibilities ?? [],
    requirements: d.requirements ?? [],
    benefits: d.benefits ?? [],
  };
}

function benefitIdsFrom(benefits: JobBenefit[] | undefined): string[] {
  return (benefits ?? [])
    .filter((b) => b.id !== 'custom' && JOB_BENEFIT_PRESETS.some((p) => p.id === b.id))
    .map((b) => b.id);
}

function customBenefitFrom(benefits: JobBenefit[] | undefined): string {
  return (benefits ?? []).find((b) => b.id === 'custom')?.label ?? '';
}

function buildBenefits(benefitIds: string[], customBenefit: string): JobBenefit[] {
  const items: JobBenefit[] = [];
  for (const id of benefitIds) {
    const preset = JOB_BENEFIT_PRESETS.find((p) => p.id === id);
    if (preset) items.push({ id: preset.id, label: preset.label });
  }
  const custom = customBenefit.replace(/\s+/g, ' ').trim();
  if (custom.length >= 3) items.push({ id: 'custom', label: custom });
  return items;
}

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function JobOwnerEdit({
  initial,
  backHref = paths.user.myRealEstateListings,
}: {
  initial: JobMineListing;
  backHref?: string;
}) {
  const [draft, setDraft] = React.useState(initial);
  const [baseline, setBaseline] = React.useState(() => JSON.stringify(initial));
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [photosOpen, setPhotosOpen] = React.useState(false);
  const [existingUrls, setExistingUrls] = React.useState(initial.imageUrls ?? []);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [editingField, setEditingField] = React.useState<OwnerInlineField | null>(null);
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null);
  const [benefitIds, setBenefitIds] = React.useState(() => benefitIdsFrom(initial.benefits));
  const [customBenefit, setCustomBenefit] = React.useState(() => customBenefitFrom(initial.benefits));

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const dirty = JSON.stringify(draft) !== baseline || newFiles.length > 0;
  const preview = React.useMemo(() => jobMineToPublic(draft), [draft]);

  const syncBenefitsToDraft = (nextIds: string[], nextCustom: string) => {
    setDraft((d) => ({ ...d, benefits: buildBenefits(nextIds, nextCustom) }));
  };

  const startInline = (field: OwnerInlineField) => {
    setSnapshot(snapFrom(draft));
    setBenefitIds(benefitIdsFrom(draft.benefits));
    setCustomBenefit(customBenefitFrom(draft.benefits));
    setEditingField(field);
  };

  const cancelInline = () => {
    if (snapshot) {
      setDraft((d) => ({ ...d, ...snapshot }));
      setBenefitIds(benefitIdsFrom(snapshot.benefits));
      setCustomBenefit(customBenefitFrom(snapshot.benefits));
    }
    setSnapshot(null);
    setEditingField(null);
  };

  const doneInline = () => {
    setSnapshot(null);
    setEditingField(null);
  };

  const openPhotos = () => {
    setExistingUrls((draft.imageUrls ?? []).filter(isPersistableImageUrl));
    setNewFiles([]);
    setPhotosOpen(true);
  };

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      let uploaded: string[] = [];
      const kept = existingUrls.filter(isPersistableImageUrl);
      if (newFiles.length) {
        const up = await uploadListingImages(
          newFiles.slice(0, Math.max(0, MAX_IMAGES - kept.length)),
          'jobs',
        );
        if (up.error) {
          setError(up.error);
          return;
        }
        uploaded = up.urls;
      }
      const imageUrls = [...kept, ...uploaded].slice(0, MAX_IMAGES);
      if (imageUrls.length < 1) {
        setError('Shtoni të paktën një foto.');
        return;
      }
      const cityId = draft.cityId;
      if (!cityId) {
        setError('Zgjidhni qytetin.');
        return;
      }
      const res = await updateJobListing(draft.id, {
        title: draft.title.trim(),
        description: (draft.description ?? '').trim(),
        industry: draft.industry,
        cityId,
        mapsUrl: draft.mapsUrl?.trim() || null,
        education: draft.education,
        experience: draft.experience,
        jobType: draft.jobType,
        workLocation: draft.workLocation,
        salary: draft.salary,
        currency: draft.salary != null ? draft.currency || 'EUR' : 'EUR',
        contactPhone: draft.contactPhone ?? '',
        responsibilities: draft.responsibilities ?? [],
        requirements: draft.requirements ?? [],
        benefits: draft.benefits ?? [],
        imageUrls,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const next = { ...draft, imageUrls, cityId };
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setExistingUrls(imageUrls);
      setNewFiles([]);
      setEditingField(null);
      setSuccess('Njoftimi u përditësua.');
    } finally {
      setSaving(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' },
  } as const;

  const inlineEditors: Partial<Record<OwnerInlineField, React.ReactNode>> = {
    title: (
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 560 }}>
        <TextField
          label="Titulli"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          fullWidth
          autoFocus
          sx={fieldSx}
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    price: (
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 420 }}>
        <Stack direction="row" spacing={1.25}>
          <TextField
            label="Paga"
            value={draft.salary != null ? String(draft.salary) : ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setDraft((d) => ({
                ...d,
                salary: raw ? Number(raw) : null,
                currency: raw ? d.currency || 'EUR' : null,
              }));
            }}
            fullWidth
            autoFocus
            sx={fieldSx}
          />
          <SearchableSelect
            label="Monedha"
            value={draft.currency === 'EUR' || draft.currency === 'LEK' ? draft.currency : ''}
            onChange={(v) =>
              setDraft((d) => ({ ...d, currency: v === 'EUR' || v === 'LEK' ? v : null }))
            }
            options={CURRENCY_OPTIONS}
            emptyLabel="—"
            sx={{ minWidth: 120 }}
          />
        </Stack>
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    location: (
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 360 }}>
        <SearchableSelect
          label="Qyteti"
          value={draft.cityId ?? ''}
          onChange={(v) => {
            const cityName = cities.find((c) => c.id === v)?.name ?? null;
            setDraft((d) => ({ ...d, cityId: v || null, cityName }));
          }}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Zgjidhni…"
          required
        />
        <ListingMapsLocationFields
          value={{
            mapsUrl: draft.mapsUrl ?? '',
            locationLat: draft.locationLat ?? null,
            locationLng: draft.locationLng ?? null,
            locationAddress: draft.locationAddress ?? null,
          }}
          onChange={(next) =>
            setDraft((d) => ({
              ...d,
              mapsUrl: next.mapsUrl.trim() || null,
              locationLat: next.locationLat,
              locationLng: next.locationLng,
              locationAddress: next.locationAddress,
            }))
          }
          cityName={draft.cityName}
          showPreview
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    specs: (
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 520 }}>
        <SearchableSelect
          label="Industria"
          value={draft.industry}
          onChange={(v) => setDraft((d) => ({ ...d, industry: v }))}
          options={JOB_INDUSTRY_OPTIONS}
          emptyLabel="—"
          allowCustom
        />
        <SearchableSelect
          label="Lloji i punës"
          value={draft.jobType}
          onChange={(v) => setDraft((d) => ({ ...d, jobType: v }))}
          options={JOB_TYPE_OPTIONS}
          emptyLabel="—"
        />
        <SearchableSelect
          label="Vendndodhja e punës"
          value={draft.workLocation}
          onChange={(v) => setDraft((d) => ({ ...d, workLocation: v }))}
          options={WORK_LOCATION_OPTIONS}
          emptyLabel="—"
        />
        <SearchableSelect
          label="Arsimi"
          value={draft.education}
          onChange={(v) => setDraft((d) => ({ ...d, education: v }))}
          options={JOB_EDUCATION_OPTIONS}
          emptyLabel="Zgjidhni nivelin…"
        />
        <SearchableSelect
          label="Eksperienca"
          value={draft.experience}
          onChange={(v) => setDraft((d) => ({ ...d, experience: v }))}
          options={JOB_EXPERIENCE_OPTIONS}
          emptyLabel="Zgjidhni eksperiencën…"
        />
        <TextField
          label="Përgjegjësitë (një për rresht)"
          value={(draft.responsibilities ?? []).join('\n')}
          onChange={(e) => setDraft((d) => ({ ...d, responsibilities: linesToList(e.target.value) }))}
          fullWidth
          multiline
          minRows={3}
          sx={fieldSx}
        />
        <TextField
          label="Kërkesat (një për rresht)"
          value={(draft.requirements ?? []).join('\n')}
          onChange={(e) => setDraft((d) => ({ ...d, requirements: linesToList(e.target.value) }))}
          fullWidth
          multiline
          minRows={3}
          sx={fieldSx}
        />
        <Stack spacing={0.75}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Përfitimet</Typography>
          <FormGroup>
            {JOB_BENEFIT_PRESETS.map((preset) => (
              <FormControlLabel
                key={preset.id}
                control={
                  <Checkbox
                    checked={benefitIds.includes(preset.id)}
                    onChange={(e) => {
                      const nextIds = e.target.checked
                        ? [...benefitIds, preset.id]
                        : benefitIds.filter((id) => id !== preset.id);
                      setBenefitIds(nextIds);
                      syncBenefitsToDraft(nextIds, customBenefit);
                    }}
                  />
                }
                label={preset.label}
              />
            ))}
          </FormGroup>
          <TextField
            label="Përfitim tjetër (opsional)"
            value={customBenefit}
            onChange={(e) => {
              const next = e.target.value;
              setCustomBenefit(next);
              syncBenefitsToDraft(benefitIds, next);
            }}
            fullWidth
            placeholder="p.sh. Ditë pushimi shtesë"
            sx={fieldSx}
          />
        </Stack>
        <TextField
          label="Telefoni"
          value={draft.contactPhone ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value || null }))}
          fullWidth
          sx={fieldSx}
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    description: (
      <Stack spacing={1} sx={{ width: '100%' }}>
        <ListingDescriptionField
          label="Përshkrimi"
          value={draft.description ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          fullWidth
          autoFocus
          sx={fieldSx}
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
  };

  return (
    <ListingOwnerEditShell
      title={draft.title}
      status={draft.status}
      dirty={dirty}
      saving={saving}
      error={error}
      success={success}
      backHref={backHref}
      onSave={() => void onSave()}
      aiAssist={
        <OwnerEditAiAssist
          category="job-listings"
          currentListing={draft as unknown as Record<string, unknown>}
          onApply={(next) => {
            const merged = next as unknown as JobMineListing;
            setDraft({
              ...draft,
              ...merged,
              id: draft.id,
              status: draft.status,
              imageUrls: Array.isArray(merged.imageUrls) ? merged.imageUrls : draft.imageUrls,
            });
            setExistingUrls(Array.isArray(merged.imageUrls) ? merged.imageUrls : draft.imageUrls ?? []);
            setNewFiles([]);
          }}
        />
      }
    >
      <JobListingDetailView
        listing={preview}
        similar={[]}
        canonicalUrl=""
        ownerPreview
        ownerEdit={{
          onEditPhotos: openPhotos,
          editingField,
          onStartInlineEdit: startInline,
          inlineEditors,
        }}
      />

      <OwnerEditSectionDialog
        open={photosOpen}
        title="Fotot"
        onClose={() => setPhotosOpen(false)}
        onApply={async () => {
          const res = await commitListingPhotos({
            existingUrls,
            newFiles,
            folder: 'jobs',
            max: MAX_IMAGES,
          });
          if (res.error) {
            setError(res.error);
            return;
          }
          setDraft((d) => ({ ...d, imageUrls: res.urls }));
          setExistingUrls(res.urls);
          setNewFiles([]);
          setPhotosOpen(false);
        }}
      >
        <ListingImagePicker
          value={newFiles}
          onChange={setNewFiles}
          existingUrls={existingUrls}
          onExistingUrlsChange={setExistingUrls}
          max={MAX_IMAGES}
          label="Foto"
        />
      </OwnerEditSectionDialog>
    </ListingOwnerEditShell>
  );
}

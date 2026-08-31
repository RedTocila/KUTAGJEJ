'use client';

import * as React from 'react';
import { Box, Checkbox, FormControlLabel, FormGroup, Slider, Stack, TextField, Typography } from '@mui/material';

import { paths } from '@/paths';
import { isPersistableImageUrl } from '@/lib/image-url';
import {
  JOB_BENEFIT_PRESETS,
  JOB_EDUCATION_OPTIONS,
  JOB_EXPERIENCE_OPTIONS,
  JOB_GENDER_OPTIONS,
  JOB_INDUSTRY_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_LOCATION_OPTIONS,
} from '@/lib/job-constants';
import { jobMineToPublic } from '@/lib/listing-mine-to-public';
import { updateJobListing, type JobMineListing } from '@/lib/listings-client';
import { commitListingPhotos } from '@/lib/owner-edit-photos';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { SearchableSelect } from '@/components/core/searchable-select';
import {
  exclusiveLocationPayload,
  inferListingLocationMode,
  ListingLocationChoice,
  type ListingLocationMode,
} from '@/components/listings/listing-location-choice';
import { JobListingDetailView } from '@/components/public/job-listing-detail-view';
import { ListingDescriptionField, ListingToggle } from '@/components/user/listing-form-ui';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import { OwnerEditContactPhone } from '@/components/user/owner-edit-contact-phone';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';

const MAX_IMAGES = 1;

type JobBenefit = { id: string; label: string };

type Snapshot = {
  title: string;
  description: string;
  industry: string;
  cityId: string | null;
  zoneId: string | null;
  cityName: string | null;
  mapsUrl: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  jobType: string;
  workLocation: string;
  preferredGender: 'male' | 'female' | 'both' | null;
  preferredAgeMin: number | null;
  preferredAgeMax: number | null;
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
    zoneId: d.zoneId ?? null,
    cityName: d.cityName ?? null,
    mapsUrl: d.mapsUrl ?? null,
    locationAddress: d.locationAddress ?? null,
    locationLat: d.locationLat ?? null,
    locationLng: d.locationLng ?? null,
    jobType: d.jobType,
    workLocation: d.workLocation,
    preferredGender: d.preferredGender ?? null,
    preferredAgeMin: d.preferredAgeMin ?? null,
    preferredAgeMax: d.preferredAgeMax ?? null,
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
  const [existingUrls, setExistingUrls] = React.useState(() => (initial.imageUrls ?? []).slice(0, MAX_IMAGES));
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [editingField, setEditingField] = React.useState<OwnerInlineField | null>(null);
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null);
  const [locationMode, setLocationMode] = React.useState<ListingLocationMode | ''>(() =>
    inferListingLocationMode(initial.cityId, initial.mapsUrl)
  );
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
      setLocationMode(inferListingLocationMode(snapshot.cityId, snapshot.mapsUrl));
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
        const up = await uploadListingImages(newFiles.slice(0, Math.max(0, MAX_IMAGES - kept.length)), 'jobs');
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
      const loc = exclusiveLocationPayload(locationMode, draft);
      const res = await updateJobListing(draft.id, {
        title: draft.title.trim(),
        description: (draft.description ?? '').trim(),
        industry: draft.industry,
        cityId: loc.cityId,
        mapsUrl: loc.mapsUrl,
        education: draft.education,
        experience: draft.experience,
        jobType: draft.jobType,
        workLocation: draft.workLocation,
        preferredGender: draft.preferredGender ?? null,
        preferredAgeMin: draft.preferredAgeMin ?? null,
        preferredAgeMax: draft.preferredAgeMax ?? null,
        salary: draft.salary,
        currency: draft.salary != null ? draft.currency || 'EUR' : 'EUR',
        contactPhone: draft.contactPhone ?? '',
        responsibilities: draft.responsibilities ?? [],
        requirements: draft.requirements ?? [],
        benefits: draft.benefits ?? [],
        imageUrls,
        zoneId: loc.zoneId,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const next = { ...draft, imageUrls };
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
  const preferredRangeEnabled = draft.preferredAgeMin != null && draft.preferredAgeMax != null;
  const preferredAgeRange: [number, number] = [
    draft.preferredAgeMin ?? 18,
    draft.preferredAgeMax ?? 65,
  ];

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
    contactPhone: (
      <OwnerEditContactPhone
        value={draft.contactPhone ?? ''}
        onChange={(value) => setDraft((d) => ({ ...d, contactPhone: value || null }))}
        onDone={doneInline}
        onCancel={cancelInline}
      />
    ),
    price: (
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 420 }}>
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
        <ListingToggle
          label="Monedha"
          value={draft.currency === 'EUR' || draft.currency === 'LEK' ? draft.currency : ''}
          onChange={(v) => setDraft((d) => ({ ...d, currency: v === 'EUR' || v === 'LEK' ? v : null }))}
          options={CURRENCY_OPTIONS}
          disabled={draft.salary == null}
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    location: (
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 420 }}>
        <ListingLocationChoice
          mode={locationMode}
          onModeChange={setLocationMode}
          cityId={draft.cityId ?? ''}
          onCityIdChange={(v) => {
            const cityName = cities.find((c) => c.id === v)?.name ?? null;
            setDraft((d) => ({ ...d, cityId: v || null, zoneId: null, cityName }));
          }}
          zoneId={draft.zoneId ?? ''}
          onZoneIdChange={(v) => {
            const zone = cities
              .find((city) => city.id === (draft.cityId ?? ''))
              ?.zones.find((item) => item.id === v);
            setDraft((d) => ({ ...d, zoneId: v || null, zoneName: zone?.name ?? null }));
          }}
          cities={cities}
          maps={{
            mapsUrl: draft.mapsUrl ?? '',
            locationLat: draft.locationLat ?? null,
            locationLng: draft.locationLng ?? null,
            locationAddress: draft.locationAddress ?? null,
          }}
          onMapsChange={(next) =>
            setDraft((d) => ({
              ...d,
              mapsUrl: next.mapsUrl.trim() || null,
              locationLat: next.locationLat,
              locationLng: next.locationLng,
              locationAddress: next.locationAddress,
            }))
          }
          showZone
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
          label="Gjinia e preferuar"
          value={draft.preferredGender ?? ''}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              preferredGender: v === 'male' || v === 'female' || v === 'both' ? v : null,
            }))
          }
          options={JOB_GENDER_OPTIONS}
          emptyLabel="Pa preferencë"
          clearable
        />
        <Box sx={{ px: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={preferredRangeEnabled}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    preferredAgeMin: e.target.checked ? preferredAgeRange[0] : null,
                    preferredAgeMax: e.target.checked ? preferredAgeRange[1] : null,
                  }))
                }
                disabled={saving}
              />
            }
            label="Përcakto moshën e preferuar"
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
                setDraft((d) => ({
                  ...d,
                  preferredAgeMin: minAge,
                  preferredAgeMax: maxAge,
                }));
              }}
              min={18}
              max={65}
              step={1}
              valueLabelDisplay="auto"
              disabled={saving || !preferredRangeEnabled}
              aria-label="Mosha e preferuar"
            />
          </Box>
        </Box>
        <SearchableSelect
          label="Arsimi (opsionale)"
          value={draft.education}
          onChange={(v) => setDraft((d) => ({ ...d, education: v }))}
          options={JOB_EDUCATION_OPTIONS}
          emptyLabel="Zgjidhni nivelin…"
        />
        <SearchableSelect
          label="Eksperienca (opsionale)"
          value={draft.experience}
          onChange={(v) => setDraft((d) => ({ ...d, experience: v }))}
          options={JOB_EXPERIENCE_OPTIONS}
          emptyLabel="Zgjidhni eksperiencën…"
        />
        <TextField
          label="Përgjegjësitë (opsionale, një për rresht)"
          value={(draft.responsibilities ?? []).join('\n')}
          onChange={(e) => setDraft((d) => ({ ...d, responsibilities: linesToList(e.target.value) }))}
          fullWidth
          multiline
          minRows={3}
          sx={fieldSx}
        />
        <TextField
          label="Kërkesat (opsionale, një për rresht)"
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
            setExistingUrls(Array.isArray(merged.imageUrls) ? merged.imageUrls : (draft.imageUrls ?? []));
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
        title="Foto e kopertinës"
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
          variant="gallery"
          label="Foto e kopertinës"
        />
      </OwnerEditSectionDialog>
    </ListingOwnerEditShell>
  );
}

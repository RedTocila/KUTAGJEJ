'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { JobListingDetailView } from '@/components/public/job-listing-detail-view';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';
import { JOB_INDUSTRY_OPTIONS, JOB_TYPE_OPTIONS, WORK_LOCATION_OPTIONS } from '@/lib/job-constants';
import { jobMineToPublic } from '@/lib/listing-mine-to-public';
import { updateJobListing, type JobMineListing } from '@/lib/listings-client';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';

const MAX_IMAGES = 5;

type Snapshot = {
  title: string;
  description: string;
  industry: string;
  cityId: string | null;
  cityName: string | null;
  jobType: string;
  workLocation: string;
  education: string;
  experience: string;
  salary: number | null;
  currency: 'EUR' | 'LEK' | null;
  contactPhone: string | null;
  responsibilities: string[];
  requirements: string[];
};

function snapFrom(d: JobMineListing): Snapshot {
  return {
    title: d.title,
    description: d.description ?? '',
    industry: d.industry,
    cityId: d.cityId ?? null,
    cityName: d.cityName ?? null,
    jobType: d.jobType,
    workLocation: d.workLocation,
    education: d.education,
    experience: d.experience,
    salary: d.salary,
    currency: d.currency === 'EUR' || d.currency === 'LEK' ? d.currency : null,
    contactPhone: d.contactPhone ?? null,
    responsibilities: d.responsibilities ?? [],
    requirements: d.requirements ?? [],
  };
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

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const dirty = JSON.stringify(draft) !== baseline || newFiles.length > 0;
  const preview = React.useMemo(() => jobMineToPublic(draft), [draft]);

  const startInline = (field: OwnerInlineField) => {
    setSnapshot(snapFrom(draft));
    setEditingField(field);
  };

  const cancelInline = () => {
    if (snapshot) {
      setDraft((d) => ({ ...d, ...snapshot }));
    }
    setSnapshot(null);
    setEditingField(null);
  };

  const doneInline = () => {
    setSnapshot(null);
    setEditingField(null);
  };

  const openPhotos = () => {
    setExistingUrls(draft.imageUrls ?? []);
    setNewFiles([]);
    setPhotosOpen(true);
  };

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      let uploaded: string[] = [];
      if (newFiles.length) {
        const up = await uploadListingImages(
          newFiles.slice(0, Math.max(0, MAX_IMAGES - existingUrls.length)),
          'jobs',
        );
        if (up.error) {
          setError(up.error);
          return;
        }
        uploaded = up.urls;
      }
      const imageUrls = [...existingUrls, ...uploaded].slice(0, MAX_IMAGES);
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
        education: draft.education,
        experience: draft.experience,
        jobType: draft.jobType,
        workLocation: draft.workLocation,
        salary: draft.salary,
        currency: draft.currency,
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
        <TextField
          label="Arsimi"
          value={draft.education}
          onChange={(e) => setDraft((d) => ({ ...d, education: e.target.value }))}
          fullWidth
          sx={fieldSx}
        />
        <TextField
          label="Eksperienca"
          value={draft.experience}
          onChange={(e) => setDraft((d) => ({ ...d, experience: e.target.value }))}
          fullWidth
          sx={fieldSx}
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
        <TextField
          label="Përshkrimi"
          value={draft.description ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          fullWidth
          multiline
          minRows={4}
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
        onApply={() => {
          const pendingPreviews = newFiles.map((f) => URL.createObjectURL(f));
          setDraft((d) => ({
            ...d,
            imageUrls: [...existingUrls, ...pendingPreviews].slice(0, MAX_IMAGES),
          }));
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

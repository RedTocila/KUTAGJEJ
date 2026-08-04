'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { JobListingDetailView } from '@/components/public/job-listing-detail-view';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { JOB_INDUSTRY_OPTIONS, JOB_TYPE_OPTIONS, WORK_LOCATION_OPTIONS } from '@/lib/job-constants';
import { jobMineToPublic } from '@/lib/listing-mine-to-public';
import { updateJobListing, type JobMineListing } from '@/lib/listings-client';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';

const MAX_IMAGES = 5;

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
  const [dialog, setDialog] = React.useState<'photos' | 'info' | null>(null);
  const [existingUrls, setExistingUrls] = React.useState(initial.imageUrls ?? []);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [info, setInfo] = React.useState({
    title: initial.title,
    description: initial.description,
    industry: initial.industry,
    cityId: initial.cityId ?? '',
    jobType: initial.jobType,
    workLocation: initial.workLocation,
    education: initial.education,
    experience: initial.experience,
    salary: initial.salary != null ? String(initial.salary) : '',
    currency: (initial.currency === 'EUR' || initial.currency === 'LEK' ? initial.currency : '') as '' | 'EUR' | 'LEK',
    contactPhone: initial.contactPhone ?? '',
    responsibilities: (initial.responsibilities ?? []).join('\n'),
    requirements: (initial.requirements ?? []).join('\n'),
  });

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const dirty = JSON.stringify(draft) !== baseline || newFiles.length > 0;
  const preview = React.useMemo(() => jobMineToPublic(draft), [draft]);

  const openPhotos = () => {
    setExistingUrls(draft.imageUrls ?? []);
    setNewFiles([]);
    setDialog('photos');
  };

  const openInfo = () => {
    setInfo({
      title: draft.title,
      description: draft.description,
      industry: draft.industry,
      cityId: draft.cityId ?? '',
      jobType: draft.jobType,
      workLocation: draft.workLocation,
      education: draft.education,
      experience: draft.experience,
      salary: draft.salary != null ? String(draft.salary) : '',
      currency: draft.currency === 'EUR' || draft.currency === 'LEK' ? draft.currency : '',
      contactPhone: draft.contactPhone ?? '',
      responsibilities: (draft.responsibilities ?? []).join('\n'),
      requirements: (draft.requirements ?? []).join('\n'),
    });
    setDialog('info');
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
      const cityId = draft.cityId || info.cityId;
      if (!cityId) {
        setError('Zgjidhni qytetin.');
        return;
      }
      const res = await updateJobListing(draft.id, {
        title: draft.title.trim(),
        description: draft.description.trim(),
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
      setSuccess('Njoftimi u përditësua.');
    } finally {
      setSaving(false);
    }
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
          onEditInfo: openInfo,
          onEditPrice: openInfo,
        }}
      />

      <OwnerEditSectionDialog
        open={dialog === 'photos'}
        title="Fotot"
        onClose={() => setDialog(null)}
        onApply={() => {
          const pendingPreviews = newFiles.map((f) => URL.createObjectURL(f));
          setDraft((d) => ({
            ...d,
            imageUrls: [...existingUrls, ...pendingPreviews].slice(0, MAX_IMAGES),
          }));
          setDialog(null);
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

      <OwnerEditSectionDialog
        open={dialog === 'info'}
        title="Të dhënat e punës"
        onClose={() => setDialog(null)}
        onApply={() => {
          const cityName = cities.find((c) => c.id === info.cityId)?.name ?? draft.cityName;
          const lines = (text: string) =>
            text
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean);
          setDraft((d) => ({
            ...d,
            title: info.title.trim(),
            description: info.description.trim(),
            industry: info.industry,
            cityId: info.cityId || null,
            cityName,
            jobType: info.jobType,
            workLocation: info.workLocation,
            education: info.education,
            experience: info.experience,
            salary: info.salary.trim() ? Number(info.salary) : null,
            currency: info.salary.trim() && info.currency ? info.currency : null,
            contactPhone: info.contactPhone.trim() || null,
            responsibilities: lines(info.responsibilities),
            requirements: lines(info.requirements),
          }));
          setDialog(null);
        }}
      >
        <TextField label="Titulli" value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} fullWidth required />
        <SearchableSelect
          label="Industria"
          value={info.industry}
          onChange={(v) => setInfo({ ...info, industry: v })}
          options={JOB_INDUSTRY_OPTIONS}
          emptyLabel="—"
        />
        <SearchableSelect
          label="Qyteti"
          value={info.cityId}
          onChange={(v) => setInfo({ ...info, cityId: v })}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Zgjidhni…"
          required
        />
        <TextField
          label="Përshkrimi"
          value={info.description}
          onChange={(e) => setInfo({ ...info, description: e.target.value })}
          fullWidth
          multiline
          minRows={3}
          required
        />
        <SearchableSelect
          label="Lloji i punës"
          value={info.jobType}
          onChange={(v) => setInfo({ ...info, jobType: v })}
          options={JOB_TYPE_OPTIONS}
          emptyLabel="—"
        />
        <SearchableSelect
          label="Vendndodhja e punës"
          value={info.workLocation}
          onChange={(v) => setInfo({ ...info, workLocation: v })}
          options={WORK_LOCATION_OPTIONS}
          emptyLabel="—"
        />
        <TextField label="Arsimi" value={info.education} onChange={(e) => setInfo({ ...info, education: e.target.value })} fullWidth />
        <TextField label="Eksperienca" value={info.experience} onChange={(e) => setInfo({ ...info, experience: e.target.value })} fullWidth />
        <Stack direction="row" spacing={1.5}>
          <TextField label="Paga" value={info.salary} onChange={(e) => setInfo({ ...info, salary: e.target.value })} fullWidth />
          <SearchableSelect
            label="Monedha"
            value={info.currency}
            onChange={(v) => setInfo({ ...info, currency: v as '' | 'EUR' | 'LEK' })}
            options={CURRENCY_OPTIONS}
            emptyLabel="—"
            sx={{ minWidth: 120 }}
          />
        </Stack>
        <TextField
          label="Përgjegjësitë (një për rresht)"
          value={info.responsibilities}
          onChange={(e) => setInfo({ ...info, responsibilities: e.target.value })}
          fullWidth
          multiline
          minRows={3}
        />
        <TextField
          label="Kërkesat (një për rresht)"
          value={info.requirements}
          onChange={(e) => setInfo({ ...info, requirements: e.target.value })}
          fullWidth
          multiline
          minRows={3}
        />
        <TextField
          label="Telefoni"
          value={info.contactPhone}
          onChange={(e) => setInfo({ ...info, contactPhone: e.target.value })}
          fullWidth
          required
        />
      </OwnerEditSectionDialog>
    </ListingOwnerEditShell>
  );
}

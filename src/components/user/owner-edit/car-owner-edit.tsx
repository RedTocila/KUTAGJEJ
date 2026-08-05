'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { CarListingDetailView } from '@/components/public/car-listing-detail-view';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';
import {
  CAR_COLOUR_OPTIONS,
  FUEL_TYPE_OPTIONS,
  TRANSMISSION_OPTIONS,
} from '@/lib/car-constants';
import { carMineToPublic } from '@/lib/listing-mine-to-public';
import { updateCarListing, type CarMineListing } from '@/lib/listings-client';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';

const MAX_IMAGES = 8;

type Snapshot = {
  make: string;
  model: string;
  variant: string;
  description: string;
  year: number;
  kilometers: number;
  transmission: string;
  fuelType: string;
  price: number;
  currency: string;
  color: string;
  cityId: string | null;
  cityName: string | null;
  contactPhone: string | null;
};

function snapFrom(d: CarMineListing): Snapshot {
  return {
    make: d.make,
    model: d.model,
    variant: d.variant,
    description: d.description ?? '',
    year: d.year,
    kilometers: d.kilometers,
    transmission: d.transmission,
    fuelType: d.fuelType,
    price: d.price,
    currency: d.currency,
    color: d.color,
    cityId: d.cityId ?? null,
    cityName: d.cityName ?? null,
    contactPhone: d.contactPhone ?? null,
  };
}

export function CarOwnerEdit({
  initial,
  backHref = paths.user.myRealEstateListings,
}: {
  initial: CarMineListing;
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
  const preview = React.useMemo(() => carMineToPublic(draft), [draft]);

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
          'cars',
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
      const res = await updateCarListing(draft.id, {
        make: draft.make,
        model: draft.model,
        variant: draft.variant,
        description: draft.description ?? '',
        year: draft.year,
        kilometers: draft.kilometers,
        transmission: draft.transmission,
        fuelType: draft.fuelType,
        price: draft.price,
        currency: draft.currency,
        color: draft.color,
        finish: draft.finish ?? [],
        extras: draft.extras ?? [],
        cityId,
        contactPhone: draft.contactPhone ?? '',
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
        <Stack direction="row" spacing={1.25}>
          <TextField
            label="Marka"
            value={draft.make}
            onChange={(e) => setDraft((d) => ({ ...d, make: e.target.value }))}
            fullWidth
            autoFocus
            sx={fieldSx}
          />
          <TextField
            label="Modeli"
            value={draft.model}
            onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
            fullWidth
            sx={fieldSx}
          />
        </Stack>
        <TextField
          label="Varianti"
          value={draft.variant}
          onChange={(e) => setDraft((d) => ({ ...d, variant: e.target.value }))}
          fullWidth
          sx={fieldSx}
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    price: (
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 420 }}>
        <Stack direction="row" spacing={1.25}>
          <TextField
            label="Çmimi"
            value={String(draft.price)}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setDraft((d) => ({
                ...d,
                price: raw ? Number(raw) : d.price,
                currency: raw ? d.currency || 'EUR' : d.currency,
              }));
            }}
            fullWidth
            autoFocus
            sx={fieldSx}
          />
          <SearchableSelect
            label="Monedha"
            value={draft.currency === 'EUR' || draft.currency === 'LEK' ? draft.currency : 'EUR'}
            onChange={(v) => setDraft((d) => ({ ...d, currency: v === 'LEK' ? 'LEK' : 'EUR' }))}
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
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 480 }}>
        <Stack direction="row" spacing={1.25}>
          <TextField
            label="Viti"
            value={String(draft.year)}
            onChange={(e) => setDraft((d) => ({ ...d, year: Number(e.target.value) || d.year }))}
            fullWidth
            autoFocus
            sx={fieldSx}
          />
          <TextField
            label="Km"
            value={String(draft.kilometers)}
            onChange={(e) =>
              setDraft((d) => ({ ...d, kilometers: Number(e.target.value) || d.kilometers }))
            }
            fullWidth
            sx={fieldSx}
          />
        </Stack>
        <SearchableSelect
          label="Karburanti"
          value={draft.fuelType}
          onChange={(v) => setDraft((d) => ({ ...d, fuelType: v }))}
          options={FUEL_TYPE_OPTIONS}
          emptyLabel="—"
        />
        <SearchableSelect
          label="Transmisioni"
          value={draft.transmission}
          onChange={(v) => setDraft((d) => ({ ...d, transmission: v }))}
          options={TRANSMISSION_OPTIONS}
          emptyLabel="—"
        />
        <SearchableSelect
          label="Ngjyra"
          value={draft.color}
          onChange={(v) => setDraft((d) => ({ ...d, color: v }))}
          options={CAR_COLOUR_OPTIONS}
          emptyLabel="—"
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
      title={[draft.make, draft.model].filter(Boolean).join(' ')}
      status={draft.status}
      dirty={dirty}
      saving={saving}
      error={error}
      success={success}
      backHref={backHref}
      onSave={() => void onSave()}
      aiAssist={
        <OwnerEditAiAssist
          category="cars"
          currentListing={draft as unknown as Record<string, unknown>}
          onApply={(next) => {
            const merged = next as unknown as CarMineListing;
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
      <CarListingDetailView
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

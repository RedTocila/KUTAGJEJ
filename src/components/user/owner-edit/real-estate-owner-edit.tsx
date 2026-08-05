'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { RealEstateListingDetailView } from '@/components/public/real-estate-listing-detail-view';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';
import { realEstateMineToPublic } from '@/lib/listing-mine-to-public';
import { updateRealEstateListing } from '@/lib/listings-client';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { uploadListingImages } from '@/lib/uploads-client';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { paths } from '@/paths';

const MAX_IMAGES = 8;

type Snapshot = {
  title: string;
  description: string;
  price: number;
  currency: 'EUR' | 'LEK';
  surfaceM2: number;
  cityId: string | null;
  zoneId: string | null;
  cityName: string | null;
  zoneName: string | null;
  contactPhone: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
};

function snapFrom(d: RealEstateMineListing): Snapshot {
  return {
    title: d.title,
    description: d.description,
    price: d.price,
    currency: d.currency,
    surfaceM2: d.surfaceM2,
    cityId: d.cityId ?? null,
    zoneId: d.zoneId ?? null,
    cityName: d.cityName ?? null,
    zoneName: d.zoneName ?? null,
    contactPhone: d.contactPhone ?? null,
    bedrooms: d.bedrooms ?? null,
    bathrooms: d.bathrooms ?? null,
  };
}

export function RealEstateOwnerEdit({
  initial,
  backHref = paths.user.myRealEstateListings,
}: {
  initial: RealEstateMineListing;
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

  const zones = cities.find((c) => c.id === draft.cityId)?.zones ?? [];
  const dirty = JSON.stringify(draft) !== baseline || newFiles.length > 0;
  const preview = React.useMemo(() => realEstateMineToPublic(draft), [draft]);

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
          'real-estate',
        );
        if (up.error) {
          setError(up.error);
          return;
        }
        uploaded = up.urls;
      }
      const imageUrls = [...existingUrls, ...uploaded].slice(0, MAX_IMAGES);
      const cityId = draft.cityId;
      const zoneId = draft.zoneId;
      if (!cityId || !zoneId) {
        setError('Zgjidhni qytetin dhe zonën.');
        return;
      }
      const res = await updateRealEstateListing(draft.id, {
        propertyCategory: draft.propertyCategory,
        title: draft.title.trim(),
        description: draft.description.trim(),
        transactionType: draft.transactionType,
        price: draft.price,
        currency: draft.currency,
        surfaceM2: draft.surfaceM2,
        cityId,
        zoneId,
        contactPhone: draft.contactPhone ?? '',
        condition: draft.condition ?? undefined,
        apartmentTypeSlug: draft.apartmentTypeSlug ?? undefined,
        floor: draft.floor ?? undefined,
        totalFloors: draft.totalFloors ?? undefined,
        parkingFloor: draft.parkingFloor ?? undefined,
        bedrooms: draft.bedrooms ?? undefined,
        bathrooms: draft.bathrooms ?? undefined,
        furnishing: draft.furnishing ?? undefined,
        yearBuilt: draft.yearBuilt ?? undefined,
        imageUrls,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const next = { ...draft, imageUrls, cityId, zoneId };
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
            label="Çmimi"
            value={String(draft.price)}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setDraft((d) => ({ ...d, price: raw ? Number(raw) : d.price }));
            }}
            fullWidth
            autoFocus
            sx={fieldSx}
          />
          <SearchableSelect
            label="Monedha"
            value={draft.currency}
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
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 420 }}>
        <SearchableSelect
          label="Qyteti"
          value={draft.cityId ?? ''}
          onChange={(v) => {
            const city = cities.find((c) => c.id === v);
            setDraft((d) => ({
              ...d,
              cityId: v || null,
              cityName: city?.name ?? null,
              zoneId: null,
              zoneName: null,
            }));
          }}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Zgjidhni…"
          required
        />
        <SearchableSelect
          label="Zona"
          value={draft.zoneId ?? ''}
          onChange={(v) => {
            const zone = zones.find((z) => z.id === v);
            setDraft((d) => ({ ...d, zoneId: v || null, zoneName: zone?.name ?? null }));
          }}
          options={zones.map((z) => ({ value: z.id, label: z.name }))}
          emptyLabel="Zgjidhni…"
          required
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    specs: (
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 480 }}>
        <TextField
          label="Sipërfaqja (m²)"
          value={String(draft.surfaceM2)}
          onChange={(e) =>
            setDraft((d) => ({ ...d, surfaceM2: Number(e.target.value) || d.surfaceM2 }))
          }
          fullWidth
          autoFocus
          sx={fieldSx}
        />
        <Stack direction="row" spacing={1.25}>
          <TextField
            label="Dhoma"
            value={draft.bedrooms != null ? String(draft.bedrooms) : ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setDraft((d) => ({ ...d, bedrooms: raw ? Number(raw) : null }));
            }}
            fullWidth
            sx={fieldSx}
          />
          <TextField
            label="Banjo"
            value={draft.bathrooms != null ? String(draft.bathrooms) : ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setDraft((d) => ({ ...d, bathrooms: raw ? Number(raw) : null }));
            }}
            fullWidth
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
        <TextField
          label="Përshkrimi"
          value={draft.description}
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
          category="real-estate"
          currentListing={draft as unknown as Record<string, unknown>}
          onApply={(next) => {
            const merged = next as unknown as RealEstateMineListing;
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
      <RealEstateListingDetailView
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

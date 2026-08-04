'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { RealEstateListingDetailView } from '@/components/public/real-estate-listing-detail-view';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { realEstateMineToPublic } from '@/lib/listing-mine-to-public';
import { updateRealEstateListing } from '@/lib/listings-client';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { uploadListingImages } from '@/lib/uploads-client';
import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { paths } from '@/paths';

const MAX_IMAGES = 8;

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
  const [dialog, setDialog] = React.useState<'photos' | 'info' | null>(null);
  const [existingUrls, setExistingUrls] = React.useState(initial.imageUrls ?? []);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [info, setInfo] = React.useState({
    title: initial.title,
    description: initial.description,
    price: String(initial.price),
    currency: initial.currency as 'EUR' | 'LEK',
    surfaceM2: String(initial.surfaceM2),
    cityId: initial.cityId ?? '',
    zoneId: initial.zoneId ?? '',
    contactPhone: initial.contactPhone ?? '',
    bedrooms: initial.bedrooms != null ? String(initial.bedrooms) : '',
    bathrooms: initial.bathrooms != null ? String(initial.bathrooms) : '',
  });

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const zones = cities.find((c) => c.id === info.cityId)?.zones ?? [];
  const dirty = JSON.stringify(draft) !== baseline || newFiles.length > 0;
  const preview = React.useMemo(() => realEstateMineToPublic(draft), [draft]);

  const openPhotos = () => {
    setExistingUrls(draft.imageUrls ?? []);
    setNewFiles([]);
    setDialog('photos');
  };

  const openInfo = () => {
    setInfo({
      title: draft.title,
      description: draft.description,
      price: String(draft.price),
      currency: draft.currency,
      surfaceM2: String(draft.surfaceM2),
      cityId: draft.cityId ?? '',
      zoneId: draft.zoneId ?? '',
      contactPhone: draft.contactPhone ?? '',
      bedrooms: draft.bedrooms != null ? String(draft.bedrooms) : '',
      bathrooms: draft.bathrooms != null ? String(draft.bathrooms) : '',
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
          'real-estate',
        );
        if (up.error) {
          setError(up.error);
          return;
        }
        uploaded = up.urls;
      }
      const imageUrls = [...existingUrls, ...uploaded].slice(0, MAX_IMAGES);
      const cityId = draft.cityId || info.cityId;
      const zoneId = draft.zoneId || info.zoneId;
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
          onEditInfo: openInfo,
          onEditPrice: openInfo,
          onEditSpecs: openInfo,
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
        title="Të dhënat"
        onClose={() => setDialog(null)}
        onApply={() => {
          const city = cities.find((c) => c.id === info.cityId);
          const zone = city?.zones?.find((z) => z.id === info.zoneId);
          setDraft((d) => ({
            ...d,
            title: info.title.trim(),
            description: info.description.trim(),
            price: Number(info.price) || d.price,
            currency: info.currency,
            surfaceM2: Number(info.surfaceM2) || d.surfaceM2,
            cityId: info.cityId || null,
            zoneId: info.zoneId || null,
            cityName: city?.name ?? d.cityName,
            zoneName: zone?.name ?? d.zoneName,
            contactPhone: info.contactPhone.trim() || null,
            bedrooms: info.bedrooms ? Number(info.bedrooms) : null,
            bathrooms: info.bathrooms ? Number(info.bathrooms) : null,
          }));
          setDialog(null);
        }}
      >
        <TextField label="Titulli" value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} fullWidth required />
        <TextField
          label="Përshkrimi"
          value={info.description}
          onChange={(e) => setInfo({ ...info, description: e.target.value })}
          fullWidth
          multiline
          minRows={3}
          required
        />
        <Stack direction="row" spacing={1.5}>
          <TextField label="Çmimi" value={info.price} onChange={(e) => setInfo({ ...info, price: e.target.value })} fullWidth />
          <SearchableSelect
            label="Monedha"
            value={info.currency}
            onChange={(v) => setInfo({ ...info, currency: v as 'EUR' | 'LEK' })}
            options={CURRENCY_OPTIONS}
            emptyLabel="—"
            sx={{ minWidth: 120 }}
          />
        </Stack>
        <TextField
          label="Sipërfaqja (m²)"
          value={info.surfaceM2}
          onChange={(e) => setInfo({ ...info, surfaceM2: e.target.value })}
          fullWidth
        />
        <SearchableSelect
          label="Qyteti"
          value={info.cityId}
          onChange={(v) => setInfo({ ...info, cityId: v, zoneId: '' })}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Zgjidhni…"
          required
        />
        <SearchableSelect
          label="Zona"
          value={info.zoneId}
          onChange={(v) => setInfo({ ...info, zoneId: v })}
          options={zones.map((z) => ({ value: z.id, label: z.name }))}
          emptyLabel="Zgjidhni…"
          required
        />
        <Stack direction="row" spacing={1.5}>
          <TextField label="Dhoma" value={info.bedrooms} onChange={(e) => setInfo({ ...info, bedrooms: e.target.value })} fullWidth />
          <TextField label="Banjo" value={info.bathrooms} onChange={(e) => setInfo({ ...info, bathrooms: e.target.value })} fullWidth />
        </Stack>
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

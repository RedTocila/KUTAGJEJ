'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { CarListingDetailView } from '@/components/public/car-listing-detail-view';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
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
  const [dialog, setDialog] = React.useState<'photos' | 'info' | null>(null);
  const [existingUrls, setExistingUrls] = React.useState(initial.imageUrls ?? []);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [info, setInfo] = React.useState({
    make: initial.make,
    model: initial.model,
    variant: initial.variant,
    description: initial.description ?? '',
    year: String(initial.year),
    kilometers: String(initial.kilometers),
    transmission: initial.transmission,
    fuelType: initial.fuelType,
    price: String(initial.price),
    currency: initial.currency === 'LEK' ? 'LEK' : 'EUR',
    color: initial.color,
    cityId: initial.cityId ?? '',
    contactPhone: initial.contactPhone ?? '',
  });

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const dirty = JSON.stringify(draft) !== baseline || newFiles.length > 0;
  const preview = React.useMemo(() => carMineToPublic(draft), [draft]);

  const openPhotos = () => {
    setExistingUrls(draft.imageUrls ?? []);
    setNewFiles([]);
    setDialog('photos');
  };

  const openInfo = () => {
    setInfo({
      make: draft.make,
      model: draft.model,
      variant: draft.variant,
      description: draft.description ?? '',
      year: String(draft.year),
      kilometers: String(draft.kilometers),
      transmission: draft.transmission,
      fuelType: draft.fuelType,
      price: String(draft.price),
      currency: draft.currency === 'LEK' ? 'LEK' : 'EUR',
      color: draft.color,
      cityId: draft.cityId ?? '',
      contactPhone: draft.contactPhone ?? '',
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
          'cars',
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
      setSuccess('Njoftimi u përditësua.');
    } finally {
      setSaving(false);
    }
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
        title="Të dhënat e makinës"
        onClose={() => setDialog(null)}
        onApply={() => {
          const cityName = cities.find((c) => c.id === info.cityId)?.name ?? draft.cityName;
          setDraft((d) => ({
            ...d,
            make: info.make.trim(),
            model: info.model.trim(),
            variant: info.variant.trim(),
            description: info.description.trim(),
            year: Number(info.year) || d.year,
            kilometers: Number(info.kilometers) || d.kilometers,
            transmission: info.transmission,
            fuelType: info.fuelType,
            price: Number(info.price) || d.price,
            currency: info.currency,
            color: info.color,
            cityId: info.cityId || null,
            cityName,
            contactPhone: info.contactPhone.trim() || null,
          }));
          setDialog(null);
        }}
      >
        <Stack direction="row" spacing={1.5}>
          <TextField label="Marka" value={info.make} onChange={(e) => setInfo({ ...info, make: e.target.value })} fullWidth required />
          <TextField label="Modeli" value={info.model} onChange={(e) => setInfo({ ...info, model: e.target.value })} fullWidth required />
        </Stack>
        <TextField label="Varianti" value={info.variant} onChange={(e) => setInfo({ ...info, variant: e.target.value })} fullWidth />
        <TextField
          label="Përshkrimi"
          value={info.description}
          onChange={(e) => setInfo({ ...info, description: e.target.value })}
          fullWidth
          multiline
          minRows={3}
        />
        <Stack direction="row" spacing={1.5}>
          <TextField label="Viti" value={info.year} onChange={(e) => setInfo({ ...info, year: e.target.value })} fullWidth />
          <TextField label="Km" value={info.kilometers} onChange={(e) => setInfo({ ...info, kilometers: e.target.value })} fullWidth />
        </Stack>
        <SearchableSelect
          label="Karburanti"
          value={info.fuelType}
          onChange={(v) => setInfo({ ...info, fuelType: v })}
          options={FUEL_TYPE_OPTIONS}
          emptyLabel="—"
        />
        <SearchableSelect
          label="Transmisioni"
          value={info.transmission}
          onChange={(v) => setInfo({ ...info, transmission: v })}
          options={TRANSMISSION_OPTIONS}
          emptyLabel="—"
        />
        <SearchableSelect
          label="Ngjyra"
          value={info.color}
          onChange={(v) => setInfo({ ...info, color: v })}
          options={CAR_COLOUR_OPTIONS}
          emptyLabel="—"
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
        <SearchableSelect
          label="Qyteti"
          value={info.cityId}
          onChange={(v) => setInfo({ ...info, cityId: v })}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          emptyLabel="Zgjidhni…"
          required
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

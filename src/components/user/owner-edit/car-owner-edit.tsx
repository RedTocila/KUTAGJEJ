'use client';

import * as React from 'react';
import { Box, Checkbox, FormControlLabel, FormGroup, Stack, TextField, Typography } from '@mui/material';
import { GearSix as GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { SteeringWheel as SteeringWheelIcon } from '@phosphor-icons/react/dist/ssr/SteeringWheel';

import { paths } from '@/paths';
import {
  CAR_COLOUR_OPTIONS,
  CAR_EXTRAS,
  CAR_FINISH_OPTIONS,
  FUEL_TYPE_OPTIONS,
  makesForVehicleType,
  modelsForMake,
  type VehicleType,
} from '@/lib/car-constants';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { isPersistableImageUrl } from '@/lib/image-url';
import { carMineToPublic } from '@/lib/listing-mine-to-public';
import { updateCarListing, type CarMineListing } from '@/lib/listings-client';
import { commitListingPhotos } from '@/lib/owner-edit-photos';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { VehicleTypePicker } from '@/components/cars/vehicle-type-picker';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { SearchableSelect } from '@/components/core/searchable-select';
import {
  exclusiveLocationPayload,
  inferListingLocationMode,
  ListingLocationChoice,
  type ListingLocationMode,
} from '@/components/listings/listing-location-choice';
import { CarListingDetailView } from '@/components/public/car-listing-detail-view';
import { ListingDescriptionField, ListingToggle } from '@/components/user/listing-form-ui';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import { OwnerEditContactPhone } from '@/components/user/owner-edit-contact-phone';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';

const MAX_IMAGES = 8;

const TRANSMISSION_TOGGLE = [
  { value: 'automatic', label: 'Automatik', Icon: GearSixIcon },
  { value: 'manual', label: 'Manual', Icon: SteeringWheelIcon },
] as const;

const CURRENCY_TOGGLE = CURRENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

type Snapshot = {
  vehicleType: string;
  make: string;
  model: string;
  variant: string;
  description: string;
  year: number | null;
  kilometers: number | null;
  transmission: string;
  fuelType: string;
  price: number;
  originalPrice: number | null;
  currency: string;
  color: string;
  finish: string[];
  extras: string[];
  cityId: string | null;
  cityName: string | null;
  mapsUrl: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  contactPhone: string | null;
};

function snapFrom(d: CarMineListing): Snapshot {
  return {
    vehicleType: d.vehicleType || 'car',
    make: d.make,
    model: d.model,
    variant: d.variant,
    description: d.description ?? '',
    year: d.year,
    kilometers: d.kilometers,
    transmission: d.transmission,
    fuelType: d.fuelType,
    price: d.price,
    originalPrice: d.originalPrice ?? null,
    currency: d.currency,
    color: d.color,
    finish: d.finish ?? [],
    extras: d.extras ?? [],
    cityId: d.cityId ?? null,
    cityName: d.cityName ?? null,
    mapsUrl: d.mapsUrl ?? null,
    locationAddress: d.locationAddress ?? null,
    locationLat: d.locationLat ?? null,
    locationLng: d.locationLng ?? null,
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
  const [locationMode, setLocationMode] = React.useState<ListingLocationMode | ''>(() =>
    inferListingLocationMode(initial.cityId, initial.mapsUrl)
  );

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
        const up = await uploadListingImages(newFiles.slice(0, Math.max(0, MAX_IMAGES - kept.length)), 'cars');
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
      const res = await updateCarListing(draft.id, {
        vehicleType: draft.vehicleType || 'car',
        make: draft.make,
        model: draft.model,
        variant: draft.variant,
        description: draft.description ?? '',
        year: draft.year,
        kilometers: draft.kilometers,
        transmission: draft.transmission,
        fuelType: draft.fuelType,
        price: draft.price,
        originalPrice: draft.originalPrice ?? null,
        currency: draft.currency,
        color: draft.color,
        finish: draft.finish ?? [],
        extras: draft.extras ?? [],
        cityId: loc.cityId,
        mapsUrl: loc.mapsUrl,
        contactPhone: draft.contactPhone ?? '',
        imageUrls,
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

  const vehicleType = (draft.vehicleType || 'car') as VehicleType;
  const makeOptions = makesForVehicleType(vehicleType);
  const modelOptions = modelsForMake(vehicleType, draft.make);

  const fieldSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)' },
  } as const;

  const inlineEditors: Partial<Record<OwnerInlineField, React.ReactNode>> = {
    title: (
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 560 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'primary.main',
            bgcolor: primaryMainAlpha(0.06),
            boxShadow: `inset 0 0 0 1px ${primaryMainAlpha(0.12)}`,
          }}
        >
          <VehicleTypePicker
            value={vehicleType}
            label="Kategoria"
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                vehicleType: v || 'car',
                make: '',
                model: '',
              }))
            }
          />
        </Box>
        <Stack direction="row" spacing={1.25}>
          <SearchableSelect
            label="Marka"
            value={draft.make}
            onChange={(v) => setDraft((d) => ({ ...d, make: v, model: '' }))}
            options={makeOptions.map((m) => ({ value: m, label: m }))}
            emptyLabel="Zgjidhni…"
            allowCustom
          />
          <SearchableSelect
            label="Modeli"
            value={draft.model}
            onChange={(v) => setDraft((d) => ({ ...d, model: v }))}
            options={modelOptions.map((m) => ({ value: m, label: m }))}
            emptyLabel={draft.make ? 'Zgjidhni…' : 'Zgjidhni markën…'}
            allowCustom
            disabled={!draft.make}
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
          <TextField
            label="Çmimi i mëparshëm"
            value={draft.originalPrice != null ? String(draft.originalPrice) : ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setDraft((d) => ({ ...d, originalPrice: raw ? Number(raw) : null }));
            }}
            fullWidth
            sx={fieldSx}
          />
        </Stack>
        <ListingToggle
          label="Monedha"
          value={draft.currency === 'EUR' || draft.currency === 'LEK' ? draft.currency : 'EUR'}
          onChange={(v) => setDraft((d) => ({ ...d, currency: v === 'LEK' ? 'LEK' : 'EUR' }))}
          options={CURRENCY_TOGGLE}
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
    location: (
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 420 }}>
        <ListingLocationChoice
          mode={locationMode}
          onModeChange={setLocationMode}
          cityId={draft.cityId ?? ''}
          onCityIdChange={(v) => {
            const cityName = cities.find((c) => c.id === v)?.name ?? null;
            setDraft((d) => ({ ...d, cityId: v || null, cityName }));
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
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    specs: (
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 480 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2.5,
            border: '1px solid',
            borderColor: 'primary.main',
            bgcolor: primaryMainAlpha(0.06),
            boxShadow: `inset 0 0 0 1px ${primaryMainAlpha(0.12)}`,
          }}
        >
          <VehicleTypePicker
            value={vehicleType}
            label="Kategoria"
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                vehicleType: v || 'car',
                make: '',
                model: '',
              }))
            }
          />
        </Box>
        <Stack direction="row" spacing={1.25}>
          <SearchableSelect
            label="Marka"
            value={draft.make}
            onChange={(v) => setDraft((d) => ({ ...d, make: v, model: '' }))}
            options={makeOptions.map((m) => ({ value: m, label: m }))}
            emptyLabel="Zgjidhni…"
            allowCustom
          />
          <SearchableSelect
            label="Modeli"
            value={draft.model}
            onChange={(v) => setDraft((d) => ({ ...d, model: v }))}
            options={modelOptions.map((m) => ({ value: m, label: m }))}
            emptyLabel={draft.make ? 'Zgjidhni…' : 'Zgjidhni markën…'}
            allowCustom
            disabled={!draft.make}
          />
        </Stack>
        <TextField
          label="Varianti"
          value={draft.variant}
          onChange={(e) => setDraft((d) => ({ ...d, variant: e.target.value }))}
          fullWidth
          sx={fieldSx}
        />
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
            onChange={(e) => setDraft((d) => ({ ...d, kilometers: Number(e.target.value) || d.kilometers }))}
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
        <ListingToggle
          label="Transmisioni"
          value={draft.transmission}
          onChange={(v) => setDraft((d) => ({ ...d, transmission: v }))}
          options={TRANSMISSION_TOGGLE}
        />
        <SearchableSelect
          label="Ngjyra"
          value={draft.color}
          onChange={(v) => setDraft((d) => ({ ...d, color: v }))}
          options={CAR_COLOUR_OPTIONS}
          emptyLabel="—"
        />
        <Stack spacing={0.5}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Finish</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {CAR_FINISH_OPTIONS.map((opt) => (
              <FormControlLabel
                key={opt.value}
                control={
                  <Checkbox
                    checked={(draft.finish ?? []).includes(opt.value)}
                    onChange={(e) => {
                      setDraft((d) => {
                        const current = d.finish ?? [];
                        const finish = e.target.checked
                          ? [...current.filter((f) => f !== opt.value), opt.value]
                          : current.filter((f) => f !== opt.value);
                        return { ...d, finish };
                      });
                    }}
                  />
                }
                label={opt.label}
              />
            ))}
          </Stack>
        </Stack>
        <Stack spacing={0.5}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
            Ekstra{(draft.extras ?? []).length ? ` (${(draft.extras ?? []).length})` : ''}
          </Typography>
          <FormGroup
            sx={{
              maxHeight: 220,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              px: 1,
              py: 0.5,
            }}
          >
            {CAR_EXTRAS.map((extra) => (
              <FormControlLabel
                key={extra}
                control={
                  <Checkbox
                    size="small"
                    checked={(draft.extras ?? []).includes(extra)}
                    onChange={(e) => {
                      setDraft((d) => {
                        const current = d.extras ?? [];
                        const extras = e.target.checked ? [...current, extra] : current.filter((x) => x !== extra);
                        return { ...d, extras };
                      });
                    }}
                  />
                }
                label={extra}
              />
            ))}
          </FormGroup>
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
            setExistingUrls(Array.isArray(merged.imageUrls) ? merged.imageUrls : (draft.imageUrls ?? []));
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
        reorderable
        onClose={() => setPhotosOpen(false)}
        onApply={async () => {
          const res = await commitListingPhotos({
            existingUrls,
            newFiles,
            folder: 'cars',
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

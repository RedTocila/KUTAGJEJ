'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';
import { HouseLine as HouseLineIcon } from '@phosphor-icons/react/dist/ssr/HouseLine';
import { Key as KeyIcon } from '@phosphor-icons/react/dist/ssr/Key';

import type { RealEstateMineListing } from '@/types/real-estate-mine-listing';
import { paths } from '@/paths';
import { isPersistableImageUrl } from '@/lib/image-url';
import { realEstateMineToPublic } from '@/lib/listing-mine-to-public';
import { updateRealEstateListing } from '@/lib/listings-client';
import { commitListingPhotos } from '@/lib/owner-edit-photos';
import {
  CONDITION_OPTIONS,
  CURRENCY_OPTIONS,
  FURNISHING_OPTIONS,
  needsBedroomsBathFurnishing,
  needsCondition,
  needsFloor,
  needsParkingFloor,
  needsTotalFloors,
  needsYearBuilt,
  REAL_ESTATE_PROPERTY_CATEGORIES,
  TRANSACTION_OPTIONS,
  type RealEstatePropertySlug,
} from '@/lib/real-estate-constants';
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
import { RealEstateListingDetailView } from '@/components/public/real-estate-listing-detail-view';
import { ListingDescriptionField, ListingToggle } from '@/components/user/listing-form-ui';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import { OwnerEditContactPhone } from '@/components/user/owner-edit-contact-phone';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';

const MAX_IMAGES = 8;

const PROPERTY_OPTIONS = REAL_ESTATE_PROPERTY_CATEGORIES.map((c) => ({
  value: c.slug,
  label: c.label,
}));

const TRANSACTION_TOGGLE = TRANSACTION_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
  Icon: o.value === 'rent' ? KeyIcon : HouseLineIcon,
}));

type Snapshot = {
  title: string;
  description: string;
  propertyCategory: string;
  transactionType: 'rent' | 'sale' | string | null;
  price: number;
  originalPrice: number | null;
  currency: 'EUR' | 'LEK';
  surfaceM2: number | null;
  cityId: string | null;
  zoneId: string | null;
  cityName: string | null;
  zoneName: string | null;
  mapsUrl: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  contactPhone: string | null;
  condition: string | null;
  floor: number | null;
  totalFloors: number | null;
  parkingFloor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnishing: string | null;
  yearBuilt: number | null;
};

function snapFrom(d: RealEstateMineListing): Snapshot {
  return {
    title: d.title,
    description: d.description ?? '',
    propertyCategory: d.propertyCategory,
    transactionType: d.transactionType,
    price: d.price,
    originalPrice: d.originalPrice ?? null,
    currency: d.currency,
    surfaceM2: d.surfaceM2,
    cityId: d.cityId ?? null,
    zoneId: d.zoneId ?? null,
    cityName: d.cityName ?? null,
    zoneName: d.zoneName ?? null,
    mapsUrl: d.mapsUrl ?? null,
    locationAddress: d.locationAddress ?? null,
    locationLat: d.locationLat ?? null,
    locationLng: d.locationLng ?? null,
    contactPhone: d.contactPhone ?? null,
    condition: d.condition ?? null,
    floor: d.floor ?? null,
    totalFloors: d.totalFloors ?? null,
    parkingFloor: d.parkingFloor ?? null,
    bedrooms: d.bedrooms ?? null,
    bathrooms: d.bathrooms ?? null,
    furnishing: d.furnishing ?? null,
    yearBuilt: d.yearBuilt ?? null,
  };
}

function numOrNull(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
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
  const [locationMode, setLocationMode] = React.useState<ListingLocationMode | ''>(() =>
    inferListingLocationMode(initial.cityId, initial.mapsUrl)
  );

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const zones = cities.find((c) => c.id === draft.cityId)?.zones ?? [];
  const dirty = JSON.stringify(draft) !== baseline || newFiles.length > 0;
  const preview = React.useMemo(() => realEstateMineToPublic(draft), [draft]);
  const cat = (draft.propertyCategory || '') as RealEstatePropertySlug | '';

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
        const up = await uploadListingImages(newFiles.slice(0, Math.max(0, MAX_IMAGES - kept.length)), 'real-estate');
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
      if (!draft.title.trim()) {
        setError('Titulli është i detyrueshëm.');
        return;
      }
      if (draft.price == null || !Number.isFinite(Number(draft.price)) || Number(draft.price) < 0) {
        setError('Vendosni një çmim të vlefshëm.');
        return;
      }
      const phone = String(draft.contactPhone ?? '').trim();
      if (phone.length < 6) {
        setError('Vendosni një numër telefoni të vlefshëm.');
        return;
      }
      const loc = exclusiveLocationPayload(locationMode, draft);
      const res = await updateRealEstateListing(draft.id, {
        propertyCategory: draft.propertyCategory || undefined,
        title: draft.title.trim(),
        description: (draft.description ?? '').trim(),
        transactionType:
          draft.transactionType === 'rent' || draft.transactionType === 'sale' ? draft.transactionType : null,
        price: draft.price,
        originalPrice: draft.originalPrice ?? null,
        currency: draft.currency || 'EUR',
        surfaceM2: draft.surfaceM2,
        cityId: loc.cityId,
        zoneId: loc.zoneId,
        mapsUrl: loc.mapsUrl,
        contactPhone: phone,
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
      const next = { ...draft, imageUrls, cityId: loc.cityId, zoneId: loc.zoneId, mapsUrl: loc.mapsUrl };
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
        <ListingToggle
          label="Qera / shitje"
          value={draft.transactionType ?? ''}
          onChange={(v) =>
            setDraft((d) => ({
              ...d,
              transactionType: v === 'rent' || v === 'sale' ? v : d.transactionType,
            }))
          }
          options={TRANSACTION_TOGGLE}
        />
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
          <TextField
            label="Çmimi i mëparshëm"
            value={draft.originalPrice != null ? String(draft.originalPrice) : ''}
            onChange={(e) => setDraft((d) => ({ ...d, originalPrice: numOrNull(e.target.value) }))}
            fullWidth
            sx={fieldSx}
          />
        </Stack>
        <ListingToggle
          label="Monedha"
          value={draft.currency}
          onChange={(v) => setDraft((d) => ({ ...d, currency: v === 'LEK' ? 'LEK' : 'EUR' }))}
          options={CURRENCY_OPTIONS}
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    location: (
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 420 }}>
        <ListingLocationChoice
          mode={locationMode}
          onModeChange={setLocationMode}
          cityId={draft.cityId ?? ''}
          onCityIdChange={(v) => {
            const city = cities.find((c) => c.id === v);
            setDraft((d) => ({
              ...d,
              cityId: v || null,
              cityName: city?.name ?? null,
              zoneId: null,
              zoneName: null,
            }));
          }}
          zoneId={draft.zoneId ?? ''}
          onZoneIdChange={(v) => {
            const zone = zones.find((z) => z.id === v);
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
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 480 }}>
        <SearchableSelect
          label="Lloji i pronës"
          value={draft.propertyCategory}
          onChange={(v) => setDraft((d) => ({ ...d, propertyCategory: v }))}
          options={PROPERTY_OPTIONS}
          emptyLabel="Zgjidhni…"
          clearable
        />
        <TextField
          label="Sipërfaqja (m²)"
          value={draft.surfaceM2 != null ? String(draft.surfaceM2) : ''}
          onChange={(e) => setDraft((d) => ({ ...d, surfaceM2: numOrNull(e.target.value) }))}
          fullWidth
          autoFocus
          sx={fieldSx}
        />
        {needsCondition(cat) ? (
          <SearchableSelect
            label="Gjendja"
            value={draft.condition ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, condition: v || null }))}
            options={CONDITION_OPTIONS}
            emptyLabel="—"
            clearable
          />
        ) : null}
        {needsFloor(cat) ? (
          <TextField
            label="Kati"
            value={draft.floor != null ? String(draft.floor) : ''}
            onChange={(e) => setDraft((d) => ({ ...d, floor: numOrNull(e.target.value) }))}
            fullWidth
            sx={fieldSx}
          />
        ) : null}
        {needsTotalFloors(cat) ? (
          <TextField
            label="Numri i kateve"
            value={draft.totalFloors != null ? String(draft.totalFloors) : ''}
            onChange={(e) => setDraft((d) => ({ ...d, totalFloors: numOrNull(e.target.value) }))}
            fullWidth
            sx={fieldSx}
          />
        ) : null}
        {needsParkingFloor(cat) ? (
          <TextField
            label="Niveli i parkimit"
            value={draft.parkingFloor != null ? String(draft.parkingFloor) : ''}
            onChange={(e) => setDraft((d) => ({ ...d, parkingFloor: numOrNull(e.target.value) }))}
            fullWidth
            sx={fieldSx}
          />
        ) : null}
        {needsBedroomsBathFurnishing(cat) ? (
          <>
            <Stack direction="row" spacing={1.25}>
              <TextField
                label="Dhoma"
                value={draft.bedrooms != null ? String(draft.bedrooms) : ''}
                onChange={(e) => setDraft((d) => ({ ...d, bedrooms: numOrNull(e.target.value) }))}
                fullWidth
                sx={fieldSx}
              />
              <TextField
                label="Banjo"
                value={draft.bathrooms != null ? String(draft.bathrooms) : ''}
                onChange={(e) => setDraft((d) => ({ ...d, bathrooms: numOrNull(e.target.value) }))}
                fullWidth
                sx={fieldSx}
              />
            </Stack>
            <SearchableSelect
              label="Mobilimi"
              value={draft.furnishing ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, furnishing: v || null }))}
              options={FURNISHING_OPTIONS}
              emptyLabel="—"
              clearable
            />
          </>
        ) : null}
        {needsYearBuilt(cat) ? (
          <TextField
            label="Viti i ndërtimit"
            value={draft.yearBuilt != null ? String(draft.yearBuilt) : ''}
            onChange={(e) => setDraft((d) => ({ ...d, yearBuilt: numOrNull(e.target.value) }))}
            fullWidth
            sx={fieldSx}
          />
        ) : null}
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
            setExistingUrls(Array.isArray(merged.imageUrls) ? merged.imageUrls : (draft.imageUrls ?? []));
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
        reorderable
        onClose={() => setPhotosOpen(false)}
        onApply={async () => {
          const res = await commitListingPhotos({
            existingUrls,
            newFiles,
            folder: 'real-estate',
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

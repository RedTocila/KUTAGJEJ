'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';

import { paths } from '@/paths';
import { isPersistableImageUrl } from '@/lib/image-url';
import { marketplaceMineToPublic } from '@/lib/listing-mine-to-public';
import { updateMarketplaceListing, type MarketplaceMineListing } from '@/lib/listings-client';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
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
import { VerticalListingDetailView } from '@/components/public/vertical-listing-detail-view';
import { ListingDescriptionField, ListingToggle } from '@/components/user/listing-form-ui';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import { OwnerEditContactPhone } from '@/components/user/owner-edit-contact-phone';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';

const MAX_IMAGES = 8;

type Snapshot = {
  title: string;
  description: string;
  category: string;
  condition: string | null;
  price: number | null;
  originalPrice: number | null;
  currency: 'EUR' | 'LEK' | null;
  cityId: string | null;
  cityName: string | null;
  mapsUrl: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  contactPhone: string | null;
};

function snapFrom(d: MarketplaceMineListing): Snapshot {
  return {
    title: d.title,
    description: d.description ?? '',
    category: d.category,
    condition: d.condition ?? null,
    price: d.price,
    originalPrice: d.originalPrice ?? null,
    currency: d.currency === 'EUR' || d.currency === 'LEK' ? d.currency : null,
    cityId: d.cityId ?? null,
    cityName: d.cityName ?? null,
    mapsUrl: d.mapsUrl ?? null,
    locationAddress: d.locationAddress ?? null,
    locationLat: d.locationLat ?? null,
    locationLng: d.locationLng ?? null,
    contactPhone: d.contactPhone ?? null,
  };
}

export function MarketplaceOwnerEdit({
  initial,
  backHref = paths.user.myRealEstateListings,
}: {
  initial: MarketplaceMineListing;
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
  const preview = React.useMemo(() => marketplaceMineToPublic(draft), [draft]);

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
        const up = await uploadListingImages(newFiles.slice(0, Math.max(0, MAX_IMAGES - kept.length)), 'marketplace');
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
      const res = await updateMarketplaceListing(draft.id, {
        transactionType: 'shes',
        title: draft.title.trim(),
        description: draft.description ?? '',
        category: draft.category,
        condition: draft.condition,
        price: draft.price,
        originalPrice: draft.originalPrice ?? null,
        currency: draft.currency,
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
        <Stack direction="row" spacing={1.25}>
          <TextField
            label="Çmimi"
            value={draft.price != null ? String(draft.price) : ''}
            onChange={(e) => {
              const raw = e.target.value.trim();
              setDraft((d) => ({
                ...d,
                price: raw ? Number(raw) : null,
                currency: raw ? d.currency || 'EUR' : null,
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
          value={draft.currency === 'EUR' || draft.currency === 'LEK' ? draft.currency : ''}
          onChange={(v) => setDraft((d) => ({ ...d, currency: v === 'EUR' || v === 'LEK' ? v : null }))}
          options={CURRENCY_OPTIONS}
          disabled={draft.price == null}
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
        <SearchableSelect
          label="Kategoria"
          value={draft.category}
          onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
          options={MARKETPLACE_CATEGORY_OPTIONS}
          emptyLabel="Zgjidhni…"
          allowCustom
        />
        <SearchableSelect
          label="Gjendja"
          value={draft.condition ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, condition: v || null }))}
          options={MARKETPLACE_CONDITION_OPTIONS}
          emptyLabel="—"
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
          category="marketplace"
          currentListing={draft as unknown as Record<string, unknown>}
          onApply={(next) => {
            const merged = next as unknown as MarketplaceMineListing;
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
      <VerticalListingDetailView
        listing={preview}
        canonicalUrl=""
        browseHref={paths.public.marketplace}
        similarSectionTitle="Të ngjashme"
        similar={[]}
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
            folder: 'marketplace',
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

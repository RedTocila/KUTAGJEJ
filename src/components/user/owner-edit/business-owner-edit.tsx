'use client';

import * as React from 'react';
import { Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { BusinessMobileCtaInlineEditor } from '@/components/businesses/business-mobile-cta-inline-editor';
import { BusinessListingDetailView } from '@/components/public/business-listing-detail-view';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';
import {
  BUSINESS_CATEGORY_OPTIONS,
  BUSINESS_DAY_LABELS,
  defaultWeeklyHours,
  type WeeklyHourRow,
} from '@/lib/business-constants';
import {
  updateBusinessListing,
  resolveBusinessMapsUrl,
  type BusinessMineListing,
} from '@/lib/directory-listings-client';
import { hardNavigate } from '@/lib/hard-navigate';
import { extractCoordsFromMapsUrl, extractPlaceQueryFromMapsUrl } from '@/lib/google-maps-location';
import { businessMineToPublic } from '@/lib/listing-mine-to-public';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { isPersistableImageUrl } from '@/lib/image-url';
import { commitListingPhotos } from '@/lib/owner-edit-photos';
import { uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';
import type { BusinessMobileCtaMode } from '@/lib/business-mobile-cta';

const MAX_IMAGES = 8;

type Snapshot = {
  title: string;
  description: string;
  category: string;
  cityId: string | null;
  cityName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  mapsUrl: string | null;
  mapsPlaceQuery: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  contactPhone: string | null;
  servicesHighlight: string | null;
  reservationsEnabled: boolean;
  reservationUrl: string | null;
  mobileCtaMode?: BusinessMobileCtaMode;
};

function snapFrom(d: BusinessMineListing): Snapshot {
  return {
    title: d.title,
    description: d.description ?? '',
    category: d.category,
    cityId: d.cityId ?? null,
    cityName: d.cityName ?? null,
    zoneId: d.zoneId ?? null,
    zoneName: d.zoneName ?? null,
    mapsUrl: d.mapsUrl ?? null,
    mapsPlaceQuery:
      d.mapsPlaceQuery ?? (d.mapsUrl ? extractPlaceQueryFromMapsUrl(d.mapsUrl) : null),
    locationAddress: d.locationAddress ?? null,
    locationLat: d.locationLat ?? null,
    locationLng: d.locationLng ?? null,
    contactPhone: d.contactPhone ?? null,
    servicesHighlight: d.servicesHighlight ?? null,
    reservationsEnabled: Boolean(d.reservationsEnabled),
    reservationUrl: d.reservationUrl ?? null,
    mobileCtaMode: d.mobileCtaMode ?? 'contact',
  };
}

function withMapsPreview(mapsUrl: string | null | undefined): {
  mapsUrl: string | null;
  mapsPlaceQuery: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
} {
  const trimmed = String(mapsUrl || '').trim() || null;
  if (!trimmed) {
    return {
      mapsUrl: null,
      mapsPlaceQuery: null,
      locationAddress: null,
      locationLat: null,
      locationLng: null,
    };
  }
  const coords = extractCoordsFromMapsUrl(trimmed);
  return {
    mapsUrl: trimmed,
    mapsPlaceQuery: extractPlaceQueryFromMapsUrl(trimmed),
    // Street comes from server reverse-geocode on Gati / Ruaj.
    locationAddress: null,
    locationLat: coords?.lat ?? null,
    locationLng: coords?.lng ?? null,
  };
}

export function BusinessOwnerEdit({
  initial,
  backHref = paths.user.myRealEstateListings,
}: {
  initial: BusinessMineListing;
  backHref?: string;
}) {
  const [draft, setDraft] = React.useState(() => {
    const mapsPlaceQuery =
      initial.mapsPlaceQuery ??
      (initial.mapsUrl ? extractPlaceQueryFromMapsUrl(initial.mapsUrl) : null);
    return { ...initial, mapsPlaceQuery };
  });
  const [baseline, setBaseline] = React.useState(() =>
    JSON.stringify({
      ...initial,
      mapsPlaceQuery:
        initial.mapsPlaceQuery ??
        (initial.mapsUrl ? extractPlaceQueryFromMapsUrl(initial.mapsUrl) : null),
    }),
  );
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<'photos' | 'hours' | null>(null);
  const [existingUrls, setExistingUrls] = React.useState(initial.imageUrls ?? []);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [editingField, setEditingField] = React.useState<OwnerInlineField | null>(null);
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null);
  const [weeklyHours, setWeeklyHours] = React.useState<WeeklyHourRow[]>(
    initial.weeklyHours?.length ? initial.weeklyHours : defaultWeeklyHours(),
  );

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const dirty = JSON.stringify(draft) !== baseline || newFiles.length > 0;
  const preview = React.useMemo(() => businessMineToPublic(draft), [draft]);
  const zones = React.useMemo(
    () => cities.find((c) => c.id === draft.cityId)?.zones ?? [],
    [cities, draft.cityId],
  );

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

  const doneLocationInline = async () => {
    const raw = String(draft.mapsUrl || '').trim();
    if (!raw) {
      setDraft((d) => ({
        ...d,
        mapsUrl: null,
        mapsPlaceQuery: null,
        locationAddress: null,
        locationLat: null,
        locationLng: null,
      }));
      doneInline();
      return;
    }
    // Always resolve on server so short links expand and street name is reverse-geocoded.
    const resolved = await resolveBusinessMapsUrl(raw);
    if (resolved.error) {
      setError(resolved.error);
      return;
    }
    const resolvedUrl = resolved.mapsUrl ?? raw;
    const local = withMapsPreview(resolvedUrl);
    setDraft((d) => ({
      ...d,
      mapsUrl: resolvedUrl,
      mapsPlaceQuery:
        resolved.placeQuery ?? local.mapsPlaceQuery ?? null,
      locationAddress: resolved.locationAddress ?? null,
      locationLat: resolved.locationLat ?? local.locationLat ?? null,
      locationLng: resolved.locationLng ?? local.locationLng ?? null,
    }));
    doneInline();
  };

  const openPhotos = () => {
    setExistingUrls((draft.imageUrls ?? []).filter(isPersistableImageUrl));
    setNewFiles([]);
    setDialog('photos');
  };

  const openHours = () => {
    setWeeklyHours(draft.weeklyHours?.length ? draft.weeklyHours : defaultWeeklyHours());
    setDialog('hours');
  };

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      let uploaded: string[] = [];
      const kept = existingUrls.filter(isPersistableImageUrl);
      if (newFiles.length) {
        const slots = Math.max(0, MAX_IMAGES - kept.length);
        const up = await uploadListingImages(newFiles.slice(0, slots), 'businesses');
        if (up.error) {
          setError(up.error);
          return;
        }
        uploaded = up.urls;
      }
      const imageUrls = [...kept, ...uploaded].slice(0, MAX_IMAGES);
      if (!draft.cityId) {
        setError('Zgjidhni qytetin.');
        return;
      }
      const payload = {
        title: draft.title.trim(),
        description: (draft.description ?? '').trim(),
        category: draft.category,
        cityId: draft.cityId,
        zoneId: draft.zoneId ?? null,
        mapsUrl: draft.mapsUrl ?? null,
        contactPhone: draft.contactPhone ?? '',
        imageUrls,
        weeklyHours: draft.weeklyHours?.length ? draft.weeklyHours : weeklyHours,
        reservationsEnabled: (draft.mobileCtaMode ?? 'contact') === 'reserve' ? true : Boolean(draft.reservationsEnabled),
        mobileCtaMode: draft.mobileCtaMode ?? 'contact',
        reservationUrl: null,
        reservationTimeSlots: [],
        reservationPartySizes: [],
        servicesHighlight: draft.servicesHighlight,
      };
      const res = await updateBusinessListing(draft.id, payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      const saved = res.listing;
      const mapsPreview = withMapsPreview(saved?.mapsUrl ?? payload.mapsUrl);
      const next = {
        ...draft,
        imageUrls,
        cityId: saved?.cityId ?? payload.cityId ?? null,
        zoneId: saved?.zoneId ?? payload.zoneId ?? null,
        mapsUrl: saved?.mapsUrl ?? mapsPreview.mapsUrl,
        mapsPlaceQuery: mapsPreview.mapsPlaceQuery ?? draft.mapsPlaceQuery ?? null,
        locationAddress:
          typeof saved?.locationAddress === 'string' && saved.locationAddress.trim()
            ? saved.locationAddress.trim()
            : draft.locationAddress ?? null,
        locationLat:
          typeof saved?.locationLat === 'number' && Number.isFinite(saved.locationLat)
            ? saved.locationLat
            : mapsPreview.locationLat,
        locationLng:
          typeof saved?.locationLng === 'number' && Number.isFinite(saved.locationLng)
            ? saved.locationLng
            : mapsPreview.locationLng,
      };
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setExistingUrls(imageUrls);
      setNewFiles([]);
      setEditingField(null);
      setSuccess('Biznesi u përditësua.');
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
          label="Emri"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          fullWidth
          autoFocus
          sx={fieldSx}
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    category: (
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 480 }}>
        <SearchableSelect
          label="Kategoria"
          value={draft.category}
          onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
          options={BUSINESS_CATEGORY_OPTIONS}
          emptyLabel="Zgjidhni…"
          required
          allowCustom
        />
        <TextField
          label="Çfarë ofroni"
          value={draft.servicesHighlight ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, servicesHighlight: e.target.value || null }))}
          fullWidth
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
    mobileCta: (
      <BusinessMobileCtaInlineEditor
        compact
        mobileCtaMode={draft.mobileCtaMode ?? 'contact'}
        reservationsEnabled={Boolean(draft.reservationsEnabled)}
        onMobileCtaModeChange={(mode) => setDraft((d) => ({ ...d, mobileCtaMode: mode }))}
        onReservationsEnabledChange={(enabled) => setDraft((d) => ({ ...d, reservationsEnabled: enabled }))}
        onDone={doneInline}
        onCancel={cancelInline}
      />
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
        {zones.length > 0 ? (
          <SearchableSelect
            label="Lagja / zona"
            value={draft.zoneId ?? ''}
            onChange={(v) => {
              const zone = zones.find((z) => z.id === v);
              setDraft((d) => ({ ...d, zoneId: v || null, zoneName: zone?.name ?? null }));
            }}
            options={zones.map((z) => ({ value: z.id, label: z.name }))}
            emptyLabel="Zgjidhni…"
            clearable
          />
        ) : null}
        <TextField
          label="Linku i Google Maps (opsionale)"
          value={draft.mapsUrl ?? ''}
          onChange={(e) => {
            const mapsPreview = withMapsPreview(e.target.value);
            setDraft((d) => ({ ...d, ...mapsPreview }));
          }}
          fullWidth
          placeholder="https://maps.app.goo.gl/…"
          helperText="Ngjitni linkun e vendndodhjes për pin të saktë në hartë."
          sx={fieldSx}
        />
        <OwnerInlineEditActions onDone={() => void doneLocationInline()} onCancel={cancelInline} />
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
      title={draft.title || 'Biznes'}
      status={draft.status}
      dirty={dirty}
      saving={saving}
      error={error}
      success={success}
      backHref={backHref}
      onSave={() => void onSave()}
      aiAssist={
        <OwnerEditAiAssist
          category="businesses"
          currentListing={draft as unknown as Record<string, unknown>}
          onApply={(next) => {
            const merged = next as unknown as BusinessMineListing;
            setDraft({
              ...draft,
              ...merged,
              id: draft.id,
              status: draft.status,
              imageUrls: Array.isArray(merged.imageUrls) ? merged.imageUrls : draft.imageUrls,
            });
            setExistingUrls(Array.isArray(merged.imageUrls) ? merged.imageUrls : draft.imageUrls);
            setNewFiles([]);
          }}
        />
      }
    >
      <BusinessListingDetailView
        listing={preview}
        similar={[]}
        ownerPreview
        ownerEdit={{
          onEditPhotos: openPhotos,
          onEditHours: openHours,
          onEditMenu: () => hardNavigate(`${paths.user.businessMenu}?id=${encodeURIComponent(draft.id)}`),
          editingField,
          onStartInlineEdit: startInline,
          inlineEditors,
        }}
      />

      <OwnerEditSectionDialog
        open={dialog === 'photos'}
        title="Fotot e biznesit"
        onClose={() => setDialog(null)}
        onApply={async () => {
          const res = await commitListingPhotos({
            existingUrls,
            newFiles,
            folder: 'businesses',
            max: MAX_IMAGES,
          });
          if (res.error) {
            setError(res.error);
            return;
          }
          setDraft((d) => ({ ...d, imageUrls: res.urls }));
          setExistingUrls(res.urls);
          setNewFiles([]);
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
        open={dialog === 'hours'}
        title="Orari javor"
        onClose={() => setDialog(null)}
        onApply={() => {
          setDraft((d) => ({ ...d, weeklyHours }));
          setDialog(null);
        }}
      >
        {weeklyHours.map((row, index) => (
          <Stack key={row.dayOfWeek} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <FormControlLabel
              sx={{ minWidth: 72 }}
              control={
                <Checkbox
                  checked={!row.closed}
                  onChange={(e) => {
                    const next = [...weeklyHours];
                    next[index] = { ...row, closed: !e.target.checked };
                    setWeeklyHours(next);
                  }}
                />
              }
              label={BUSINESS_DAY_LABELS[row.dayOfWeek] ?? `D${row.dayOfWeek}`}
            />
            <TextField
              size="small"
              label="Hap"
              value={row.open}
              disabled={row.closed}
              onChange={(e) => {
                const next = [...weeklyHours];
                next[index] = { ...row, open: e.target.value };
                setWeeklyHours(next);
              }}
            />
            <TextField
              size="small"
              label="Mbyll"
              value={row.close}
              disabled={row.closed}
              onChange={(e) => {
                const next = [...weeklyHours];
                next[index] = { ...row, close: e.target.value };
                setWeeklyHours(next);
              }}
            />
          </Stack>
        ))}
      </OwnerEditSectionDialog>
    </ListingOwnerEditShell>
  );
}

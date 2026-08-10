'use client';

import * as React from 'react';
import { Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
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
  type BusinessMineListing,
} from '@/lib/directory-listings-client';
import { hardNavigate } from '@/lib/hard-navigate';
import { businessMineToPublic } from '@/lib/listing-mine-to-public';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { isPersistableImageUrl } from '@/lib/image-url';
import { commitListingPhotos } from '@/lib/owner-edit-photos';
import { uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';

const MAX_IMAGES = 8;

type Snapshot = {
  title: string;
  description: string;
  category: string;
  cityId: string | null;
  cityName: string | null;
  contactPhone: string | null;
  servicesHighlight: string | null;
  reservationsEnabled: boolean;
  reservationUrl: string | null;
};

function snapFrom(d: BusinessMineListing): Snapshot {
  return {
    title: d.title,
    description: d.description ?? '',
    category: d.category,
    cityId: d.cityId ?? null,
    cityName: d.cityName ?? null,
    contactPhone: d.contactPhone ?? null,
    servicesHighlight: d.servicesHighlight ?? null,
    reservationsEnabled: Boolean(d.reservationsEnabled),
    reservationUrl: d.reservationUrl ?? null,
  };
}

export function BusinessOwnerEdit({
  initial,
  backHref = paths.user.myRealEstateListings,
}: {
  initial: BusinessMineListing;
  backHref?: string;
}) {
  const [draft, setDraft] = React.useState(initial);
  const [baseline, setBaseline] = React.useState(() => JSON.stringify(initial));
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
        contactPhone: draft.contactPhone ?? '',
        imageUrls,
        weeklyHours: draft.weeklyHours?.length ? draft.weeklyHours : weeklyHours,
        reservationsEnabled: draft.reservationsEnabled,
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
      const next = { ...draft, imageUrls, cityId: payload.cityId || null };
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
        <FormControlLabel
          control={
            <Checkbox
              checked={draft.reservationsEnabled}
              onChange={(e) => setDraft((d) => ({ ...d, reservationsEnabled: e.target.checked }))}
            />
          }
          label="Aktivizo rezervimet"
        />
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

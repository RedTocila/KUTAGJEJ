'use client';

import * as React from 'react';
import { Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { BusinessListingDetailView } from '@/components/public/business-listing-detail-view';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import {
  BUSINESS_CATEGORY_OPTIONS,
  BUSINESS_DAY_LABELS,
  DEFAULT_RESERVATION_PARTY_SIZES,
  DEFAULT_RESERVATION_TIME_SLOTS,
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
import { uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';

const MAX_IMAGES = 8;

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
  const [dialog, setDialog] = React.useState<'photos' | 'info' | 'hours' | null>(null);

  const [existingUrls, setExistingUrls] = React.useState(initial.imageUrls ?? []);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [info, setInfo] = React.useState({
    title: initial.title,
    description: initial.description,
    category: initial.category,
    cityId: initial.cityId ?? '',
    contactPhone: initial.contactPhone ?? '',
    servicesHighlight: initial.servicesHighlight ?? '',
    reservationsEnabled: initial.reservationsEnabled,
    reservationUrl: initial.reservationUrl ?? '',
  });
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

  const openPhotos = () => {
    setExistingUrls(draft.imageUrls ?? []);
    setNewFiles([]);
    setDialog('photos');
  };

  const openInfo = () => {
    setInfo({
      title: draft.title,
      description: draft.description,
      category: draft.category,
      cityId: draft.cityId ?? '',
      contactPhone: draft.contactPhone ?? '',
      servicesHighlight: draft.servicesHighlight ?? '',
      reservationsEnabled: draft.reservationsEnabled,
      reservationUrl: draft.reservationUrl ?? '',
    });
    setDialog('info');
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
      if (newFiles.length) {
        const slots = Math.max(0, MAX_IMAGES - existingUrls.length);
        const up = await uploadListingImages(newFiles.slice(0, slots), 'businesses');
        if (up.error) {
          setError(up.error);
          return;
        }
        uploaded = up.urls;
      }
      const imageUrls = [...existingUrls, ...uploaded].slice(0, MAX_IMAGES);
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        cityId: draft.cityId || info.cityId,
        contactPhone: draft.contactPhone ?? '',
        imageUrls,
        weeklyHours: draft.weeklyHours?.length ? draft.weeklyHours : weeklyHours,
        reservationsEnabled: draft.reservationsEnabled,
        reservationUrl: draft.reservationUrl,
        reservationTimeSlots: draft.reservationTimeSlots?.length
          ? draft.reservationTimeSlots
          : DEFAULT_RESERVATION_TIME_SLOTS,
        reservationPartySizes: draft.reservationPartySizes?.length
          ? draft.reservationPartySizes
          : DEFAULT_RESERVATION_PARTY_SIZES,
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
      setSuccess('Biznesi u përditësua.');
    } finally {
      setSaving(false);
    }
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
          onEditInfo: openInfo,
          onEditHours: openHours,
          onEditMenu: () => hardNavigate(`${paths.user.businessMenu}?id=${encodeURIComponent(draft.id)}`),
        }}
      />

      <OwnerEditSectionDialog
        open={dialog === 'photos'}
        title="Fotot e biznesit"
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
        title="Të dhënat e biznesit"
        onClose={() => setDialog(null)}
        onApply={() => {
          const cityName = cities.find((c) => c.id === info.cityId)?.name ?? draft.cityName;
          setDraft((d) => ({
            ...d,
            title: info.title.trim(),
            description: info.description.trim(),
            category: info.category,
            cityId: info.cityId || null,
            cityName,
            contactPhone: info.contactPhone.trim() || null,
            servicesHighlight: info.servicesHighlight.trim() || null,
            reservationsEnabled: info.reservationsEnabled,
            reservationUrl: info.reservationUrl.trim() || null,
          }));
          setDialog(null);
        }}
      >
        <TextField label="Emri" value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} fullWidth required />
        <SearchableSelect
          label="Kategoria"
          value={info.category}
          onChange={(v) => setInfo({ ...info, category: v })}
          options={BUSINESS_CATEGORY_OPTIONS}
          emptyLabel="Zgjidhni…"
          required
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
        <TextField
          label="Çfarë ofroni"
          value={info.servicesHighlight}
          onChange={(e) => setInfo({ ...info, servicesHighlight: e.target.value })}
          fullWidth
        />
        <TextField
          label="Telefoni"
          value={info.contactPhone}
          onChange={(e) => setInfo({ ...info, contactPhone: e.target.value })}
          fullWidth
          required
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={info.reservationsEnabled}
              onChange={(e) => setInfo({ ...info, reservationsEnabled: e.target.checked })}
            />
          }
          label="Aktivizo rezervimet"
        />
        <TextField
          label="URL rezervimi (opsionale)"
          value={info.reservationUrl}
          onChange={(e) => setInfo({ ...info, reservationUrl: e.target.value })}
          fullWidth
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

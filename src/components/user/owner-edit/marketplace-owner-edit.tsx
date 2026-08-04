'use client';

import * as React from 'react';
import { Stack, TextField } from '@mui/material';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { VerticalListingDetailView } from '@/components/public/vertical-listing-detail-view';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { marketplaceMineToPublic } from '@/lib/listing-mine-to-public';
import { updateMarketplaceListing, type MarketplaceMineListing } from '@/lib/listings-client';
import { MARKETPLACE_CATEGORY_OPTIONS, MARKETPLACE_CONDITION_OPTIONS } from '@/lib/marketplace-constants';
import { CURRENCY_OPTIONS } from '@/lib/real-estate-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';

const MAX_IMAGES = 8;

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
  const [dialog, setDialog] = React.useState<'photos' | 'info' | null>(null);
  const [existingUrls, setExistingUrls] = React.useState(initial.imageUrls ?? []);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [info, setInfo] = React.useState({
    title: initial.title,
    description: initial.description ?? '',
    category: initial.category,
    condition: initial.condition ?? '',
    price: initial.price != null ? String(initial.price) : '',
    currency: (initial.currency === 'EUR' || initial.currency === 'LEK' ? initial.currency : '') as '' | 'EUR' | 'LEK',
    cityId: initial.cityId ?? '',
    contactPhone: initial.contactPhone ?? '',
  });

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const dirty = JSON.stringify(draft) !== baseline || newFiles.length > 0;
  const preview = React.useMemo(() => marketplaceMineToPublic(draft), [draft]);

  const openPhotos = () => {
    setExistingUrls(draft.imageUrls ?? []);
    setNewFiles([]);
    setDialog('photos');
  };

  const openInfo = () => {
    setInfo({
      title: draft.title,
      description: draft.description ?? '',
      category: draft.category,
      condition: draft.condition ?? '',
      price: draft.price != null ? String(draft.price) : '',
      currency: draft.currency === 'EUR' || draft.currency === 'LEK' ? draft.currency : '',
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
          'marketplace',
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
      const res = await updateMarketplaceListing(draft.id, {
        transactionType: 'shes',
        title: draft.title.trim(),
        description: draft.description ?? '',
        category: draft.category,
        condition: draft.condition,
        price: draft.price,
        currency: draft.currency,
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
            setExistingUrls(Array.isArray(merged.imageUrls) ? merged.imageUrls : draft.imageUrls ?? []);
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
          const cityName = cities.find((c) => c.id === info.cityId)?.name ?? draft.cityName;
          setDraft((d) => ({
            ...d,
            title: info.title.trim(),
            description: info.description.trim(),
            category: info.category.trim(),
            condition: info.condition.trim() || null,
            price: info.price.trim() ? Number(info.price) : null,
            currency: info.price.trim() && info.currency ? info.currency : null,
            cityId: info.cityId || null,
            cityName,
            contactPhone: info.contactPhone.trim() || null,
          }));
          setDialog(null);
        }}
      >
        <TextField label="Titulli" value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} fullWidth required />
        <SearchableSelect
          label="Kategoria"
          value={info.category}
          onChange={(v) => setInfo({ ...info, category: v })}
          options={MARKETPLACE_CATEGORY_OPTIONS}
          emptyLabel="Zgjidhni…"
          required
        />
        <SearchableSelect
          label="Gjendja"
          value={info.condition}
          onChange={(v) => setInfo({ ...info, condition: v })}
          options={MARKETPLACE_CONDITION_OPTIONS}
          emptyLabel="—"
        />
        <TextField
          label="Përshkrimi"
          value={info.description}
          onChange={(e) => setInfo({ ...info, description: e.target.value })}
          fullWidth
          multiline
          minRows={3}
        />
        <Stack direction="row" spacing={1.5}>
          <TextField label="Çmimi" value={info.price} onChange={(e) => setInfo({ ...info, price: e.target.value })} fullWidth />
          <SearchableSelect
            label="Monedha"
            value={info.currency}
            onChange={(v) => setInfo({ ...info, currency: v as '' | 'EUR' | 'LEK' })}
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

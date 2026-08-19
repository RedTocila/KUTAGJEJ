'use client';

import * as React from 'react';
import { Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { ListingMapsLocationFields } from '@/components/listings/listing-maps-location-fields';
import { ProfessionalProfilePhotosEditor } from '@/components/professionals/professional-profile-photos-editor';
import { ProfessionalListingDetailView } from '@/components/public/professional-listing-detail-view';
import { ListingDescriptionField } from '@/components/user/listing-form-ui';
import { ListingOwnerEditShell } from '@/components/user/listing-owner-edit-shell';
import { OwnerEditAiAssist } from '@/components/user/owner-edit-ai-assist';
import type { OwnerInlineField } from '@/components/user/owner-edit-pencil';
import { OwnerEditSectionDialog } from '@/components/user/owner-edit-section-dialog';
import { OwnerInlineEditActions } from '@/components/user/owner-inline-edit';
import {
  updateProfessionalListing,
  type ProfessionalMineListing,
  type ProfessionalPortfolioItem,
} from '@/lib/directory-listings-client';
import { professionalMineToPublic } from '@/lib/listing-mine-to-public';
import { PROFESSIONAL_CATEGORY_OPTIONS } from '@/lib/professional-constants';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { isEphemeralImageUrl, isPersistableImageUrl } from '@/lib/image-url';
import { uploadListingImages } from '@/lib/uploads-client';
import { paths } from '@/paths';

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type PortfolioDraft = ProfessionalPortfolioItem & { imageFile: File | null };

type Snapshot = {
  title: string;
  description: string;
  category: string;
  cityId: string | null;
  cityName: string | null;
  mapsUrl: string | null;
  locationAddress: string | null;
  locationLat: number | null;
  locationLng: number | null;
  contactPhone: string | null;
  servicesHighlight: string | null;
  responseTimeHours: number | null;
};

function snapFrom(d: ProfessionalMineListing): Snapshot {
  return {
    title: d.title,
    description: d.description ?? '',
    category: d.category,
    cityId: d.cityId ?? null,
    cityName: d.cityName ?? null,
    mapsUrl: d.mapsUrl ?? null,
    locationAddress: d.locationAddress ?? null,
    locationLat: d.locationLat ?? null,
    locationLng: d.locationLng ?? null,
    contactPhone: d.contactPhone ?? null,
    servicesHighlight: d.servicesHighlight ?? null,
    responseTimeHours: d.responseTimeHours ?? null,
  };
}

/**
 * Resolve a cover/avatar/portfolio slot to a durable URL.
 * - Prefer uploading a newly picked File.
 * - Accept only persistable http(s) URLs already on the listing.
 * - `blob:` / `data:` previews must never be saved. In soft mode (Ruaj), fall
 *   back to the last durable URL so location/text edits are not blocked by a
 *   stale preview. In strict mode (Apliko foto), ask the user to re-pick.
 */
async function resolveUrl(
  existing: string | null,
  file: File | null,
  opts?: { fallback?: string | null; strict?: boolean },
): Promise<{ url: string | null; error?: string }> {
  if (file) {
    const up = await uploadListingImages([file], 'professionals');
    if (up.error) return { url: null, error: up.error };
    return { url: up.urls[0] ?? null };
  }

  const current = String(existing || '').trim();
  if (!current) {
    return { url: null };
  }
  if (isPersistableImageUrl(current)) {
    return { url: current };
  }

  const fallback = opts?.fallback && isPersistableImageUrl(opts.fallback) ? opts.fallback : null;

  if (isEphemeralImageUrl(current)) {
    if (fallback) return { url: fallback };
    if (opts?.strict) {
      return { url: null, error: 'Fotoja nuk u ngarkua. Zgjidhni foton përsëri.' };
    }
    return { url: null };
  }

  if (fallback) return { url: fallback };
  if (opts?.strict) {
    return { url: null, error: 'Fotoja nuk është e vlefshme. Zgjidhni foton përsëri.' };
  }
  return { url: null };
}

function durableSlot(urls: string[] | null | undefined, index: number): string | null {
  const list = (urls ?? []).filter(isPersistableImageUrl);
  return list[index] ?? null;
}

export function ProfessionalOwnerEdit({
  initial,
  backHref = paths.user.myRealEstateListings,
}: {
  initial: ProfessionalMineListing;
  backHref?: string;
}) {
  const [draft, setDraft] = React.useState(initial);
  const [baseline, setBaseline] = React.useState(() => JSON.stringify(initial));
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<'photos' | 'portfolio' | null>(null);
  const [photosFocus, setPhotosFocus] = React.useState<'cover' | 'avatar'>('cover');
  const [editingField, setEditingField] = React.useState<OwnerInlineField | null>(null);
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null);

  const [coverFile, setCoverFile] = React.useState<File[]>([]);
  const [avatarFile, setAvatarFile] = React.useState<File[]>([]);
  const [coverUrl, setCoverUrl] = React.useState(() => durableSlot(initial.imageUrls, 0) ?? '');
  const [avatarUrl, setAvatarUrl] = React.useState(() => durableSlot(initial.imageUrls, 1) ?? '');
  const [portfolio, setPortfolio] = React.useState<PortfolioDraft[]>(() =>
    (initial.portfolioItems ?? []).map((p) => ({
      ...p,
      imageUrl: isPersistableImageUrl(p.imageUrl) ? p.imageUrl : '',
      imageFile: null,
    })),
  );

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const dirty =
    JSON.stringify(draft) !== baseline ||
    coverFile.length > 0 ||
    avatarFile.length > 0 ||
    portfolio.some((p) => p.imageFile);

  const previewListing = React.useMemo(() => professionalMineToPublic(draft), [draft]);

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

  const applyPhotos = async () => {
    setError(null);
    const durable = (draft.imageUrls ?? []).filter(isPersistableImageUrl);
    const cover = await resolveUrl(coverUrl || null, coverFile[0] ?? null, {
      fallback: durable[0] ?? null,
      strict: true,
    });
    if (cover.error) {
      setError(cover.error);
      return;
    }
    const avatar = await resolveUrl(avatarUrl || null, avatarFile[0] ?? null, {
      fallback: durable[1] ?? null,
      strict: true,
    });
    if (avatar.error) {
      setError(avatar.error);
      return;
    }
    const imageUrls = [cover.url, avatar.url].filter((u): u is string => Boolean(u));
    setDraft((d) => ({ ...d, imageUrls }));
    setCoverUrl(cover.url ?? '');
    setAvatarUrl(avatar.url ?? '');
    setCoverFile([]);
    setAvatarFile([]);
    setDialog(null);
  };

  const applyPortfolio = async () => {
    setError(null);
    const portfolioItems: ProfessionalPortfolioItem[] = [];
    for (const item of portfolio) {
      if (!item.title.trim()) continue;
      const resolved = await resolveUrl(item.imageUrl || null, item.imageFile, { strict: true });
      if (resolved.error) {
        setError(resolved.error);
        return;
      }
      if (!resolved.url) continue;
      portfolioItems.push({
        id: item.id,
        title: item.title.trim(),
        description: item.description?.trim() || '',
        imageUrl: resolved.url,
        location: item.location?.trim() || null,
        sortOrder: portfolioItems.length,
      });
    }
    setDraft((d) => ({ ...d, portfolioItems }));
    setPortfolio(portfolioItems.map((p) => ({ ...p, imageFile: null })));
    setDialog(null);
  };

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const durable = (draft.imageUrls ?? []).filter(isPersistableImageUrl);
      // If the picker cleared coverUrl while a File is pending, upload the File.
      // If both are empty, keep the last durable draft URL (photo dialog not applied).
      const coverExisting =
        coverUrl.trim() || (coverFile.length ? '' : durable[0] ?? '') || null;
      const cover = await resolveUrl(coverExisting, coverFile[0] ?? null, {
        fallback: durable[0] ?? null,
        strict: false,
      });
      if (cover.error) {
        setError(cover.error);
        return;
      }
      const avatarExisting =
        avatarUrl.trim() || (avatarFile.length ? '' : durable[1] ?? '') || null;
      const avatar = await resolveUrl(avatarExisting, avatarFile[0] ?? null, {
        fallback: durable[1] ?? null,
        strict: false,
      });
      if (avatar.error) {
        setError(avatar.error);
        return;
      }

      const portfolioItems: ProfessionalPortfolioItem[] = [];
      for (const item of portfolio) {
        if (!item.title.trim()) continue;
        const prior = (draft.portfolioItems ?? []).find((p) => p.id === item.id);
        const resolved = await resolveUrl(item.imageUrl || null, item.imageFile, {
          fallback: prior && isPersistableImageUrl(prior.imageUrl) ? prior.imageUrl : null,
          strict: false,
        });
        if (resolved.error) {
          setError(resolved.error);
          return;
        }
        if (!resolved.url) continue;
        portfolioItems.push({
          id: item.id,
          title: item.title.trim(),
          description: item.description?.trim() || '',
          imageUrl: resolved.url,
          location: item.location?.trim() || null,
          sortOrder: portfolioItems.length,
        });
      }

      if (!draft.cityId) {
        setError('Zgjidhni qytetin.');
        return;
      }

      const imageUrls = [cover.url, avatar.url].filter((u): u is string => Boolean(u));
      if (!cover.url) {
        setError('Shtoni të paktën një foto.');
        return;
      }
      const payload = {
        title: draft.title.trim(),
        description: (draft.description ?? '').trim(),
        category: draft.category,
        cityId: draft.cityId,
        mapsUrl: draft.mapsUrl?.trim() || null,
        contactPhone: draft.contactPhone ?? '',
        imageUrls,
        responseTimeHours: draft.responseTimeHours,
        portfolioItems,
        price: null,
        currency: null,
        condition: null as string | null,
        servicesHighlight: draft.servicesHighlight,
      };

      const res = await updateProfessionalListing(draft.id, payload);
      if (res.error) {
        setError(res.error);
        return;
      }

      const next: ProfessionalMineListing = {
        ...draft,
        imageUrls,
        portfolioItems,
        cityId: payload.cityId || null,
      };
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setCoverUrl(cover.url ?? '');
      setAvatarUrl(avatar.url ?? '');
      setCoverFile([]);
      setAvatarFile([]);
      setPortfolio(portfolioItems.map((p) => ({ ...p, imageFile: null })));
      setEditingField(null);
      setSuccess('Profili u përditësua.');
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
    category: (
      <Stack spacing={1.25} sx={{ width: '100%', maxWidth: 480 }}>
        <SearchableSelect
          label="Kategoria"
          value={draft.category}
          onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
          options={PROFESSIONAL_CATEGORY_OPTIONS}
          emptyLabel="Zgjidhni…"
          required
          allowCustom
        />
        <TextField
          label="Telefoni"
          value={draft.contactPhone ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value || null }))}
          fullWidth
          sx={fieldSx}
        />
        <TextField
          label="Koha e përgjigjes (orë)"
          type="number"
          value={draft.responseTimeHours != null ? String(draft.responseTimeHours) : ''}
          onChange={(e) => {
            const hours = Number.parseInt(e.target.value, 10);
            setDraft((d) => ({
              ...d,
              responseTimeHours: Number.isInteger(hours) && hours >= 1 ? hours : null,
            }));
          }}
          fullWidth
          sx={fieldSx}
        />
        <OwnerInlineEditActions onDone={doneInline} onCancel={cancelInline} />
      </Stack>
    ),
    services: (
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 480 }}>
        <TextField
          label="Shërbimet"
          value={draft.servicesHighlight ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, servicesHighlight: e.target.value || null }))}
          fullWidth
          autoFocus
          multiline
          minRows={2}
          sx={fieldSx}
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
        <ListingMapsLocationFields
          value={{
            mapsUrl: draft.mapsUrl ?? '',
            locationLat: draft.locationLat ?? null,
            locationLng: draft.locationLng ?? null,
            locationAddress: draft.locationAddress ?? null,
          }}
          onChange={(next) =>
            setDraft((d) => ({
              ...d,
              mapsUrl: next.mapsUrl.trim() || null,
              locationLat: next.locationLat,
              locationLng: next.locationLng,
              locationAddress: next.locationAddress,
            }))
          }
          cityName={draft.cityName}
          showPreview
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
      title={draft.title || 'Profesionist'}
      status={draft.status}
      dirty={dirty}
      saving={saving}
      error={error}
      success={success}
      backHref={backHref}
      onSave={() => void onSave()}
      aiAssist={
        <OwnerEditAiAssist
          category="professionals"
          currentListing={draft as unknown as Record<string, unknown>}
          onApply={(next) => {
            const merged = next as unknown as ProfessionalMineListing;
            const rawUrls = Array.isArray(merged.imageUrls) ? merged.imageUrls : draft.imageUrls;
            const urls = (rawUrls ?? [])
              .map((u) => String(u || '').trim())
              .filter(isPersistableImageUrl)
              .slice(0, 2);
            setDraft({
              ...draft,
              ...merged,
              id: draft.id,
              status: draft.status,
              imageUrls: urls.length ? urls : draft.imageUrls.filter(isPersistableImageUrl),
              portfolioItems: draft.portfolioItems,
            });
            const nextUrls = urls.length ? urls : (draft.imageUrls ?? []).filter(isPersistableImageUrl);
            setCoverUrl(nextUrls[0] ?? '');
            setAvatarUrl(nextUrls[1] ?? '');
            setCoverFile([]);
            setAvatarFile([]);
          }}
        />
      }
    >
      <ProfessionalListingDetailView
        listing={previewListing}
        canonicalUrl=""
        similar={[]}
        ownerPreview
        ownerEdit={{
          onEditPhotos: (focus) => {
            setPhotosFocus(focus === 'avatar' ? 'avatar' : 'cover');
            // Keep pending File picks; draft may only hold temporary blob: preview URLs.
            setCoverFile((files) => {
              if (!files.length) {
                const fromDraft = draft.imageUrls[0] ?? '';
                setCoverUrl(isEphemeralImageUrl(fromDraft) ? '' : fromDraft);
              }
              return files;
            });
            setAvatarFile((files) => {
              if (!files.length) {
                const fromDraft = draft.imageUrls[1] ?? '';
                setAvatarUrl(isEphemeralImageUrl(fromDraft) ? '' : fromDraft);
              }
              return files;
            });
            setDialog('photos');
          },
          onEditPortfolio: () => {
            setPortfolio((prev) => {
              const filesById = new Map(prev.map((p) => [p.id, p.imageFile] as const));
              return (draft.portfolioItems ?? []).map((p) => {
                const imageFile = filesById.get(p.id) ?? null;
                const imageUrl =
                  isEphemeralImageUrl(p.imageUrl) && !imageFile ? '' : p.imageUrl;
                return { ...p, imageUrl, imageFile };
              });
            });
            setDialog('portfolio');
          },
          editingField,
          onStartInlineEdit: startInline,
          inlineEditors,
        }}
      />

      <OwnerEditSectionDialog
        open={dialog === 'photos'}
        title="Fotot e profilit"
        maxWidth="sm"
        onClose={() => setDialog(null)}
        onApply={applyPhotos}
      >
        <ProfessionalProfilePhotosEditor
          coverFile={coverFile[0] ?? null}
          avatarFile={avatarFile[0] ?? null}
          coverUrl={coverUrl}
          avatarUrl={avatarUrl}
          focus={photosFocus}
          onCoverFile={(file) => setCoverFile(file ? [file] : [])}
          onAvatarFile={(file) => setAvatarFile(file ? [file] : [])}
          onCoverUrl={(url) => setCoverUrl(isEphemeralImageUrl(url) ? '' : url)}
          onAvatarUrl={(url) => setAvatarUrl(isEphemeralImageUrl(url) ? '' : url)}
        />
      </OwnerEditSectionDialog>

      <OwnerEditSectionDialog
        open={dialog === 'portfolio'}
        title="Portofoli"
        onClose={() => setDialog(null)}
        onApply={applyPortfolio}
      >
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Deri në 8 projekte
          </Typography>
          <Button
            size="small"
            startIcon={<PlusIcon size={14} />}
            disabled={portfolio.length >= 8}
            onClick={() =>
              setPortfolio((prev) => [
                ...prev,
                { id: newId(), title: '', description: '', imageUrl: '', location: null, sortOrder: prev.length, imageFile: null },
              ])
            }
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Shto
          </Button>
        </Stack>
        {portfolio.map((item, index) => (
          <Stack
            key={item.id}
            spacing={1.25}
            sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
          >
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <IconButton size="small" color="error" onClick={() => setPortfolio((p) => p.filter((x) => x.id !== item.id))}>
                <TrashIcon size={16} />
              </IconButton>
            </Stack>
            <TextField
              size="small"
              label="Titulli"
              value={item.title}
              onChange={(e) => {
                const next = [...portfolio];
                next[index] = { ...item, title: e.target.value };
                setPortfolio(next);
              }}
              fullWidth
            />
            <TextField
              size="small"
              label="Vendndodhja"
              value={item.location ?? ''}
              onChange={(e) => {
                const next = [...portfolio];
                next[index] = { ...item, location: e.target.value };
                setPortfolio(next);
              }}
              fullWidth
            />
            <ListingImagePicker
              value={item.imageFile ? [item.imageFile] : []}
              onChange={(files) => {
                const file = files[0] ?? null;
                const next = [...portfolio];
                next[index] = { ...item, imageFile: file, imageUrl: file ? '' : item.imageUrl };
                setPortfolio(next);
              }}
              existingUrls={!item.imageFile && item.imageUrl ? [item.imageUrl] : []}
              onExistingUrlsChange={(urls) => {
                const next = [...portfolio];
                next[index] = { ...item, imageUrl: urls[0] ?? '', imageFile: null };
                setPortfolio(next);
              }}
              max={1}
              label="Foto e projektit"
            />
          </Stack>
        ))}
      </OwnerEditSectionDialog>
    </ListingOwnerEditShell>
  );
}

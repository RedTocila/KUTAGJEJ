'use client';

import * as React from 'react';
import { Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { SearchableSelect } from '@/components/core/searchable-select';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { ProfessionalListingDetailView } from '@/components/public/professional-listing-detail-view';
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
    contactPhone: d.contactPhone ?? null,
    servicesHighlight: d.servicesHighlight ?? null,
    responseTimeHours: d.responseTimeHours ?? null,
  };
}

async function resolveUrl(existing: string | null, file: File | null): Promise<{ url: string | null; error?: string }> {
  if (file) {
    const up = await uploadListingImages([file], 'professionals');
    if (up.error) return { url: null, error: up.error };
    return { url: up.urls[0] ?? null };
  }
  return { url: existing };
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
  const [editingField, setEditingField] = React.useState<OwnerInlineField | null>(null);
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null);

  const [coverFile, setCoverFile] = React.useState<File[]>([]);
  const [avatarFile, setAvatarFile] = React.useState<File[]>([]);
  const [coverUrl, setCoverUrl] = React.useState(initial.imageUrls[0] ?? '');
  const [avatarUrl, setAvatarUrl] = React.useState(initial.imageUrls[1] ?? '');
  const [portfolio, setPortfolio] = React.useState<PortfolioDraft[]>(() =>
    (initial.portfolioItems ?? []).map((p) => ({ ...p, imageFile: null })),
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

  const applyPhotos = () => {
    const nextCover = coverFile[0] ? URL.createObjectURL(coverFile[0]) : coverUrl;
    const nextAvatar = avatarFile[0] ? URL.createObjectURL(avatarFile[0]) : avatarUrl;
    setDraft((d) => ({
      ...d,
      imageUrls: [nextCover, nextAvatar].filter(Boolean),
    }));
    setDialog(null);
  };

  const applyPortfolio = () => {
    setDraft((d) => ({
      ...d,
      portfolioItems: portfolio
        .filter((p) => p.title.trim() && (p.imageUrl || p.imageFile))
        .map((p, i) => ({
          id: p.id,
          title: p.title.trim(),
          description: p.description?.trim() || '',
          imageUrl: p.imageFile ? URL.createObjectURL(p.imageFile) : p.imageUrl,
          location: p.location?.trim() || null,
          sortOrder: i,
        })),
    }));
    setDialog(null);
  };

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const cover = await resolveUrl(coverUrl || null, coverFile[0] ?? null);
      if (cover.error) {
        setError(cover.error);
        return;
      }
      const avatar = await resolveUrl(avatarUrl || null, avatarFile[0] ?? null);
      if (avatar.error) {
        setError(avatar.error);
        return;
      }

      const portfolioItems: ProfessionalPortfolioItem[] = [];
      for (const item of portfolio) {
        if (!item.title.trim()) continue;
        const resolved = await resolveUrl(item.imageUrl || null, item.imageFile);
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
      const payload = {
        title: draft.title.trim(),
        description: (draft.description ?? '').trim(),
        category: draft.category,
        cityId: draft.cityId,
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
            const urls = Array.isArray(merged.imageUrls) ? merged.imageUrls.filter(Boolean) : draft.imageUrls;
            setDraft({
              ...draft,
              ...merged,
              id: draft.id,
              status: draft.status,
              imageUrls: urls.slice(0, 2),
              portfolioItems: draft.portfolioItems,
            });
            setCoverUrl(urls[0] ?? '');
            setAvatarUrl(urls[1] ?? '');
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
          onEditPhotos: () => {
            setCoverUrl(draft.imageUrls[0] ?? '');
            setAvatarUrl(draft.imageUrls[1] ?? '');
            setCoverFile([]);
            setAvatarFile([]);
            setDialog('photos');
          },
          onEditPortfolio: () => {
            setPortfolio((draft.portfolioItems ?? []).map((p) => ({ ...p, imageFile: null })));
            setDialog('portfolio');
          },
          editingField,
          onStartInlineEdit: startInline,
          inlineEditors,
        }}
      />

      <OwnerEditSectionDialog
        open={dialog === 'photos'}
        title="Foto kopertinë & profili"
        onClose={() => setDialog(null)}
        onApply={applyPhotos}
      >
        <ListingImagePicker
          value={coverFile}
          onChange={(files) => {
            setCoverFile(files.slice(0, 1));
            if (files.length) setCoverUrl('');
          }}
          existingUrls={coverUrl && !coverFile.length ? [coverUrl] : []}
          onExistingUrlsChange={(urls) => setCoverUrl(urls[0] ?? '')}
          max={1}
          label="Foto kopertinë"
        />
        <ListingImagePicker
          value={avatarFile}
          onChange={(files) => {
            setAvatarFile(files.slice(0, 1));
            if (files.length) setAvatarUrl('');
          }}
          existingUrls={avatarUrl && !avatarFile.length ? [avatarUrl] : []}
          onExistingUrlsChange={(urls) => setAvatarUrl(urls[0] ?? '')}
          max={1}
          label="Foto profili (rrethi)"
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

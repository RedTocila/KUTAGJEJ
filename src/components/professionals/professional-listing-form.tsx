'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Briefcase as BriefcaseIcon } from '@phosphor-icons/react/dist/ssr/Briefcase';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { UserCircle as UserCircleIcon } from '@phosphor-icons/react/dist/ssr/UserCircle';

import { SearchableSelect } from '@/components/core/searchable-select';
import {
  ListingFormActions,
  ListingFormSection,
  ListingTextField,
} from '@/components/user/listing-form-ui';
import { PROFESSIONAL_CATEGORY_OPTIONS } from '@/lib/professional-constants';
import {
  createProfessionalListing,
  listMyProfessionalListings,
  updateProfessionalListing,
  type ProfessionalMineListing,
  type ProfessionalPortfolioItem,
} from '@/lib/directory-listings-client';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { ListingSubmittedPendingAlert } from '@/components/user/listing-moderation-notice';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { uploadListingImages } from '@/lib/uploads-client';
import {
  professionalTitleFromUser,
  profileDefaultsFromStorage,
  resolveContactPhone,
} from '@/lib/listing-form-defaults';
import { useUser } from '@/hooks/use-user';

const MAX_PORTFOLIO_WORKS = 8;

type PortfolioDraft = ProfessionalPortfolioItem & {
  /** New local file to upload on save (replaces imageUrl when set). */
  imageFile: File | null;
};

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function resolveSingleImage(args: {
  existingUrl: string | null;
  file: File | null;
}): Promise<{ url: string | null; error?: string }> {
  if (args.file) {
    const up = await uploadListingImages([args.file], 'professionals');
    if (up.error) return { url: null, error: up.error };
    return { url: up.urls[0] ?? null };
  }
  return { url: args.existingUrl };
}

export function ProfessionalListingForm({
  onSuccess,
  backHref,
  backLabel,
  aiPrefill,
}: {
  onSuccess?: () => void;
  backHref?: string;
  backLabel?: string;
  aiPrefill?: Record<string, unknown> | null;
}) {
  const { user } = useUser();
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkingExisting, setCheckingExisting] = React.useState(true);
  const [existingId, setExistingId] = React.useState<string | null>(null);
  const [saveNotice, setSaveNotice] = React.useState<string | null>(null);
  const [createdPending, setCreatedPending] = React.useState(false);

  const [title, setTitle] = React.useState(() => {
    const fromAi = String(aiPrefill?.title ?? '').trim();
    if (fromAi) return fromAi;
    return profileDefaultsFromStorage().title;
  });
  const [description, setDescription] = React.useState(() => String(aiPrefill?.description ?? ''));
  const [category, setCategory] = React.useState(() => String(aiPrefill?.category ?? ''));
  const [cityId, setCityId] = React.useState(() => String(aiPrefill?.cityId ?? ''));
  const [contactPhone, setContactPhone] = React.useState(() => {
    const fromAi = String(aiPrefill?.contactPhone ?? '').trim();
    if (fromAi) return fromAi;
    return profileDefaultsFromStorage().phone;
  });
  const [servicesHighlight, setServicesHighlight] = React.useState(() =>
    String(aiPrefill?.servicesHighlight ?? ''),
  );
  const [responseTimeHours, setResponseTimeHours] = React.useState(
    () => String(aiPrefill?.responseTimeHours ?? '2') || '2',
  );

  // imageUrls convention: [0] = cover, [1] = profile avatar
  const [coverUrl, setCoverUrl] = React.useState<string | null>(() => {
    const urls = Array.isArray(aiPrefill?.imageUrls) ? aiPrefill.imageUrls : [];
    return typeof urls[0] === 'string' && urls[0] ? urls[0] : null;
  });
  const [coverFile, setCoverFile] = React.useState<File[]>([]);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(() => {
    const urls = Array.isArray(aiPrefill?.imageUrls) ? aiPrefill.imageUrls : [];
    return typeof urls[1] === 'string' && urls[1] ? urls[1] : null;
  });
  const [avatarFile, setAvatarFile] = React.useState<File[]>([]);
  const [portfolio, setPortfolio] = React.useState<PortfolioDraft[]>([]);

  const applyExistingListing = React.useCallback((listing: ProfessionalMineListing) => {
    setExistingId(listing.id);
    setTitle(listing.title ?? '');
    setDescription(listing.description ?? '');
    setCategory(listing.category ?? '');
    setCityId(listing.cityId ?? '');
    setContactPhone(listing.contactPhone ?? '');
    setServicesHighlight(listing.servicesHighlight ?? '');
    setResponseTimeHours(
      listing.responseTimeHours != null ? String(listing.responseTimeHours) : '2',
    );

    const urls = (listing.imageUrls ?? []).filter(Boolean);
    setCoverUrl(urls[0] ?? null);
    setAvatarUrl(urls[1] ?? null);
    setCoverFile([]);
    setAvatarFile([]);

    const existingPortfolio = (listing.portfolioItems ?? []).map((item, i) => ({
      id: item.id || newId(),
      title: item.title ?? '',
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      location: item.location ?? null,
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : i,
      imageFile: null as File | null,
    }));

    // Migrate legacy gallery extras into portfolio once (images beyond cover + avatar).
    if (existingPortfolio.length === 0 && urls.length > 2) {
      setPortfolio(
        urls.slice(2).map((imageUrl, i) => ({
          id: newId(),
          title: `Punë ${i + 1}`,
          description: '',
          imageUrl,
          location: null,
          sortOrder: i,
          imageFile: null,
        })),
      );
    } else {
      setPortfolio(existingPortfolio);
    }
  }, []);

  React.useEffect(() => {
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
    let cancelled = false;
    void listMyProfessionalListings().then((res) => {
      if (cancelled) return;
      const first = res.listings?.[0];
      if (first) applyExistingListing(first);
      else setExistingId(null);
      setCheckingExisting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [applyExistingListing]);

  // Prefill empty create fields from signup/profile (never overwrite AI, existing listing, or typed input).
  React.useEffect(() => {
    if (checkingExisting || existingId) return;
    const phone = resolveContactPhone(user);
    if (phone) {
      setContactPhone((prev) => (prev.trim() ? prev : phone));
    }
    const profileTitle = professionalTitleFromUser(user);
    if (profileTitle) {
      setTitle((prev) => (prev.trim() ? prev : profileTitle));
    }
    if (typeof user?.avatar === 'string' && user.avatar.trim()) {
      setAvatarUrl((prev) => prev || user.avatar!.trim());
    }
  }, [user, checkingExisting, existingId]);

  const addPortfolio = () => {
    setPortfolio((prev) => {
      if (prev.length >= MAX_PORTFOLIO_WORKS) return prev;
      return [
        ...prev,
        {
          id: newId(),
          title: '',
          description: '',
          imageUrl: '',
          location: '',
          sortOrder: prev.length,
          imageFile: null,
        },
      ];
    });
  };

  const updatePortfolio = (index: number, patch: Partial<PortfolioDraft>) => {
    setPortfolio((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveNotice(null);
    if (!title.trim() || !description.trim() || !category || !cityId) {
      setError('Plotësoni fushat e detyrueshme.');
      return;
    }

    const incompletePortfolio = portfolio.some(
      (p) => p.title.trim() && !p.imageUrl.trim() && !p.imageFile,
    );
    if (incompletePortfolio) {
      setError('Çdo projekt portofoli me titull duhet të ketë një foto.');
      return;
    }

    setSubmitting(true);

    const cover = await resolveSingleImage({
      existingUrl: coverUrl,
      file: coverFile[0] ?? null,
    });
    if (cover.error) {
      setSubmitting(false);
      setError(cover.error);
      return;
    }

    const avatar = await resolveSingleImage({
      existingUrl: avatarUrl,
      file: avatarFile[0] ?? null,
    });
    if (avatar.error) {
      setSubmitting(false);
      setError(avatar.error);
      return;
    }

    const imageUrls = [cover.url, avatar.url].filter((u): u is string => Boolean(u));

    const portfolioItems: ProfessionalPortfolioItem[] = [];
    for (let i = 0; i < portfolio.length; i += 1) {
      const item = portfolio[i]!;
      if (!item.title.trim()) continue;
      const resolved = await resolveSingleImage({
        existingUrl: item.imageUrl.trim() || null,
        file: item.imageFile,
      });
      if (resolved.error) {
        setSubmitting(false);
        setError(resolved.error);
        return;
      }
      if (!resolved.url) continue;
      portfolioItems.push({
        id: item.id,
        title: item.title.trim(),
        description: item.description.trim(),
        imageUrl: resolved.url,
        location: item.location?.trim() || null,
        sortOrder: portfolioItems.length,
      });
    }

    const hours = Number.parseInt(responseTimeHours, 10);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      cityId,
      contactPhone: contactPhone.trim(),
      imageUrls,
      responseTimeHours: Number.isInteger(hours) && hours >= 1 ? hours : null,
      portfolioItems,
      price: null,
      currency: null,
      condition: null,
      servicesHighlight: servicesHighlight.trim() || null,
    };

    if (existingId) {
      const res = await updateProfessionalListing(existingId, payload);
      setSubmitting(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setCoverUrl(cover.url);
      setAvatarUrl(avatar.url);
      setCoverFile([]);
      setAvatarFile([]);
      setPortfolio(
        portfolioItems.map((item) => ({
          ...item,
          imageFile: null,
        })),
      );
      setSaveNotice('Profili i profesionistit u përditësua.');
      return;
    }

    const res = await createProfessionalListing(payload);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.id) setExistingId(res.id);
    setCoverUrl(cover.url);
    setAvatarUrl(avatar.url);
    setCoverFile([]);
    setAvatarFile([]);
    setPortfolio(
      portfolioItems.map((item) => ({
        ...item,
        imageFile: null,
      })),
    );
    setCreatedPending(true);
    onSuccess?.();
  };

  if (checkingExisting) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        Duke ngarkuar profilin…
      </Typography>
    );
  }

  return (
    <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
      <Stack spacing={2.25}>
        {error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}
        {saveNotice ? (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            {saveNotice}
          </Alert>
        ) : null}
        {createdPending ? <ListingSubmittedPendingAlert /> : null}

        {existingId && !createdPending ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Po përditësoni profilin ekzistues të profesionistit. Mund të keni vetëm një.
          </Alert>
        ) : null}

        <ListingFormSection
          icon={<UserCircleIcon size={20} weight="duotone" />}
          title="Informacioni bazë"
          description="Titulli, kategoria dhe të dhënat që shfaqen në profil."
        >
          <ListingTextField
            label="Titulli i profilit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          <Stack spacing={2}>
            <ListingImagePicker
              value={coverFile}
              onChange={(files) => {
                setCoverFile(files.slice(0, 1));
                if (files.length) setCoverUrl(null);
              }}
              existingUrls={coverUrl ? [coverUrl] : []}
              onExistingUrlsChange={(urls) => setCoverUrl(urls[0] ?? null)}
              max={1}
              label="Foto kopertinë"
              disabled={submitting}
            />
            <ListingImagePicker
              value={avatarFile}
              onChange={(files) => {
                setAvatarFile(files.slice(0, 1));
                if (files.length) setAvatarUrl(null);
              }}
              existingUrls={avatarUrl ? [avatarUrl] : []}
              onExistingUrlsChange={(urls) => setAvatarUrl(urls[0] ?? null)}
              max={1}
              label="Foto profili (rrethi)"
              disabled={submitting}
            />
          </Stack>
          <SearchableSelect
            label="Kategoria"
            value={category}
            onChange={setCategory}
            options={PROFESSIONAL_CATEGORY_OPTIONS}
            emptyLabel="Zgjidhni kategorinë…"
            required
          />
          <SearchableSelect
            label="Qyteti"
            value={cityId}
            onChange={setCityId}
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            emptyLabel="Zgjidhni qytetin…"
            required
          />
          <ListingTextField
            label="Përshkrimi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            multiline
            minRows={4}
          />
          <ListingTextField
            label="Shërbimet (opsionale)"
            value={servicesHighlight}
            onChange={(e) => setServicesHighlight(e.target.value)}
            fullWidth
            placeholder="p.sh. Dizajn · Branding · Web"
          />
          <ListingTextField
            label="Telefon"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            required
            fullWidth
            placeholder="+355 69 …"
            type="tel"
            autoComplete="tel"
          />
          <ListingTextField
            label="Koha e përgjigjes (orë)"
            type="number"
            value={responseTimeHours}
            onChange={(e) => setResponseTimeHours(e.target.value)}
            fullWidth
            slotProps={{ htmlInput: { min: 1, max: 168 } }}
          />
        </ListingFormSection>

        <ListingFormSection
          icon={<BriefcaseIcon size={20} weight="duotone" />}
          title="Portofoli"
          description={`Opsionale — deri në ${MAX_PORTFOLIO_WORKS} projekte me foto pune.`}
          action={
            <Button
              size="small"
              variant="outlined"
              startIcon={<PlusIcon size={14} weight="bold" />}
              onClick={addPortfolio}
              disabled={portfolio.length >= MAX_PORTFOLIO_WORKS}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Projekt ({portfolio.length}/{MAX_PORTFOLIO_WORKS})
            </Button>
          }
        >
          {portfolio.length === 0 ? (
            <Box
              sx={{
                py: 2.5,
                px: 2,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                textAlign: 'center',
                color: 'text.secondary',
                typography: 'body2',
              }}
            >
              Nuk keni shtuar ende projekte portofoli.
            </Box>
          ) : null}
          {portfolio.map((item, index) => (
            <Box
              key={item.id}
              sx={{
                p: 1.75,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2.25,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 1 }}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setPortfolio((prev) => prev.filter((p) => p.id !== item.id))}
                >
                  <TrashIcon size={16} />
                </IconButton>
              </Stack>
              <Stack spacing={1.5}>
                <ListingTextField
                  size="small"
                  label="Titulli i projektit"
                  value={item.title}
                  onChange={(e) => updatePortfolio(index, { title: e.target.value })}
                  fullWidth
                />
                <ListingTextField
                  size="small"
                  label="Vendndodhja (opsionale)"
                  value={item.location ?? ''}
                  onChange={(e) => updatePortfolio(index, { location: e.target.value })}
                  fullWidth
                />
                <ListingImagePicker
                  value={item.imageFile ? [item.imageFile] : []}
                  onChange={(files) => {
                    const file = files[0] ?? null;
                    updatePortfolio(index, {
                      imageFile: file,
                      imageUrl: file ? '' : item.imageUrl,
                    });
                  }}
                  existingUrls={!item.imageFile && item.imageUrl ? [item.imageUrl] : []}
                  onExistingUrlsChange={(urls) =>
                    updatePortfolio(index, { imageUrl: urls[0] ?? '', imageFile: null })
                  }
                  max={1}
                  label="Foto e projektit"
                  disabled={submitting}
                />
              </Stack>
            </Box>
          ))}
        </ListingFormSection>

        <ListingFormActions
          submitLabel={existingId ? 'Ruaj ndryshimet' : 'Publiko profilin'}
          submitting={submitting}
          backHref={backHref}
          backLabel={backLabel}
        />
      </Stack>
    </Box>
  );
}

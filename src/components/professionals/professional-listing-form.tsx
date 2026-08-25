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
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

import { SearchableSelect } from '@/components/core/searchable-select';
import {
  exclusiveLocationPayload,
  inferListingLocationMode,
  ListingLocationChoice,
  type ListingLocationMode,
} from '@/components/listings/listing-location-choice';
import {
  ListingDescriptionField,
  ListingFormActionError,
  ListingFormActions,
  ListingFormSection,
  ListingTextField,
} from '@/components/user/listing-form-ui';
import { ListingBoostChoiceBar } from '@/components/user/listing-boost-choice-bar';
import {
  activatePremiumAfterCreate,
  PREMIUM_PACKAGE_ID,
  PremiumPostActions,
  type PremiumPayMode,
} from '@/components/user/premium-boost-upsell';
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
import { isEphemeralImageUrl, isPersistableImageUrl } from '@/lib/image-url';
import { uploadListingImages } from '@/lib/uploads-client';
import {
  knownCreateDefaultsFromStorage,
  professionalTitleFromUser,
  profileDefaultsFromStorage,
  resolveContactPhone,
} from '@/lib/listing-form-defaults';
import { hasUnlimitedDirectoryListings } from '@/lib/directory-listing-limits';
import { useCreateListingDefaults } from '@/hooks/use-create-listing-defaults';
import { useListingFormDraft } from '@/hooks/use-listing-form-draft';
import { usePublishListingFormSnapshot } from '@/components/user/listing-form-snapshot-context';
import { pickNonEmptyString } from '@/lib/listing-form-draft';
import { useUser } from '@/hooks/use-user';
import { useRouter, useSearchParams } from 'next/navigation';

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
  fallback?: string | null;
}): Promise<{ url: string | null; error?: string }> {
  if (args.file) {
    const up = await uploadListingImages([args.file], 'professionals');
    if (up.error) return { url: null, error: up.error };
    return { url: up.urls[0] ?? null };
  }
  const existing = String(args.existingUrl || '').trim();
  if (!existing) return { url: null };
  if (isPersistableImageUrl(existing)) return { url: existing };
  const fallback = args.fallback && isPersistableImageUrl(args.fallback) ? args.fallback : null;
  if (isEphemeralImageUrl(existing)) {
    if (fallback) return { url: fallback };
    return { url: null, error: 'Fotoja nuk u ngarkua. Zgjidhni foton përsëri.' };
  }
  if (fallback) return { url: fallback };
  return { url: null, error: 'Fotoja nuk është e vlefshme. Zgjidhni foton përsëri.' };
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
  const { user, checkSession } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsPremium = searchParams.get('premium') === '1';
  const premiumPayRef = React.useRef<PremiumPayMode>('buy-card');
  const premiumPackageIdRef = React.useRef(PREMIUM_PACKAGE_ID);
  const boostKindRef = React.useRef<'premium' | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkingExisting, setCheckingExisting] = React.useState(true);
  const [existingId, setExistingId] = React.useState<string | null>(null);
  const { defaults: knownDefaults, rememberLocation } = useCreateListingDefaults({
    enabled: !existingId,
  });
  const [saveNotice, setSaveNotice] = React.useState<string | null>(null);
  const [createdPending, setCreatedPending] = React.useState(false);

  const [title, setTitle] = React.useState(() => {
    const fromAi = String(aiPrefill?.title ?? '').trim();
    if (fromAi) return fromAi;
    return profileDefaultsFromStorage().title;
  });
  const [description, setDescription] = React.useState(() => String(aiPrefill?.description ?? ''));
  const [category, setCategory] = React.useState(() => String(aiPrefill?.category ?? ''));
  const [cityId, setCityId] = React.useState(() => {
    const fromAi = String(aiPrefill?.cityId ?? '').trim();
    if (fromAi) return fromAi;
    return knownCreateDefaultsFromStorage().cityId;
  });
  const [mapsUrl, setMapsUrl] = React.useState('');
  const [locationMode, setLocationMode] = React.useState<ListingLocationMode | ''>(() =>
    inferListingLocationMode(
      String(aiPrefill?.cityId ?? '').trim() || knownCreateDefaultsFromStorage().cityId,
      '',
    ),
  );
  const [locationLat, setLocationLat] = React.useState<number | null>(null);
  const [locationLng, setLocationLng] = React.useState<number | null>(null);
  const [locationAddress, setLocationAddress] = React.useState<string | null>(null);
  const [contactPhone, setContactPhone] = React.useState(() => {
    const fromAi = String(aiPrefill?.contactPhone ?? '').trim();
    if (fromAi) return fromAi;
    return profileDefaultsFromStorage().phone || knownCreateDefaultsFromStorage().contactPhone;
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
    setMapsUrl(listing.mapsUrl ?? '');
    setLocationMode(inferListingLocationMode(listing.cityId, listing.mapsUrl));
    setLocationLat(listing.locationLat ?? null);
    setLocationLng(listing.locationLng ?? null);
    setLocationAddress(listing.locationAddress ?? null);
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
      // Allowlisted accounts can create additional professionals — stay on create form.
      if (first && !hasUnlimitedDirectoryListings(user?.email)) applyExistingListing(first);
      else setExistingId(null);
      setCheckingExisting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [applyExistingListing, user?.email]);

  // Prefill empty create fields from signup/profile / last listing (never overwrite AI or typed input).
  React.useEffect(() => {
    if (checkingExisting || existingId) return;
    const phone = resolveContactPhone(user) || knownDefaults.contactPhone;
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
    if (knownDefaults.cityId) {
      setCityId((prev) => (prev.trim() ? prev : knownDefaults.cityId));
    }
  }, [user, checkingExisting, existingId, knownDefaults.contactPhone, knownDefaults.cityId]);

  const appliedAiRef = React.useRef<Record<string, unknown> | null>(null);
  React.useEffect(() => {
    if (!aiPrefill || appliedAiRef.current === aiPrefill) return;
    appliedAiRef.current = aiPrefill;
    const nextTitle = pickNonEmptyString(aiPrefill.title);
    if (nextTitle) setTitle(nextTitle);
    const nextDesc = pickNonEmptyString(aiPrefill.description);
    if (nextDesc) setDescription(nextDesc);
    const nextCat = pickNonEmptyString(aiPrefill.category);
    if (nextCat) setCategory(nextCat);
    const nextCity = pickNonEmptyString(aiPrefill.cityId);
    if (nextCity) {
      setCityId(nextCity);
      setLocationMode((prev) => prev || 'city');
    }
    const nextPhone = pickNonEmptyString(aiPrefill.contactPhone);
    if (nextPhone) setContactPhone(nextPhone);
    const nextServices = pickNonEmptyString(aiPrefill.servicesHighlight);
    if (nextServices) setServicesHighlight(nextServices);
    const nextHours = pickNonEmptyString(aiPrefill.responseTimeHours);
    if (nextHours) setResponseTimeHours(nextHours);
    const urls = Array.isArray(aiPrefill.imageUrls)
      ? aiPrefill.imageUrls.filter((u): u is string => typeof u === 'string' && Boolean(u))
      : [];
    if (urls[0]) setCoverUrl((prev) => prev || urls[0]!);
    if (urls[1]) setAvatarUrl((prev) => prev || urls[1]!);
  }, [aiPrefill]);

  type ProFormDraft = {
    title: string;
    description: string;
    category: string;
    cityId: string;
    mapsUrl: string;
    locationMode: ListingLocationMode | '';
    locationLat: number | null;
    locationLng: number | null;
    locationAddress: string | null;
    contactPhone: string;
    servicesHighlight: string;
    responseTimeHours: string;
    coverUrl: string | null;
    avatarUrl: string | null;
  };

  const proForm: ProFormDraft = {
    title,
    description,
    category,
    cityId,
    mapsUrl,
    locationMode,
    locationLat,
    locationLng,
    locationAddress,
    contactPhone,
    servicesHighlight,
    responseTimeHours,
    coverUrl,
    avatarUrl,
  };
  const proFormRef = React.useRef(proForm);
  proFormRef.current = proForm;
  const setProForm = React.useCallback((action: React.SetStateAction<ProFormDraft>) => {
    const next = typeof action === 'function' ? action(proFormRef.current) : action;
    setTitle(next.title);
    setDescription(next.description);
    setCategory(next.category);
    setCityId(next.cityId);
    setMapsUrl(next.mapsUrl);
    setLocationMode(next.locationMode);
    setLocationLat(next.locationLat);
    setLocationLng(next.locationLng);
    setLocationAddress(next.locationAddress);
    setContactPhone(next.contactPhone);
    setServicesHighlight(next.servicesHighlight);
    setResponseTimeHours(next.responseTimeHours);
    setCoverUrl(next.coverUrl);
    setAvatarUrl(next.avatarUrl);
  }, []);

  const existingImageUrls = React.useMemo(
    () => [coverUrl, avatarUrl].filter((u): u is string => Boolean(u)),
    [coverUrl, avatarUrl],
  );
  const setExistingImageUrls = React.useCallback(
    (action: React.SetStateAction<string[]>) => {
      const prev = [proFormRef.current.coverUrl, proFormRef.current.avatarUrl].filter((u): u is string => Boolean(u));
      const next = typeof action === 'function' ? action(prev) : action;
      setCoverUrl(next[0] ?? null);
      setAvatarUrl(next[1] ?? null);
    },
    [],
  );

  usePublishListingFormSnapshot(
    { ...proForm, imageUrls: existingImageUrls } as Record<string, unknown>,
    !existingId,
  );
  const { clearDraft } = useListingFormDraft({
    category: 'professionals',
    enabled: !existingId && !checkingExisting,
    skipRestore: Boolean(aiPrefill),
    form: proForm,
    setForm: setProForm,
    existingImageUrls,
    setExistingImageUrls,
    images: coverFile,
    setImages: setCoverFile,
    extraFiles: { avatar: avatarFile },
    onRestoreExtraFiles: (files) => {
      if (files.avatar) setAvatarFile(files.avatar);
    },
    maxImages: 2,
  });

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
    if (!title.trim()) {
      setError('Plotësoni titullin dhe numrin e telefonit.');
      return;
    }
    if (contactPhone.trim().length < 6) {
      setError('Vendosni një numër telefoni të vlefshëm.');
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
    if (!cover.url) {
      setSubmitting(false);
      setError('Shtoni të paktën një foto.');
      return;
    }

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
    const loc = exclusiveLocationPayload(locationMode, { cityId, mapsUrl });
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      cityId: loc.cityId,
      mapsUrl: loc.mapsUrl,
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
    clearDraft();
    if (loc.cityId) rememberLocation({ cityId: loc.cityId });
    if (res.id && (wantsPremium || boostKindRef.current === 'premium')) {
      const boost = await activatePremiumAfterCreate({
        mode: premiumPayRef.current,
        kind: 'professionals',
        listingId: res.id,
        packageId: premiumPackageIdRef.current,
      });
      if (boost.redirectToCheckout) {
        router.push(boost.redirectToCheckout);
        return;
      }
      if (!boost.ok && boost.message) {
        setError(boost.message);
      }
      void checkSession();
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
    <Box component="form" ref={formRef} onSubmit={(e) => void handleSubmit(e)}>
      <Stack spacing={2.25}>
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

        <ListingFormSection>
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
              variant="gallery"
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
              variant="avatar"
              label="Foto profili"
              disabled={submitting}
            />
          </Stack>
          <ListingTextField
            label="Titulli i profilit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          <SearchableSelect
            label="Kategoria"
            value={category}
            onChange={setCategory}
            options={PROFESSIONAL_CATEGORY_OPTIONS}
            emptyLabel="Zgjidhni kategorinë…"
            clearable
            allowCustom
          />
          <ListingLocationChoice
            mode={locationMode}
            onModeChange={setLocationMode}
            cityId={cityId}
            onCityIdChange={setCityId}
            cities={cities}
            maps={{ mapsUrl, locationLat, locationLng, locationAddress }}
            onMapsChange={(next) => {
              setMapsUrl(next.mapsUrl);
              setLocationLat(next.locationLat);
              setLocationLng(next.locationLng);
              setLocationAddress(next.locationAddress);
            }}
            disabled={submitting}
          />
          <ListingDescriptionField
            label="Përshkrimi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
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

        <Stack spacing={1.25}>
          <ListingFormActionError error={error} />
          {wantsPremium && !existingId ? (
            <PremiumPostActions
              submitting={submitting}
              onPost={(mode) => {
                premiumPayRef.current = mode;
                boostKindRef.current = 'premium';
                formRef.current?.requestSubmit();
              }}
            />
          ) : (
            <>
              {!existingId ? (
                <ListingBoostChoiceBar
                  submitting={submitting}
                  hideOkazion
                  onPostPremium={(mode, packageId) => {
                    premiumPayRef.current = mode;
                    premiumPackageIdRef.current = packageId;
                    boostKindRef.current = 'premium';
                    formRef.current?.requestSubmit();
                  }}
                />
              ) : null}
              <ListingFormActions
                submitLabel={existingId ? 'Ruaj ndryshimet' : 'Publiko profilin'}
                submitting={submitting}
                backHref={backHref}
                backLabel={backLabel}
                submitProps={{
                  onClick: () => {
                    boostKindRef.current = null;
                  },
                }}
              />
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

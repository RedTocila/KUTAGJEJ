'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
} from '@mui/material';
import { CalendarCheck as CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import { Clock as ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { Storefront as StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';

import { SearchableSelect } from '@/components/core/searchable-select';
import {
  BUSINESS_CATEGORY_OPTIONS,
  BUSINESS_DAY_LABELS,
  defaultWeeklyHours,
  type WeeklyHourRow,
} from '@/lib/business-constants';
import {
  createBusinessListing,
  getMyBusinessListing,
  listMyBusinessListings,
  updateBusinessListing,
  type BusinessMineListing,
} from '@/lib/directory-listings-client';
import { hasUnlimitedDirectoryListings } from '@/lib/directory-listing-limits';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { ListingSubmittedPendingAlert } from '@/components/user/listing-moderation-notice';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import { BusinessMobileCtaPicker, reservationsEnabledForMobileCta } from '@/components/businesses/business-mobile-cta-picker';
import { ListingMapsLocationFields } from '@/components/listings/listing-maps-location-fields';
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
import { BusinessAccountRequiredNotice } from '@/components/user/business-account-required-notice';
import { uploadListingImages } from '@/lib/uploads-client';
import { isBusinessPortalAccount } from '@/lib/user-portal-account-label';
import {
  businessCategoryFromUser,
  businessTitleFromUser,
  knownCreateDefaultsFromStorage,
  profileDefaultsFromStorage,
  resolveContactPhone,
} from '@/lib/listing-form-defaults';
import { useCreateListingDefaults } from '@/hooks/use-create-listing-defaults';
import { useUser } from '@/hooks/use-user';
import { useRouter, useSearchParams } from 'next/navigation';

const MAX_BUSINESS_IMAGES = 8;

export interface BusinessListingFormProps {
  onSuccess?: () => void;
  backHref?: string;
  backLabel?: string;
  /** Prefill from AI link import (create flow). */
  aiPrefill?: Record<string, unknown> | null;
}

export function BusinessListingForm({
  onSuccess,
  backHref,
  backLabel,
  aiPrefill,
}: BusinessListingFormProps) {
  const { user, checkSession } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wantsPremium = searchParams.get('premium') === '1';
  const premiumPayRef = React.useRef<PremiumPayMode>('buy-card');
  const premiumPackageIdRef = React.useRef(PREMIUM_PACKAGE_ID);
  const boostKindRef = React.useRef<'premium' | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const canPostBusiness = isBusinessPortalAccount(user);
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkingExisting, setCheckingExisting] = React.useState(true);
  const [existingId, setExistingId] = React.useState<string | null>(null);
  const { defaults: knownDefaults, rememberLocation } = useCreateListingDefaults({
    enabled: !existingId,
  });
  const [existingImageUrls, setExistingImageUrls] = React.useState<string[]>(() => {
    const urls = aiPrefill?.imageUrls;
    return Array.isArray(urls)
      ? urls.filter((u): u is string => typeof u === 'string' && Boolean(u)).slice(0, MAX_BUSINESS_IMAGES)
      : [];
  });
  const [saveNotice, setSaveNotice] = React.useState<string | null>(null);
  const [createdPending, setCreatedPending] = React.useState(false);

  const [title, setTitle] = React.useState(() => {
    const fromAi = String(aiPrefill?.title ?? '').trim();
    if (fromAi) return fromAi;
    return profileDefaultsFromStorage().businessName;
  });
  const [description, setDescription] = React.useState(() => String(aiPrefill?.description ?? ''));
  const [category, setCategory] = React.useState(() => {
    const fromAi = String(aiPrefill?.category ?? '').trim();
    if (fromAi) return fromAi;
    return profileDefaultsFromStorage().businessCategory;
  });
  const [cityId, setCityId] = React.useState(() => {
    const fromAi = String(aiPrefill?.cityId ?? '').trim();
    if (fromAi) return fromAi;
    return knownCreateDefaultsFromStorage().cityId;
  });
  const [zoneId, setZoneId] = React.useState('');
  const [mapsUrl, setMapsUrl] = React.useState('');
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
  const [images, setImages] = React.useState<File[]>([]);
  const [weeklyHours, setWeeklyHours] = React.useState<WeeklyHourRow[]>(defaultWeeklyHours);
  const [mobileCtaMode, setMobileCtaMode] = React.useState<'contact' | 'reserve' | 'none'>('contact');
  const [reservationsEnabled, setReservationsEnabled] = React.useState(false);

  const zones = React.useMemo(
    () => cities.find((c) => c.id === cityId)?.zones ?? [],
    [cities, cityId],
  );

  const applyExistingListing = React.useCallback((listing: BusinessMineListing) => {
    setExistingId(listing.id);
    setTitle(listing.title ?? '');
    setDescription(listing.description ?? '');
    setCategory(listing.category ?? '');
    setCityId(listing.cityId ?? '');
    setZoneId(listing.zoneId ?? '');
    setMapsUrl(listing.mapsUrl ?? '');
    setLocationLat(listing.locationLat ?? null);
    setLocationLng(listing.locationLng ?? null);
    setLocationAddress(listing.locationAddress ?? null);
    setContactPhone(listing.contactPhone ?? '');
    setServicesHighlight(listing.servicesHighlight ?? '');
    setExistingImageUrls((listing.imageUrls ?? []).filter(Boolean));
    setImages([]);
    const hours = Array.isArray(listing.weeklyHours) && listing.weeklyHours.length
      ? listing.weeklyHours.map((row, i) => ({
          dayOfWeek: typeof row.dayOfWeek === 'number' ? row.dayOfWeek : i,
          closed: Boolean(row.closed),
          open: String(row.open || '09:00'),
          close: String(row.close || '22:00'),
        }))
      : defaultWeeklyHours();
    setWeeklyHours(hours);
    setMobileCtaMode(listing.mobileCtaMode ?? (listing.reservationsEnabled ? 'contact' : 'contact'));
    setReservationsEnabled(Boolean(listing.reservationsEnabled));
  }, []);

  React.useEffect(() => {
    if (!canPostBusiness) {
      setCheckingExisting(false);
      return;
    }
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
    let cancelled = false;
    void listMyBusinessListings().then(async (res) => {
      if (cancelled) return;
      const first = res.listings?.[0];
      // Allowlisted accounts can create additional businesses — stay on create form.
      if (!first?.id || hasUnlimitedDirectoryListings(user?.email)) {
        setExistingId(null);
        setCheckingExisting(false);
        return;
      }
      // List cards are slim — load the full mine payload so zone / Maps URL prefill on edit.
      const full = await getMyBusinessListing(first.id);
      if (cancelled) return;
      if (full.listing) applyExistingListing(full.listing);
      else applyExistingListing(first);
      setCheckingExisting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canPostBusiness, applyExistingListing, user?.email]);

  // Prefill empty create fields from signup/profile / last listing location.
  React.useEffect(() => {
    if (!canPostBusiness || checkingExisting || existingId) return;
    const phone = resolveContactPhone(user) || knownDefaults.contactPhone;
    if (phone) setContactPhone((prev) => (prev.trim() ? prev : phone));
    const name = businessTitleFromUser(user);
    if (name) setTitle((prev) => (prev.trim() ? prev : name));
    const cat = businessCategoryFromUser(user);
    if (cat) setCategory((prev) => (prev.trim() ? prev : cat));
    if (knownDefaults.cityId) setCityId((prev) => (prev.trim() ? prev : knownDefaults.cityId));
  }, [user, canPostBusiness, checkingExisting, existingId, knownDefaults.contactPhone, knownDefaults.cityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveNotice(null);
    if (!canPostBusiness) {
      setError('Krijoni një llogari biznesi për të kryer këtë veprim.');
      return;
    }
    if (!title.trim()) {
      setError('Plotësoni titullin dhe numrin e telefonit.');
      return;
    }
    if (contactPhone.trim().length < 6) {
      setError('Vendosni një numër telefoni të vlefshëm.');
      return;
    }

    setSubmitting(true);
    let uploadedUrls: string[] = [];
    if (images.length) {
      const slots = Math.max(0, MAX_BUSINESS_IMAGES - existingImageUrls.length);
      const up = await uploadListingImages(images.slice(0, slots), 'businesses');
      if (up.error) {
        setSubmitting(false);
        setError(up.error);
        return;
      }
      uploadedUrls = up.urls;
    }
    const imageUrls = [...existingImageUrls, ...uploadedUrls].slice(0, MAX_BUSINESS_IMAGES);
    if (imageUrls.length < 1) {
      setSubmitting(false);
      setError('Shtoni të paktën një foto.');
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      cityId: cityId || null,
      zoneId: zoneId || null,
      mapsUrl: mapsUrl.trim() || null,
      contactPhone: contactPhone.trim(),
      imageUrls,
      weeklyHours,
      reservationsEnabled: mobileCtaMode === 'reserve' ? true : reservationsEnabled,
      mobileCtaMode,
      reservationUrl: null,
      reservationTimeSlots: [] as string[],
      reservationPartySizes: [] as number[],
      servicesHighlight: servicesHighlight.trim() || null,
      ...(existingId
        ? {}
        : {
            menuCategories: [],
            menuItems: [],
          }),
    };

    if (existingId) {
      const res = await updateBusinessListing(existingId, payload);
      setSubmitting(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setImages([]);
      setExistingImageUrls(imageUrls);
      setSaveNotice('Profili i biznesit u përditësua.');
      setSuccess(true);
      onSuccess?.();
      return;
    }

    const res = await createBusinessListing(payload);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    rememberLocation({ cityId });
    if (res.id && (wantsPremium || boostKindRef.current === 'premium')) {
      const boost = await activatePremiumAfterCreate({
        mode: premiumPayRef.current,
        kind: 'businesses',
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
    setImages([]);
    setExistingImageUrls(imageUrls);
    setCreatedPending(true);
    setSuccess(true);
    onSuccess?.();
  };

  if (checkingExisting) {
    return (
      <Typography color="text.secondary" sx={{ py: 2 }}>
        Duke ngarkuar profilin e biznesit…
      </Typography>
    );
  }

  if (!canPostBusiness) {
    return <BusinessAccountRequiredNotice />;
  }

  return (
    <Box component="form" ref={formRef} onSubmit={(e) => void handleSubmit(e)}>
      <Stack spacing={2.25}>
        {saveNotice ? (
          <Alert severity="success" sx={{ borderRadius: 2 }} onClose={() => setSaveNotice(null)}>
            {saveNotice}
          </Alert>
        ) : null}
        {createdPending ? <ListingSubmittedPendingAlert /> : null}
        {existingId && !createdPending ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Po përditësoni profilin ekzistues të biznesit — shtoni, ndryshoni ose fshini kategoritë dhe artikujt e menusë.
          </Alert>
        ) : null}

        <ListingFormSection
          icon={<StorefrontIcon size={20} weight="duotone" />}
          title="Informacioni bazë"
        >
          <ListingTextField
            label="Emri i biznesit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          <ListingImagePicker
            value={images}
            onChange={setImages}
            existingUrls={existingImageUrls}
            onExistingUrlsChange={setExistingImageUrls}
            max={MAX_BUSINESS_IMAGES}
            label="Foto"
            disabled={submitting}
          />
          <SearchableSelect
            label="Kategoria"
            value={category}
            onChange={setCategory}
            options={BUSINESS_CATEGORY_OPTIONS}
            emptyLabel="Zgjidhni kategorinë…"
            clearable
            allowCustom
          />
          <SearchableSelect
            label="Qyteti"
            value={cityId}
            onChange={(v) => {
              setCityId(v);
              setZoneId('');
            }}
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            emptyLabel="Zgjidhni qytetin… (opsionale)"
            clearable
          />
          {zones.length > 0 ? (
            <SearchableSelect
              label="Lagja / zona"
              value={zoneId}
              onChange={setZoneId}
              options={zones.map((z) => ({ value: z.id, label: z.name }))}
              emptyLabel="Zgjidhni lagjen…"
              clearable
            />
          ) : null}
          <ListingMapsLocationFields
            value={{ mapsUrl, locationLat, locationLng, locationAddress }}
            onChange={(next) => {
              setMapsUrl(next.mapsUrl);
              setLocationLat(next.locationLat);
              setLocationLng(next.locationLng);
              setLocationAddress(next.locationAddress);
            }}
            cityName={cities.find((c) => c.id === cityId)?.name}
            zoneName={zones.find((z) => z.id === zoneId)?.name}
            showPreview
            disabled={submitting}
          />
          <ListingDescriptionField
            label="Përshkrimi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            minRows={3}
          />
          <ListingTextField
            label="Çfarë ofron (opsionale)"
            value={servicesHighlight}
            onChange={(e) => setServicesHighlight(e.target.value)}
            fullWidth
            placeholder="p.sh. Brunch · Terracë · Muzikë live"
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
        </ListingFormSection>

        <ListingFormSection
          icon={<ClockIcon size={20} weight="duotone" />}
          title="Orari i hapjes"
        >
          <Stack spacing={1}>
            {weeklyHours.map((row, index) => (
              <Box
                key={row.dayOfWeek}
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between', mb: row.closed ? 0 : 1.25 }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', minWidth: 28 }}>
                    {BUSINESS_DAY_LABELS[row.dayOfWeek]}
                  </Typography>
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={row.closed}
                        onChange={(e) => {
                          const next = [...weeklyHours];
                          next[index] = { ...row, closed: e.target.checked };
                          setWeeklyHours(next);
                        }}
                      />
                    }
                    label={<Typography variant="body2">Mbyllur</Typography>}
                  />
                </Stack>
                {row.closed ? null : (
                  <Stack direction="row" spacing={1}>
                    <ListingTextField
                      size="small"
                      label="Hapet"
                      value={row.open}
                      onChange={(e) => {
                        const next = [...weeklyHours];
                        next[index] = { ...row, open: e.target.value };
                        setWeeklyHours(next);
                      }}
                      placeholder="09:00"
                      fullWidth
                    />
                    <ListingTextField
                      size="small"
                      label="Mbyllet"
                      value={row.close}
                      onChange={(e) => {
                        const next = [...weeklyHours];
                        next[index] = { ...row, close: e.target.value };
                        setWeeklyHours(next);
                      }}
                      placeholder="22:00"
                      fullWidth
                    />
                  </Stack>
                )}
              </Box>
            ))}
          </Stack>
        </ListingFormSection>

        <ListingFormSection
          icon={<CalendarCheckIcon size={20} weight="duotone" />}
          title="Butoni kryesor & rezervime"
        >
          <BusinessMobileCtaPicker
            value={mobileCtaMode}
            onChange={(mode) => {
              setMobileCtaMode(mode);
              setReservationsEnabled((prev) => reservationsEnabledForMobileCta(mode, prev));
            }}
          />
          {mobileCtaMode !== 'reserve' ? (
            <FormGroup sx={{ mt: 1.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={reservationsEnabled}
                    onChange={(e) => setReservationsEnabled(e.target.checked)}
                  />
                }
                label="Aktivizo formularin e rezervimit në faqe"
              />
            </FormGroup>
          ) : null}
        </ListingFormSection>

        <Stack spacing={1.25}>
          <ListingFormActionError error={error} />
          {wantsPremium && !existingId ? (
            <PremiumPostActions
              submitting={submitting}
              disabled={!user}
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
                  disabled={!user}
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
                submitLabel={existingId ? 'Ruaj ndryshimet' : 'Publiko biznesin'}
                submitting={submitting}
                disabled={!user}
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

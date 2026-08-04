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
  DEFAULT_RESERVATION_PARTY_SIZES,
  DEFAULT_RESERVATION_TIME_SLOTS,
  defaultWeeklyHours,
  type WeeklyHourRow,
} from '@/lib/business-constants';
import {
  createBusinessListing,
  listMyBusinessListings,
  updateBusinessListing,
  type BusinessMineListing,
} from '@/lib/directory-listings-client';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { ListingSubmittedPendingAlert } from '@/components/user/listing-moderation-notice';
import { ListingImagePicker } from '@/components/common/listing-image-picker';
import {
  ListingFormActions,
  ListingFormSection,
  ListingTextField,
} from '@/components/user/listing-form-ui';
import { BusinessAccountRequiredNotice } from '@/components/user/business-account-required-notice';
import { uploadListingImages } from '@/lib/uploads-client';
import { isBusinessPortalAccount } from '@/lib/user-portal-account-label';
import {
  businessCategoryFromUser,
  businessTitleFromUser,
  profileDefaultsFromStorage,
  resolveContactPhone,
} from '@/lib/listing-form-defaults';
import { useUser } from '@/hooks/use-user';

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
  const { user } = useUser();
  const canPostBusiness = isBusinessPortalAccount(user);
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkingExisting, setCheckingExisting] = React.useState(true);
  const [existingId, setExistingId] = React.useState<string | null>(null);
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
  const [cityId, setCityId] = React.useState(() => String(aiPrefill?.cityId ?? ''));
  const [contactPhone, setContactPhone] = React.useState(() => {
    const fromAi = String(aiPrefill?.contactPhone ?? '').trim();
    if (fromAi) return fromAi;
    return profileDefaultsFromStorage().phone;
  });
  const [servicesHighlight, setServicesHighlight] = React.useState(() =>
    String(aiPrefill?.servicesHighlight ?? ''),
  );
  const [images, setImages] = React.useState<File[]>([]);
  const [weeklyHours, setWeeklyHours] = React.useState<WeeklyHourRow[]>(defaultWeeklyHours);
  const [reservationsEnabled, setReservationsEnabled] = React.useState(false);
  const [reservationUrl, setReservationUrl] = React.useState('');
  const [timeSlotsText, setTimeSlotsText] = React.useState(DEFAULT_RESERVATION_TIME_SLOTS.join(', '));
  const [partySizesText, setPartySizesText] = React.useState(DEFAULT_RESERVATION_PARTY_SIZES.join(', '));

  const applyExistingListing = React.useCallback((listing: BusinessMineListing) => {
    setExistingId(listing.id);
    setTitle(listing.title ?? '');
    setDescription(listing.description ?? '');
    setCategory(listing.category ?? '');
    setCityId(listing.cityId ?? '');
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
    setReservationsEnabled(Boolean(listing.reservationsEnabled));
    setReservationUrl(listing.reservationUrl ?? '');
    setTimeSlotsText(
      (listing.reservationTimeSlots?.length ? listing.reservationTimeSlots : DEFAULT_RESERVATION_TIME_SLOTS).join(
        ', ',
      ),
    );
    setPartySizesText(
      (listing.reservationPartySizes?.length ? listing.reservationPartySizes : DEFAULT_RESERVATION_PARTY_SIZES).join(
        ', ',
      ),
    );
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
    void listMyBusinessListings().then((res) => {
      if (cancelled) return;
      const first = res.listings?.[0];
      if (first) applyExistingListing(first);
      else setExistingId(null);
      setCheckingExisting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [canPostBusiness, applyExistingListing]);

  // Prefill empty create fields from signup/profile.
  React.useEffect(() => {
    if (!canPostBusiness || checkingExisting || existingId) return;
    const phone = resolveContactPhone(user);
    if (phone) setContactPhone((prev) => (prev.trim() ? prev : phone));
    const name = businessTitleFromUser(user);
    if (name) setTitle((prev) => (prev.trim() ? prev : name));
    const cat = businessCategoryFromUser(user);
    if (cat) setCategory((prev) => (prev.trim() ? prev : cat));
  }, [user, canPostBusiness, checkingExisting, existingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveNotice(null);
    if (!canPostBusiness) {
      setError('Krijoni një llogari biznesi për të kryer këtë veprim.');
      return;
    }
    if (!title.trim() || !description.trim() || !category || !cityId) {
      setError('Plotësoni fushat e detyrueshme.');
      return;
    }

    const reservationTimeSlots = timeSlotsText
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d{1,2}:\d{2}$/.test(s));

    const reservationPartySizes = partySizesText
      .split(/[,;\s]+/)
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n >= 1);

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
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      cityId,
      contactPhone: contactPhone.trim(),
      imageUrls,
      weeklyHours,
      reservationsEnabled,
      reservationUrl: reservationUrl.trim() || null,
      reservationTimeSlots,
      reservationPartySizes,
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
    <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
      <Stack spacing={2.25}>
        {error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}
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
          description="Emri, kategoria dhe të dhënat që shfaqen në profil."
        >
          <ListingTextField
            label="Emri i biznesit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          <SearchableSelect
            label="Kategoria"
            value={category}
            onChange={setCategory}
            options={BUSINESS_CATEGORY_OPTIONS}
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
          <ListingImagePicker
            value={images}
            onChange={setImages}
            existingUrls={existingImageUrls}
            onExistingUrlsChange={setExistingImageUrls}
            max={MAX_BUSINESS_IMAGES}
            label="Foto të biznesit"
            disabled={submitting}
          />
        </ListingFormSection>

        <ListingFormSection
          icon={<ClockIcon size={20} weight="duotone" />}
          title="Orari i hapjes"
          description="Vendosni orarin javor që klientët të dinë kur jeni hapur."
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
          title="Rezervime"
          description="Klientët plotësojnë fushat e rezervimit dhe kërkesa ju vjen si mesazh në bisedë."
        >
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={reservationsEnabled}
                  onChange={(e) => setReservationsEnabled(e.target.checked)}
                />
              }
              label="Aktivizo rezervimet (përmes mesazheve)"
            />
          </FormGroup>
          {reservationsEnabled ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Kur dikush rezervon, hapet një bisedë me të dhënat: emri, telefoni, data, ora dhe numri i mysafirëve.
              </Typography>
              <ListingTextField
                label="Ora e disponueshme (ndarë me presje)"
                value={timeSlotsText}
                onChange={(e) => setTimeSlotsText(e.target.value)}
                fullWidth
                helperText="p.sh. 18:00, 19:00, 20:00, 21:00"
              />
              <ListingTextField
                label="Numri i mysafirëve (ndarë me presje)"
                value={partySizesText}
                onChange={(e) => setPartySizesText(e.target.value)}
                fullWidth
                helperText="p.sh. 2, 4, 6, 8"
              />
            </>
          ) : null}
          <ListingTextField
            label="Link rezervimi i jashtëm (opsionale)"
            value={reservationUrl}
            onChange={(e) => setReservationUrl(e.target.value)}
            fullWidth
            helperText="Nëse e plotësoni, klientët dërgohen te ky link në vend të mesazheve."
          />
        </ListingFormSection>

        <ListingFormActions
          submitLabel={existingId ? 'Ruaj ndryshimet' : 'Publiko biznesin'}
          submitting={submitting}
          disabled={!user}
          backHref={backHref}
          backLabel={backLabel}
        />
      </Stack>
    </Box>
  );
}

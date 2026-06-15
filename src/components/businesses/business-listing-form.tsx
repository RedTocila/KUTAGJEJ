'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';

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
  type BusinessMenuCategory,
  type BusinessMenuItem,
} from '@/lib/directory-listings-client';
import { listRealEstateLocationsPublic, type RealEstateCityDto } from '@/lib/real-estate-locations-client';
import { useUser } from '@/hooks/use-user';

function contactPhoneInitialFromStorage(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem('user-data');
    if (!raw) return '';
    const u = JSON.parse(raw) as { phone?: string };
    return typeof u.phone === 'string' ? u.phone.trim() : '';
  } catch {
    return '';
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface BusinessListingFormProps {
  onSuccess?: () => void;
  backHref?: string;
  backLabel?: string;
}

export function BusinessListingForm({ onSuccess, backHref, backLabel }: BusinessListingFormProps) {
  const { user } = useUser();
  const [cities, setCities] = React.useState<RealEstateCityDto[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [cityId, setCityId] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [servicesHighlight, setServicesHighlight] = React.useState('');
  const [imageUrlsText, setImageUrlsText] = React.useState('');
  const [weeklyHours, setWeeklyHours] = React.useState<WeeklyHourRow[]>(defaultWeeklyHours);
  const [menuCategories, setMenuCategories] = React.useState<BusinessMenuCategory[]>([]);
  const [menuItems, setMenuItems] = React.useState<BusinessMenuItem[]>([]);
  const [reservationsEnabled, setReservationsEnabled] = React.useState(false);
  const [reservationUrl, setReservationUrl] = React.useState('');
  const [timeSlotsText, setTimeSlotsText] = React.useState(DEFAULT_RESERVATION_TIME_SLOTS.join(', '));
  const [partySizesText, setPartySizesText] = React.useState(DEFAULT_RESERVATION_PARTY_SIZES.join(', '));

  React.useEffect(() => {
    setContactPhone(contactPhoneInitialFromStorage());
    void listRealEstateLocationsPublic().then((res) => {
      if (res.cities) setCities(res.cities);
    });
  }, []);

  const addCategory = () => {
    const id = newId();
    setMenuCategories((prev) => [...prev, { id, name: '', sortOrder: prev.length }]);
  };

  const addMenuItem = (categoryId: string) => {
    setMenuItems((prev) => [
      ...prev,
      {
        id: newId(),
        categoryId,
        name: '',
        description: '',
        price: 0,
        currency: 'EUR',
        imageUrl: null,
        sortOrder: prev.length,
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !description.trim() || !category || !cityId) {
      setError('Plotësoni fushat e detyrueshme.');
      return;
    }
    const cats = menuCategories
      .map((c, i) => ({ ...c, name: c.name.trim(), sortOrder: i }))
      .filter((c) => c.name);
    const items = menuItems
      .filter((item) => item.name.trim() && cats.some((c) => c.id === item.categoryId))
      .map((item, i) => ({
        ...item,
        name: item.name.trim(),
        description: item.description.trim(),
        price: Number(item.price) || 0,
        sortOrder: i,
      }));

    const imageUrls = imageUrlsText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const reservationTimeSlots = timeSlotsText
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(/^\d{1,2}:\d{2}$/.test);

    const reservationPartySizes = partySizesText
      .split(/[,;\s]+/)
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n >= 1);

    setSubmitting(true);
    const res = await createBusinessListing({
      title: title.trim(),
      description: description.trim(),
      category,
      cityId,
      contactPhone: contactPhone.trim(),
      imageUrls,
      weeklyHours,
      menuCategories: cats,
      menuItems: items,
      reservationsEnabled,
      reservationUrl: reservationUrl.trim() || null,
      reservationTimeSlots,
      reservationPartySizes,
      servicesHighlight: servicesHighlight.trim() || null,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onSuccess?.();
  };

  return (
    <Box component="form" onSubmit={(e) => void handleSubmit(e)}>
      <Stack spacing={3}>
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Informacioni bazë
          </Typography>
          <TextField label="Emri i biznesit" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
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
          <TextField
            label="Përshkrimi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            fullWidth
            multiline
            minRows={3}
          />
          <TextField
            label="Çfarë ofron (opsionale)"
            value={servicesHighlight}
            onChange={(e) => setServicesHighlight(e.target.value)}
            fullWidth
            placeholder="p.sh. Brunch · Terracë · Muzikë live"
          />
          <TextField label="Telefon" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required fullWidth />
          <TextField
            label="URL fotosh (një për rresht ose ndarë me presje)"
            value={imageUrlsText}
            onChange={(e) => setImageUrlsText(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>

        <Divider />

        <Stack spacing={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Orari i hapjes
          </Typography>
          {weeklyHours.map((row, index) => (
            <Stack key={row.dayOfWeek} direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ width: 36, fontWeight: 600 }}>{BUSINESS_DAY_LABELS[row.dayOfWeek]}</Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={row.closed}
                    onChange={(e) => {
                      const next = [...weeklyHours];
                      next[index] = { ...row, closed: e.target.checked };
                      setWeeklyHours(next);
                    }}
                  />
                }
                label="Mbyllur"
              />
              <TextField
                size="small"
                label="Hapet"
                value={row.open}
                disabled={row.closed}
                onChange={(e) => {
                  const next = [...weeklyHours];
                  next[index] = { ...row, open: e.target.value };
                  setWeeklyHours(next);
                }}
                sx={{ width: 100 }}
                placeholder="09:00"
              />
              <TextField
                size="small"
                label="Mbyllet"
                value={row.close}
                disabled={row.closed}
                onChange={(e) => {
                  const next = [...weeklyHours];
                  next[index] = { ...row, close: e.target.value };
                  setWeeklyHours(next);
                }}
                sx={{ width: 100 }}
                placeholder="22:00"
              />
            </Stack>
          ))}
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Menu
            </Typography>
            <Button size="small" startIcon={<PlusIcon size={16} />} onClick={addCategory}>
              Kategori
            </Button>
          </Stack>
          {menuCategories.map((cat, ci) => (
            <Box key={cat.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <TextField
                  size="small"
                  label="Emri i kategorisë"
                  value={cat.name}
                  onChange={(e) => {
                    const next = [...menuCategories];
                    next[ci] = { ...cat, name: e.target.value };
                    setMenuCategories(next);
                  }}
                  fullWidth
                />
                <IconButton
                  color="error"
                  aria-label="Fshi kategorinë"
                  onClick={() => {
                    setMenuCategories((prev) => prev.filter((c) => c.id !== cat.id));
                    setMenuItems((prev) => prev.filter((i) => i.categoryId !== cat.id));
                  }}
                >
                  <TrashIcon size={18} />
                </IconButton>
              </Stack>
              {menuItems
                .filter((item) => item.categoryId === cat.id)
                .map((item) => {
                  const ii = menuItems.indexOf(item);
                  return (
                    <Stack key={item.id} spacing={1} sx={{ mb: 1.5, pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
                      <TextField size="small" label="Artikulli" value={item.name} onChange={(e) => {
                        const next = [...menuItems];
                        next[ii] = { ...item, name: e.target.value };
                        setMenuItems(next);
                      }} />
                      <TextField size="small" label="Përshkrimi" value={item.description} onChange={(e) => {
                        const next = [...menuItems];
                        next[ii] = { ...item, description: e.target.value };
                        setMenuItems(next);
                      }} />
                      <Stack direction="row" spacing={1}>
                        <TextField
                          size="small"
                          label="Çmimi"
                          type="number"
                          value={item.price || ''}
                          onChange={(e) => {
                            const next = [...menuItems];
                            next[ii] = { ...item, price: Number(e.target.value) || 0 };
                            setMenuItems(next);
                          }}
                          sx={{ flex: 1 }}
                        />
                        <SearchableSelect
                          label="Mon."
                          value={item.currency}
                          onChange={(v) => {
                            const next = [...menuItems];
                            next[ii] = { ...item, currency: v as 'EUR' | 'LEK' };
                            setMenuItems(next);
                          }}
                          options={[
                            { value: 'EUR', label: 'EUR' },
                            { value: 'LEK', label: 'LEK' },
                          ]}
                          emptyLabel="—"
                          sx={{ minWidth: 90, flex: '0 0 auto' }}
                        />
                      </Stack>
                      <TextField
                        size="small"
                        label="URL foto"
                        value={item.imageUrl ?? ''}
                        onChange={(e) => {
                          const next = [...menuItems];
                          next[ii] = { ...item, imageUrl: e.target.value.trim() || null };
                          setMenuItems(next);
                        }}
                      />
                      <Button
                        size="small"
                        color="error"
                        startIcon={<TrashIcon size={14} />}
                        onClick={() => setMenuItems((prev) => prev.filter((i) => i.id !== item.id))}
                      >
                        Hiq artikullin
                      </Button>
                    </Stack>
                  );
                })}
              <Button size="small" onClick={() => addMenuItem(cat.id)}>
                + Artikull
              </Button>
            </Box>
          ))}
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Rezervime
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox checked={reservationsEnabled} onChange={(e) => setReservationsEnabled(e.target.checked)} />
              }
              label="Aktivizo rezervimet në platformë"
            />
          </FormGroup>
          {reservationsEnabled ? (
            <>
              <TextField
                label="Ora (ndarë me presje)"
                value={timeSlotsText}
                onChange={(e) => setTimeSlotsText(e.target.value)}
                fullWidth
              />
              <TextField
                label="Numri i mysafirëve (ndarë me presje)"
                value={partySizesText}
                onChange={(e) => setPartySizesText(e.target.value)}
                fullWidth
              />
            </>
          ) : null}
          <TextField
            label="Link rezervimi i jashtëm (opsionale)"
            value={reservationUrl}
            onChange={(e) => setReservationUrl(e.target.value)}
            fullWidth
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          {backHref ? (
            <Button component={RouterLink} href={backHref} color="inherit">
              {backLabel ?? 'Kthehu'}
            </Button>
          ) : null}
          <Button type="submit" variant="contained" disabled={submitting || !user}>
            {submitting ? 'Duke ruajtur…' : 'Publiko biznesin'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

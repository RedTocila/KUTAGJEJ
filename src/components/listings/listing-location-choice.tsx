'use client';

import * as React from 'react';
import { Stack, Typography } from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { MapTrifold as MapTrifoldIcon } from '@phosphor-icons/react/dist/ssr/MapTrifold';

import { SearchableSelect } from '@/components/core/searchable-select';
import {
  ListingMapsLocationFields,
  type ListingMapsLocationValue,
} from '@/components/listings/listing-maps-location-fields';
import { ListingToggle } from '@/components/user/listing-form-ui';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';

export type ListingLocationMode = 'city' | 'map';

export type ListingLocationChoiceLabels = {
  modeLabel?: string;
  cityMode?: string;
  mapMode?: string;
  helper?: string;
  cityLabel?: string;
  zoneLabel?: string;
  cityEmpty?: string;
  zoneEmpty?: string;
  noCities?: string;
  mapsLabel?: string;
  mapsPlaceholder?: string;
  mapsHelper?: string;
  openMapsAria?: string;
};

export function inferListingLocationMode(
  cityId?: string | null,
  mapsUrl?: string | null,
): ListingLocationMode | '' {
  if (String(mapsUrl ?? '').trim()) return 'map';
  if (String(cityId ?? '').trim()) return 'city';
  return '';
}

export function exclusiveLocationPayload(
  mode: ListingLocationMode | '',
  fields: {
    cityId?: string | null;
    zoneId?: string | null;
    mapsUrl?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    locationAddress?: string | null;
  },
) {
  if (mode === 'map') {
    return {
      cityId: null as string | null,
      zoneId: null as string | null,
      mapsUrl: String(fields.mapsUrl ?? '').trim() || null,
      locationLat: fields.locationLat ?? null,
      locationLng: fields.locationLng ?? null,
      locationAddress: fields.locationAddress ?? null,
    };
  }
  if (mode === 'city') {
    return {
      cityId: String(fields.cityId ?? '').trim() || null,
      zoneId: String(fields.zoneId ?? '').trim() || null,
      mapsUrl: null as string | null,
      locationLat: null as number | null,
      locationLng: null as number | null,
      locationAddress: null as string | null,
    };
  }
  return {
    cityId: null as string | null,
    zoneId: null as string | null,
    mapsUrl: null as string | null,
    locationLat: null as number | null,
    locationLng: null as number | null,
    locationAddress: null as string | null,
  };
}

const EMPTY_MAPS: ListingMapsLocationValue = {
  mapsUrl: '',
  locationLat: null,
  locationLng: null,
  locationAddress: null,
};

export function ListingLocationChoice({
  mode,
  onModeChange,
  cityId,
  onCityIdChange,
  zoneId,
  onZoneIdChange,
  cities,
  maps,
  onMapsChange,
  showZone = false,
  disabled = false,
  loadingCities = false,
  showPreview = true,
  cityError,
  cityHelperText,
  labels,
}: {
  mode: ListingLocationMode | '';
  onModeChange: (mode: ListingLocationMode) => void;
  cityId: string;
  onCityIdChange: (cityId: string) => void;
  zoneId?: string;
  onZoneIdChange?: (zoneId: string) => void;
  cities: RealEstateCityDto[];
  maps: ListingMapsLocationValue;
  onMapsChange: (next: ListingMapsLocationValue) => void;
  showZone?: boolean;
  disabled?: boolean;
  loadingCities?: boolean;
  showPreview?: boolean;
  cityError?: boolean;
  cityHelperText?: string;
  labels?: ListingLocationChoiceLabels;
}) {
  const cityStash = React.useRef(cityId);
  const zoneStash = React.useRef(zoneId ?? '');
  const mapsStash = React.useRef(maps);

  React.useEffect(() => {
    if (mode === 'city') {
      cityStash.current = cityId;
      zoneStash.current = zoneId ?? '';
    }
    if (mode === 'map') {
      mapsStash.current = maps;
    }
  }, [mode, cityId, zoneId, maps]);

  const zones = React.useMemo(
    () => cities.find((c) => c.id === cityId)?.zones ?? [],
    [cities, cityId],
  );
  const cityName = cities.find((c) => c.id === cityId)?.name;
  const zoneName = zones.find((z) => z.id === zoneId)?.name;

  const cityModeLabel = labels?.cityMode ?? (showZone ? 'Qyteti dhe zona' : 'Qyteti');
  const mapModeLabel = labels?.mapMode ?? 'Në hartë';
  const helper =
    labels?.helper ??
    (showZone
      ? 'Zgjidhni qytetin dhe zonën, ose vendoseni vendndodhjen me një link të Google Maps.'
      : 'Zgjidhni qytetin, ose vendoseni vendndodhjen me një link të Google Maps.');

  const handleModeChange = (next: string) => {
    const nextMode = next === 'map' ? 'map' : 'city';
    if (nextMode === mode) return;
    if (nextMode === 'map') {
      cityStash.current = cityId;
      zoneStash.current = zoneId ?? '';
      onCityIdChange('');
      onZoneIdChange?.('');
      if (mapsStash.current.mapsUrl) onMapsChange(mapsStash.current);
    } else {
      mapsStash.current = maps;
      onMapsChange(EMPTY_MAPS);
      if (cityStash.current) onCityIdChange(cityStash.current);
      if (onZoneIdChange && zoneStash.current) onZoneIdChange(zoneStash.current);
    }
    onModeChange(nextMode);
  };

  return (
    <Stack spacing={1.75} sx={{ width: '100%', minWidth: 0 }}>
      <ListingToggle
        label={labels?.modeLabel ?? 'Vendndodhja'}
        value={mode}
        onChange={handleModeChange}
        options={[
          { value: 'city', label: cityModeLabel, Icon: MapPinIcon },
          { value: 'map', label: mapModeLabel, Icon: MapTrifoldIcon },
        ]}
        helperText={helper}
        disabled={disabled}
      />

      {mode === 'city' ? (
        <Stack spacing={1.75}>
          <Stack direction={{ xs: 'column', sm: showZone ? 'row' : 'column' }} spacing={2}>
            <SearchableSelect
              label={labels?.cityLabel ?? 'Qyteti'}
              value={cityId}
              onChange={(v) => {
                onCityIdChange(v);
                if (showZone) onZoneIdChange?.('');
              }}
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
              emptyLabel={labels?.cityEmpty ?? 'Zgjidhni qytetin… (opsionale)'}
              clearable
              disabled={disabled || loadingCities || cities.length === 0}
              error={cityError}
              helperText={cityHelperText}
            />
            {showZone ? (
              <SearchableSelect
                label={labels?.zoneLabel ?? 'Zona'}
                value={zoneId ?? ''}
                onChange={(v) => onZoneIdChange?.(v)}
                options={zones.map((z) => ({ value: z.id, label: z.name }))}
                emptyLabel={labels?.zoneEmpty ?? 'Zgjidhni zonën… (opsionale)'}
                clearable
                disabled={disabled || loadingCities || !cityId || zones.length === 0}
              />
            ) : null}
          </Stack>
          {!loadingCities && cities.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              {labels?.noCities ??
                'Nuk ka qytete të disponueshme — një administrator duhet t’i shtojë te Paneli → Vendndodhjet.'}
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      {mode === 'map' ? (
        <ListingMapsLocationFields
          value={maps}
          onChange={onMapsChange}
          cityName={cityName}
          zoneName={zoneName}
          showPreview={showPreview}
          disabled={disabled}
          label={labels?.mapsLabel}
          placeholder={labels?.mapsPlaceholder}
          idleHelperText={labels?.mapsHelper}
          openMapsAriaLabel={labels?.openMapsAria}
        />
      ) : null}
    </Stack>
  );
}

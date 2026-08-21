'use client';

import * as React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { LocationMapEmbed } from '@/components/public/location-map-embed';
import { ListingTextField } from '@/components/user/listing-form-ui';
import {
  businessLocationLine,
  businessMapLocation,
} from '@/lib/google-maps-location';
import { resolveListingMapsUrl } from '@/lib/listing-maps-client';

export type ListingMapsLocationValue = {
  mapsUrl: string;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress: string | null;
};

export function ListingMapsLocationFields({
  value,
  onChange,
  cityName,
  zoneName,
  disabled,
  showPreview = true,
}: {
  value: ListingMapsLocationValue;
  onChange: (next: ListingMapsLocationValue) => void;
  cityName?: string | null;
  zoneName?: string | null;
  disabled?: boolean;
  /** Live map + name preview under the field (create / build mode). */
  showPreview?: boolean;
}) {
  const [resolving, setResolving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const locationLine = businessLocationLine({
    locationAddress: value.locationAddress,
    zoneName,
    cityName,
  });
  const mapLocation = businessMapLocation({
    locationLat: value.locationLat,
    locationLng: value.locationLng,
    mapsUrl: value.mapsUrl,
    zoneName,
    cityName,
  });

  const resolveNow = React.useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setError(null);
        onChange({
          mapsUrl: '',
          locationLat: null,
          locationLng: null,
          locationAddress: null,
        });
        return;
      }
      setResolving(true);
      setError(null);
      try {
        const res = await resolveListingMapsUrl(trimmed);
        if (res.error) {
          setError(res.error);
          onChange({
            mapsUrl: trimmed,
            locationLat: null,
            locationLng: null,
            locationAddress: null,
          });
          return;
        }
        onChange({
          mapsUrl: res.mapsUrl || trimmed,
          locationLat: res.locationLat,
          locationLng: res.locationLng,
          locationAddress: res.locationAddress,
        });
      } finally {
        setResolving(false);
      }
    },
    [onChange],
  );

  return (
    <Stack
      spacing={1.25}
      sx={{ width: '100%', maxWidth: '100%', minWidth: 0, clear: 'both', display: 'flex', flexDirection: 'column' }}
    >
      {showPreview && locationLine ? (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
          <MapPinIcon size={16} weight="regular" />
          <Typography sx={{ fontSize: '0.8rem', overflowWrap: 'anywhere' }}>{locationLine}</Typography>
        </Stack>
      ) : null}
      {showPreview && mapLocation ? (
        <Box sx={{ width: '100%', minWidth: 0 }}>
          <LocationMapEmbed query={mapLocation.query} lat={mapLocation.lat} lng={mapLocation.lng} />
        </Box>
      ) : null}
      <ListingTextField
        label="Linku i Google Maps (opsionale)"
        value={value.mapsUrl}
        onChange={(e) =>
          onChange({
            ...value,
            mapsUrl: e.target.value,
          })
        }
        onBlur={() => void resolveNow(value.mapsUrl)}
        fullWidth
        disabled={disabled || resolving}
        placeholder="https://maps.app.goo.gl/… ose maps.google.com/…"
        helperText={
          error ||
          (resolving
            ? 'Duke lexuar vendndodhjen…'
            : 'Ngjitni linkun e vendndodhjes nga Google Maps për pin dhe emër rruge.')
        }
        error={Boolean(error)}
      />
    </Stack>
  );
}

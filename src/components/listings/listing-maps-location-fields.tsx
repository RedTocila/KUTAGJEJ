'use client';

import * as React from 'react';
import { IconButton, InputAdornment } from '@mui/material';
import { ArrowSquareOut as ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';

import { ListingTextField } from '@/components/user/listing-form-ui';
import { googleMapsOpenHref } from '@/lib/google-maps-location';
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
  disabled,
  label = 'Linku i Google Maps',
  placeholder = 'https://maps.app.goo.gl/… ose maps.google.com/…',
  openMapsAriaLabel = 'Hap Google Maps',
}: {
  value: ListingMapsLocationValue;
  onChange: (next: ListingMapsLocationValue) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  openMapsAriaLabel?: string;
}) {
  const [resolving, setResolving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
    <ListingTextField
      label={label}
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
      placeholder={placeholder}
      helperText={error || (resolving ? 'Duke lexuar vendndodhjen…' : undefined)}
      error={Boolean(error)}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                component="a"
                href={googleMapsOpenHref(value.mapsUrl)}
                target="_blank"
                rel="noopener noreferrer"
                edge="end"
                aria-label={openMapsAriaLabel}
                disabled={disabled || resolving}
                onClick={(event) => {
                  if (disabled || resolving) event.preventDefault();
                }}
              >
                <ArrowSquareOutIcon size={18} weight="bold" />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

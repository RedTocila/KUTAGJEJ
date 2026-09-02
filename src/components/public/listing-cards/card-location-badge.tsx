import { Stack, Typography } from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { formatCityAbbreviation } from '@/lib/location-display';

export function CardLocationBadge({
  cityName,
  iconSize = 12,
  fontSize = '0.7rem',
}: {
  cityName: string | null | undefined;
  iconSize?: number;
  fontSize?: string;
}) {
  if (!cityName?.trim()) return null;

  return (
    <Stack
      direction="row"
      spacing={0.35}
      sx={{ alignItems: 'center', color: 'text.disabled', flexShrink: 0 }}
      title={cityName.trim()}
    >
      <MapPinIcon size={iconSize} weight="regular" />
      <Typography variant="caption" color="text.disabled" sx={{ fontSize, fontWeight: 600, letterSpacing: '0.02em' }}>
        {formatCityAbbreviation(cityName)}
      </Typography>
    </Stack>
  );
}

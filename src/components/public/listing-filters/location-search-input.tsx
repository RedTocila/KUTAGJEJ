'use client';

import * as React from 'react';
import {
  Box,
  Checkbox,
  ClickAwayListener,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  TextField,
  Typography,
} from '@mui/material';
import { MagnifyingGlass as SearchIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { MapPinArea as MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr/MapPinArea';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { cleanLocationPart } from '@/lib/location-display';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';

const pillSx = {
  borderRadius: 999,
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'background.paper',
} as const;

const chipSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.25,
  flexShrink: 0,
  height: 22,
  pl: 0.85,
  pr: 0.25,
  borderRadius: 999,
  bgcolor: primaryMainAlpha(0.12),
  color: 'primary.main',
  border: '1px solid',
  borderColor: primaryMainAlpha(0.28),
} as const;

const chipsScrollerSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  flex: 1,
  minWidth: 0,
  overflowX: 'auto',
  overflowY: 'hidden',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
  maskImage: 'linear-gradient(to right, black 0, black calc(100% - 12px), transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to right, black 0, black calc(100% - 12px), transparent 100%)',
} as const;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function LocationChip({
  label,
  onRemove,
  ariaLabel,
  maxLabelWidth = 88,
}: {
  label: string;
  onRemove?: () => void;
  ariaLabel: string;
  maxLabelWidth?: number;
}) {
  return (
    <Box sx={chipSx}>
      <Typography noWrap sx={{ fontSize: '0.72rem', fontWeight: 700, maxWidth: maxLabelWidth }}>
        {label}
      </Typography>
      {onRemove ? (
        <IconButton
          size="small"
          aria-label={ariaLabel}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          sx={{ p: 0.2, color: 'primary.main' }}
        >
          <XIcon size={11} />
        </IconButton>
      ) : null}
    </Box>
  );
}

export function LocationSearchInput({
  cities,
  cityId,
  zoneIds = [],
  enableZones = false,
  placeholder = 'Qyteti ose zona',
  onChange,
}: {
  cities: RealEstateCityDto[];
  cityId?: string;
  zoneIds?: string[];
  enableZones?: boolean;
  placeholder?: string;
  onChange: (nextCityId?: string, nextZoneIds?: string[]) => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selectedCity = cities.find((c) => c.id === cityId) ?? null;
  const cityName = selectedCity ? cleanLocationPart(selectedCity.name) : '';
  const active = Boolean(cityId || zoneIds.length);
  const zoneMode = Boolean(enableZones && cityId);

  const cityOptions = React.useMemo(() => {
    const q = normalize(query);
    const all = cities.map((c) => ({ cityId: c.id, label: cleanLocationPart(c.name) }));
    if (!q) return all.slice(0, 10);
    return all.filter((c) => normalize(c.label).includes(q)).slice(0, 12);
  }, [cities, query]);

  const zoneOptions = React.useMemo(() => {
    if (!selectedCity) return [];
    const q = normalize(query);
    const all = selectedCity.zones.map((z) => ({
      zoneId: z.id,
      label: cleanLocationPart(z.name),
    }));
    if (!q) return all;
    return all.filter((z) => normalize(z.label).includes(q));
  }, [selectedCity, query]);

  const selectedZoneChips = React.useMemo(() => {
    if (!selectedCity) return [];
    return zoneIds
      .map((id) => {
        const zone = selectedCity.zones.find((z) => z.id === id);
        return zone ? { id, label: cleanLocationPart(zone.name) } : null;
      })
      .filter((chip): chip is { id: string; label: string } => Boolean(chip));
  }, [selectedCity, zoneIds]);

  const closeDropdown = () => setOpen(false);

  const handleSelectCity = (nextCityId: string) => {
    onChange(nextCityId, undefined);
    setQuery('');
    if (enableZones) {
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    closeDropdown();
    inputRef.current?.blur();
  };

  const handleRemoveCity = () => {
    onChange(undefined, undefined);
    setQuery('');
    closeDropdown();
  };

  const handleToggleZone = (zoneId: string) => {
    if (!cityId) return;
    const nextZones = zoneIds.includes(zoneId)
      ? zoneIds.filter((id) => id !== zoneId)
      : [...zoneIds, zoneId];
    onChange(cityId, nextZones.length ? nextZones : undefined);
    setQuery('');
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemoveZone = (zoneId: string) => {
    if (!cityId) return;
    const nextZones = zoneIds.filter((id) => id !== zoneId);
    onChange(cityId, nextZones.length ? nextZones : undefined);
  };

  const hasSelectedZones = selectedZoneChips.length > 0;
  const inputPlaceholder = zoneMode ? (hasSelectedZones ? '' : 'Zonat') : placeholder;
  const showZoneScroller = zoneMode && hasSelectedZones;
  const showInput = !cityId || zoneMode;
  const zoneInputCollapsed = zoneMode && hasSelectedZones && !query;

  return (
    <ClickAwayListener onClickAway={closeDropdown}>
      <Box
        ref={rootRef}
        sx={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          width: '100%',
          height: 32,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box
          onClick={() => {
            setOpen(true);
            if (showInput) inputRef.current?.focus();
          }}
          sx={{
            ...pillSx,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            width: '100%',
            minWidth: 0,
            height: 32,
            px: 0.75,
            py: 0.25,
            cursor: 'text',
            overflow: 'hidden',
            borderColor: active ? 'primary.main' : 'divider',
            bgcolor: active ? primaryMainAlpha(0.08) : 'background.paper',
          }}
        >
          {!cityId ? (
            <SearchIcon size={14} color="var(--mui-palette-primary-main)" style={{ flexShrink: 0 }} />
          ) : null}

          {cityId ? (
            <LocationChip
              label={cityName}
              onRemove={handleRemoveCity}
              ariaLabel="Hiq qytetin"
              maxLabelWidth={72}
            />
          ) : null}

          {showZoneScroller ? (
            <Box sx={chipsScrollerSx}>
              {selectedZoneChips.map((chip) => (
                <LocationChip
                  key={chip.id}
                  label={chip.label}
                  onRemove={() => handleRemoveZone(chip.id)}
                  ariaLabel={`Hiq ${chip.label}`}
                />
              ))}
            </Box>
          ) : null}

          {showInput ? (
            <TextField
              inputRef={inputRef}
              variant="standard"
              size="small"
              value={query}
              placeholder={inputPlaceholder}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              slotProps={{
                input: {
                  disableUnderline: true,
                  sx: {
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    py: 0,
                    '& input': {
                      padding: 0,
                      minWidth: zoneInputCollapsed ? 8 : zoneMode ? 40 : 72,
                      width: zoneInputCollapsed ? 8 : zoneMode ? 40 : undefined,
                    },
                    '& input::placeholder': {
                      opacity: 0.72,
                      fontWeight: 500,
                    },
                  },
                },
              }}
              sx={{
                flexShrink: 0,
                flex: showZoneScroller || cityId ? '0 0 auto' : 1,
                minWidth: 0,
                maxWidth: zoneInputCollapsed ? 12 : zoneMode ? 64 : 'none',
              }}
            />
          ) : null}
        </Box>

        <Popper
          open={open}
          anchorEl={rootRef.current}
          placement="bottom-start"
          sx={{ zIndex: 1400, width: Math.max(rootRef.current?.offsetWidth ?? 220, 220) }}
        >
          <Paper
            elevation={8}
            sx={{
              mt: 0.75,
              maxHeight: 280,
              overflowY: 'auto',
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {!zoneMode ? (
              <>
                {!query ? (
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', px: 1.5, pt: 1.25, pb: 0.5, color: 'text.secondary', fontWeight: 600 }}
                  >
                    Shkruaj qytetin
                  </Typography>
                ) : null}
                <List dense disablePadding>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      px: 1.5,
                      py: 0.5,
                      color: 'text.secondary',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontSize: '0.62rem',
                    }}
                  >
                    Qytete
                  </Typography>
                  {cityOptions.map((option) => (
                    <ListItemButton
                      key={option.cityId}
                      selected={cityId === option.cityId}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectCity(option.cityId)}
                      sx={{ py: 0.45, px: 1.25 }}
                    >
                      <MapPinIcon size={14} style={{ marginRight: 8, flexShrink: 0 }} />
                      <ListItemText
                        primary={option.label}
                        slotProps={{ primary: { sx: { fontSize: '0.84rem', fontWeight: 600 } } }}
                      />
                    </ListItemButton>
                  ))}
                </List>
                {query && cityOptions.length === 0 ? (
                  <Typography sx={{ px: 1.5, py: 1.5, fontSize: '0.84rem', color: 'text.secondary' }}>
                    Nuk u gjet asnjë qytet
                  </Typography>
                ) : null}
              </>
            ) : (
              <>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', px: 1.5, pt: 1.25, pb: 0.5, color: 'text.secondary', fontWeight: 600 }}
                >
                  Zgjidh zona në {cityName}
                </Typography>
                <List dense disablePadding>
                  {zoneOptions.map((option) => (
                    <ListItemButton
                      key={option.zoneId}
                      selected={zoneIds.includes(option.zoneId)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleToggleZone(option.zoneId)}
                      sx={{ py: 0.45, px: 1.25 }}
                    >
                      <Checkbox
                        size="small"
                        checked={zoneIds.includes(option.zoneId)}
                        tabIndex={-1}
                        disableRipple
                        sx={{ p: 0.5, mr: 0.75 }}
                      />
                      <MapPinAreaIcon size={14} style={{ marginRight: 8, flexShrink: 0 }} />
                      <ListItemText
                        primary={option.label}
                        slotProps={{ primary: { sx: { fontSize: '0.84rem', fontWeight: 600 } } }}
                      />
                    </ListItemButton>
                  ))}
                </List>
                {zoneOptions.length === 0 ? (
                  <Typography sx={{ px: 1.5, py: 1.5, fontSize: '0.84rem', color: 'text.secondary' }}>
                    Nuk u gjet asnjë zonë
                  </Typography>
                ) : null}
              </>
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

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
import { normalizeZoneIds } from '@/lib/listing-filters';
import { normalizeSearchText } from '@/lib/smart-search';
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

/** Accent-tolerant match so "durres" finds "Durrës", "tirana" finds "Tiranë". */
function locationMatches(label: string, query: string): boolean {
  const needle = normalizeSearchText(query);
  const hay = normalizeSearchText(label);
  if (!needle || !hay) return false;
  if (hay.includes(needle) || needle.includes(hay)) return true;

  const aliases: Record<string, string[]> = {
    tirana: ['tirane'],
    vlora: ['vlore'],
    shkodra: ['shkoder'],
    korca: ['korce'],
    saranda: ['sarande'],
    himara: ['himare'],
    kavaja: ['kavaje'],
    lushnja: ['lushnje'],
    lezha: ['lezhe'],
    durresi: ['durres'],
  };
  for (const [alias, targets] of Object.entries(aliases)) {
    if (needle === alias && targets.some((t) => hay.includes(t))) return true;
    if (targets.includes(needle) && (hay.includes(alias) || alias.includes(hay))) return true;
  }
  return false;
}

function safeLabel(value: string | null | undefined): string {
  if (value == null) return '';
  return cleanLocationPart(String(value));
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

type CityOption = { cityId: string; label: string };
type ZoneOption = { zoneId: string; label: string; cityId: string; cityName: string };

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
  zoneIds?: string[] | string;
  enableZones?: boolean;
  placeholder?: string;
  onChange: (nextCityId?: string, nextZoneIds?: string[]) => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const safeZoneIds = React.useMemo(() => normalizeZoneIds(zoneIds), [zoneIds]);
  const selectedCity = React.useMemo(
    () => cities.find((c) => c.id === cityId) ?? null,
    [cities, cityId],
  );
  const cityName = selectedCity ? safeLabel(selectedCity.name) : '';
  const cityZones = selectedCity?.zones ?? [];
  const active = Boolean(cityId || safeZoneIds.length);
  const zoneMode = Boolean(enableZones && cityId && selectedCity);

  const cityOptions = React.useMemo(() => {
    const q = query.trim();
    const all: CityOption[] = cities.map((c) => ({ cityId: c.id, label: safeLabel(c.name) }));
    if (!q) return all;
    return all.filter((c) => locationMatches(c.label, q));
  }, [cities, query]);

  const zoneOptions = React.useMemo(() => {
    if (!zoneMode) return [] as ZoneOption[];
    const q = query.trim();
    const all: ZoneOption[] = cityZones.map((z) => ({
      zoneId: z.id,
      label: safeLabel(z.name),
      cityId: selectedCity!.id,
      cityName,
    }));
    if (!q) return all;
    return all.filter((z) => locationMatches(z.label, q));
  }, [zoneMode, cityZones, query, selectedCity, cityName]);

  const globalZoneOptions = React.useMemo(() => {
    if (!enableZones || cityId || !query.trim()) return [] as ZoneOption[];
    const q = query.trim();
    const rows: ZoneOption[] = [];
    for (const city of cities) {
      for (const zone of city.zones ?? []) {
        const label = safeLabel(zone.name);
        if (!locationMatches(label, q)) continue;
        rows.push({
          zoneId: zone.id,
          label,
          cityId: city.id,
          cityName: safeLabel(city.name),
        });
      }
    }
    return rows.slice(0, 16);
  }, [enableZones, cityId, query, cities]);

  const selectedZoneChips = React.useMemo(() => {
    if (!selectedCity) return [];
    return safeZoneIds
      .map((id) => {
        const zone = cityZones.find((z) => z.id === id);
        return zone ? { id, label: safeLabel(zone.name) } : null;
      })
      .filter((chip): chip is { id: string; label: string } => Boolean(chip));
  }, [selectedCity, safeZoneIds, cityZones]);

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

  const handleSelectZoneWithCity = (nextCityId: string, nextZoneId: string) => {
    onChange(nextCityId, [nextZoneId]);
    setQuery('');
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemoveCity = () => {
    onChange(undefined, undefined);
    setQuery('');
    closeDropdown();
  };

  const handleToggleZone = (zoneId: string) => {
    if (!cityId) return;
    const nextZones = safeZoneIds.includes(zoneId)
      ? safeZoneIds.filter((id) => id !== zoneId)
      : [...safeZoneIds, zoneId];
    onChange(cityId, nextZones.length ? nextZones : undefined);
    setQuery('');
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRemoveZone = (zoneId: string) => {
    if (!cityId) return;
    const nextZones = safeZoneIds.filter((id) => id !== zoneId);
    onChange(cityId, nextZones.length ? nextZones : undefined);
  };

  const hasSelectedZones = selectedZoneChips.length > 0;
  const inputPlaceholder = zoneMode ? (hasSelectedZones ? '' : 'Zonat') : placeholder;
  const showZoneScroller = zoneMode && hasSelectedZones;
  const showInput = !cityId || zoneMode;
  const zoneInputCollapsed = zoneMode && hasSelectedZones && !query;
  const showGlobalZones = globalZoneOptions.length > 0;
  const anchorEl = rootRef.current;

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

          {cityId && cityName ? (
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
          open={open && Boolean(anchorEl)}
          anchorEl={anchorEl}
          placement="bottom-start"
          modifiers={[{ name: 'preventOverflow', options: { padding: 8 } }]}
          sx={{ zIndex: 1400, width: Math.max(anchorEl?.offsetWidth ?? 220, 220) }}
        >
          <Paper
            elevation={8}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            sx={{
              mt: 0.75,
              display: 'flex',
              flexDirection: 'column',
              // Header + "Qytete" label + ~4 dense city rows
              maxHeight: 240,
              overflow: 'hidden',
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                scrollbarWidth: 'thin',
              }}
            >
              {zoneMode ? (
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
                        selected={safeZoneIds.includes(option.zoneId)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleToggleZone(option.zoneId)}
                        sx={{ py: 0.45, px: 1.25 }}
                      >
                        <Checkbox
                          size="small"
                          checked={safeZoneIds.includes(option.zoneId)}
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
              ) : (
                <>
                  {!query ? (
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', px: 1.5, pt: 1.25, pb: 0.5, color: 'text.secondary', fontWeight: 600 }}
                    >
                      Shkruaj qytetin{enableZones ? ' ose zonën' : ''}
                    </Typography>
                  ) : null}
                  <List dense disablePadding>
                    {showGlobalZones ? (
                      <>
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
                          Zona
                        </Typography>
                        {globalZoneOptions.map((option) => (
                          <ListItemButton
                            key={`${option.cityId}-${option.zoneId}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectZoneWithCity(option.cityId, option.zoneId)}
                            sx={{ py: 0.45, px: 1.25 }}
                          >
                            <MapPinAreaIcon size={14} style={{ marginRight: 8, flexShrink: 0 }} />
                            <ListItemText
                              primary={option.label}
                              secondary={option.cityName}
                              slotProps={{
                                primary: { sx: { fontSize: '0.84rem', fontWeight: 600 } },
                                secondary: { sx: { fontSize: '0.72rem' } },
                              }}
                            />
                          </ListItemButton>
                        ))}
                      </>
                    ) : null}
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
                  {query && cityOptions.length === 0 && !showGlobalZones ? (
                    <Typography sx={{ px: 1.5, py: 1.5, fontSize: '0.84rem', color: 'text.secondary' }}>
                      Nuk u gjet asnjë qytet{enableZones ? ' apo zonë' : ''}
                    </Typography>
                  ) : null}
                </>
              )}
            </Box>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

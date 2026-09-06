'use client';

import * as React from 'react';
import {
  Box,
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
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Funnel as FunnelIcon } from '@phosphor-icons/react/dist/ssr/Funnel';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { MapPinArea as MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr/MapPinArea';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import {
  PRODUCT_BROWSE_CONTROL_HEIGHT,
  ProductSearchIcon,
  productSearchBarSx,
  productSearchFieldSx,
  type ProductSearchAccent,
} from '@/components/public/product-browse-chrome';
import { useCopy } from '@/hooks/use-copy';
import { useLanguage } from '@/hooks/use-language';
import {
  listBrowseSearchSuggestions,
  type BrowseSearchSuggestion,
  type BrowseSuggestionGroup,
} from '@/lib/browse-search-suggestions';
import type { HomeVerticalId } from '@/lib/home-categories';
import type { RealEstateCityDto } from '@/lib/real-estate-locations-client';

/** @deprecated Import `PRODUCT_BROWSE_CONTROL_HEIGHT` from product-browse-chrome. */
export const BROWSE_CONTROL_HEIGHT = PRODUCT_BROWSE_CONTROL_HEIGHT;

const DEBOUNCE_MS = 320;

function SuggestionIcon({ group }: { group: BrowseSuggestionGroup }) {
  const props = { size: 14 as const, style: { marginRight: 8, flexShrink: 0 } };
  if (group === 'zone') return <MapPinAreaIcon {...props} />;
  if (group === 'city') return <MapPinIcon {...props} />;
  if (group === 'filter') return <FunnelIcon {...props} />;
  if (group === 'keyword') return <MagnifyingGlassIcon {...props} />;
  return <BuildingsIcon {...props} />;
}

export function ListingKeywordSearchInput({
  value,
  placeholder,
  onChange,
  accent,
  commitToChip = false,
  live = false,
  verticalId,
  cities = [],
}: {
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
  /** Optional accent (e.g. profiles indigo) for icon + active/focus chrome. */
  accent?: ProductSearchAccent;
  /** Applied tokens become chips; the field stays empty for the next Enter. */
  commitToChip?: boolean;
  /** Apply the current query while typing instead of waiting for Enter. */
  live?: boolean;
  /** When set, shows typeahead alternatives for this browse vertical. */
  verticalId?: HomeVerticalId;
  cities?: RealEstateCityDto[];
}) {
  const t = useCopy();
  const { language } = useLanguage();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const typingRef = React.useRef(false);
  const pickingRef = React.useRef(false);
  const clearingRef = React.useRef(false);
  const [query, setQuery] = React.useState(commitToChip && !live ? '' : value);
  const [focused, setFocused] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (commitToChip && !live) return;
    if (live && typingRef.current) return;
    setQuery(value);
  }, [value, commitToChip, live]);

  React.useEffect(() => {
    if (commitToChip && !live) return;
    const trimmed = query.trim();
    const applied = value.trim();
    if (trimmed === applied) return;

    const handle = window.setTimeout(() => {
      onChange(trimmed);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [query, value, onChange, commitToChip, live]);

  const suggestions = React.useMemo(() => {
    if (!verticalId || !focused) return [] as BrowseSearchSuggestion[];
    return listBrowseSearchSuggestions({
      verticalId,
      query,
      cities,
      language,
      limit: 8,
      keywordLabel: (q) => t.common.useCustomValue(q),
    });
  }, [verticalId, focused, query, cities, language, t.common]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, verticalId]);

  const showDropdown = Boolean(verticalId) && open && focused && suggestions.length > 0;
  const anchorEl = rootRef.current;

  const commitDraft = (next: string) => {
    const trimmed = next.trim();
    if (commitToChip) {
      if (!trimmed) {
        setQuery('');
        return;
      }
      onChange(trimmed);
      if (!live) {
        setQuery('');
        setOpen(false);
        window.requestAnimationFrame(() => inputRef.current?.focus());
      }
      return;
    }
    onChange(trimmed);
    setOpen(false);
  };

  const pickSuggestion = (suggestion: BrowseSearchSuggestion) => {
    pickingRef.current = true;
    commitDraft(suggestion.token);
    window.setTimeout(() => {
      pickingRef.current = false;
    }, 0);
  };

  const clear = () => {
    clearingRef.current = true;
    setQuery('');
    setOpen(false);
    // Discard typed text only — do not apply it as a filter chip.
    if (!commitToChip || live) onChange('');
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      clearingRef.current = false;
    });
  };

  const hasQuery = Boolean(query.trim());
  const highlighted = hasQuery || focused || (commitToChip && Boolean(value.trim()));
  const iconColor = accent?.color ?? 'var(--mui-palette-primary-main)';

  const groupLabel = (group: BrowseSuggestionGroup) => {
    if (group === 'zone') return t.browse.zones;
    if (group === 'city') return t.browse.cities;
    if (group === 'filter') return t.browse.suggestionFilters;
    return t.browse.suggestionKeyword;
  };

  const suggestionRows = React.useMemo(() => {
    let previous: BrowseSuggestionGroup | null = null;
    return suggestions.map((suggestion, index) => {
      const showHeader = suggestion.group !== previous;
      previous = suggestion.group;
      return { suggestion, index, showHeader };
    });
  }, [suggestions]);

  return (
    <ClickAwayListener
      onClickAway={() => {
        setOpen(false);
        setFocused(false);
      }}
    >
      <Box ref={rootRef} sx={{ flex: 1, minWidth: 0, width: '100%', position: 'relative' }}>
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            const active = showDropdown ? suggestions[activeIndex] : null;
            if (active) {
              pickSuggestion(active);
              return;
            }
            commitDraft(query);
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            width: '100%',
            ...productSearchBarSx(highlighted, accent),
          }}
        >
          <ProductSearchIcon color={iconColor} />
          <TextField
            inputRef={inputRef}
            variant="standard"
            size="small"
            fullWidth
            value={query}
            placeholder={placeholder}
            aria-label={placeholder}
            aria-autocomplete={verticalId ? 'list' : undefined}
            aria-expanded={showDropdown}
            autoComplete="off"
            onChange={(e) => {
              typingRef.current = true;
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => {
              typingRef.current = false;
              if (pickingRef.current || clearingRef.current) return;
              setFocused(false);
              setOpen(false);
              if (commitToChip && !live && query.trim()) commitDraft(query);
            }}
            onKeyDown={(e) => {
              if (!showDropdown) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
              }
            }}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: productSearchFieldSx,
              },
            }}
            sx={{ flex: 1, minWidth: 0 }}
          />
          {hasQuery ? (
            <IconButton
              size="small"
              aria-label={t.browse.clearSearchAria}
              onMouseDown={(e) => e.preventDefault()}
              onClick={clear}
              sx={{
                p: 0.25,
                color: accent?.color ?? 'text.secondary',
                flexShrink: 0,
              }}
            >
              <XIcon size={12} weight="bold" />
            </IconButton>
          ) : null}
        </Box>

        <Popper
          open={showDropdown && Boolean(anchorEl)}
          anchorEl={anchorEl}
          placement="bottom-start"
          data-scroll-lock-allow=""
          modifiers={[{ name: 'preventOverflow', options: { padding: 8 } }]}
          sx={{ zIndex: 1600, width: Math.max(anchorEl?.offsetWidth ?? 240, 240) }}
        >
          <Paper
            elevation={8}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            sx={{
              mt: 0.75,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: { xs: 'min(50dvh, 360px)', sm: 320 },
              minHeight: 0,
              overflow: 'hidden',
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
                scrollbarWidth: 'thin',
              }}
            >
              <List dense disablePadding role="listbox">
                {suggestionRows.map(({ suggestion, index, showHeader }) => (
                  <React.Fragment key={suggestion.id}>
                    {showHeader ? (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          px: 1.5,
                          pt: index === 0 ? 1.1 : 0.85,
                          pb: 0.35,
                          color: 'text.secondary',
                          fontWeight: 600,
                        }}
                      >
                        {groupLabel(suggestion.group)}
                      </Typography>
                    ) : null}
                    <ListItemButton
                      selected={index === activeIndex}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => pickSuggestion(suggestion)}
                      role="option"
                      aria-selected={index === activeIndex}
                      disableTouchRipple
                      sx={{ py: 0.5, px: 1.25, touchAction: 'pan-y' }}
                    >
                      <SuggestionIcon group={suggestion.group} />
                      <ListItemText
                        primary={suggestion.label}
                        secondary={suggestion.description}
                        slotProps={{
                          primary: { sx: { fontSize: '0.84rem', fontWeight: 600 } },
                          secondary: { sx: { fontSize: '0.72rem' } },
                        }}
                      />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}

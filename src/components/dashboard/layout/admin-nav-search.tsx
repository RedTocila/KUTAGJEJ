'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import {
  Box,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { MagnifyingGlass as MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';

import {
  ProductDialog,
  ProductDialogContent,
  ProductDialogTitle,
} from '@/components/core/product-dialog';

import type { NavItemConfig } from '@/types/nav';
import { primaryMainAlpha } from '@/lib/css-var-alpha';

import { useAdminNavSections } from './admin-nav-content';
import { navIcons } from './nav-icons';

export function AdminNavSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const sections = useAdminNavSections();
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const flat = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: Array<NavItemConfig & { sectionTitle: string }> = [];
    for (const section of sections) {
      const sectionTitle = section.title ?? 'Paneli';
      const visit = (item: NavItemConfig) => {
        if (item.href && item.title) {
          const matches =
            !q ||
            item.title.toLowerCase().includes(q) ||
            sectionTitle.toLowerCase().includes(q);
          if (matches) rows.push({ ...item, sectionTitle });
        }
        (item.subItems ?? []).forEach(visit);
      };
      section.items.forEach(visit);
    }
    return rows;
  }, [sections, query]);

  return (
    <ProductDialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <ProductDialogTitle onClose={onClose}>Kërko faqe admin</ProductDialogTitle>
      <Box sx={{ px: 2.5, pb: 1 }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          autoFocus
          placeholder="Kërko faqe admin…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  {React.createElement(MagnifyingGlassIcon, { size: 20 })}
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
      </Box>
      <ProductDialogContent sx={{ pt: 0, px: 1, pb: 1.5, maxHeight: 420 }}>
        {flat.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            Nuk u gjet asnjë faqe.
          </Typography>
        ) : (
          <List disablePadding dense>
            {flat.map((item) => {
              const Icon = item.icon ? navIcons[item.icon] : null;
              return (
                <ListItemButton
                  key={item.key}
                  component={RouterLink}
                  href={item.href!}
                  onClick={onClose}
                  sx={{
                    borderRadius: 2,
                    mx: 0.5,
                    mb: 0.25,
                    '&.Mui-focusVisible': { bgcolor: primaryMainAlpha(0.1) },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                    {Icon ? React.createElement(Icon, { fontSize: 20 }) : null}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.sectionTitle}
                    slotProps={{
                      primary: { sx: { fontWeight: 600, fontSize: '0.9rem' } },
                      secondary: { sx: { fontSize: '0.75rem' } },
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </ProductDialogContent>
    </ProductDialog>
  );
}

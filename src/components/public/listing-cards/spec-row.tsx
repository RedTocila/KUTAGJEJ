'use client';

import * as React from 'react';
import { Box, Typography } from '@mui/material';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

import { primaryMainAlpha } from '@/lib/css-var-alpha';

export interface Spec {
  /** Pre-bound Phosphor icon component (the SSR variant). */
  Icon: PhosphorIcon;
  /** Short label rendered next to the icon (e.g. "75 m²", "3"). */
  label: string;
  /** Optional accessible title — shown on hover; defaults to `label`. */
  title?: string;
}

/**
 * Inline row of icon + label pills used inside the public listing cards.
 * Each pill is a small bordered chip with a soft background that calls
 * attention to the property's specs without competing with the price or
 * title. Stays on one horizontal line and only shows complete pills that fit.
 */
export function SpecRow({ specs }: { specs: Spec[] }) {
  const filtered = specs.filter((s) => Boolean(s.label));
  const measurementKey = filtered.map((spec) => `${spec.label}-${spec.title ?? ''}`).join('|');
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      if (!row.clientWidth) return;

      const children = Array.from(row.children).slice(0, 3) as HTMLElement[];
      const fitCount = children.findIndex((child) => child.offsetLeft + child.offsetWidth > row.clientWidth);
      const nextCount = fitCount === -1 ? children.length : fitCount;

      setVisibleCount((current) => (current === nextCount ? current : nextCount));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(row);
    measure();

    return () => observer.disconnect();
  }, [measurementKey]);

  if (filtered.length === 0) return null;

  return (
    <Box
      ref={rowRef}
      sx={{
        display: 'flex',
        flexWrap: 'nowrap',
        gap: 0.75,
        alignItems: 'center',
        minWidth: 0,
        overflow: 'hidden',
        visibility: visibleCount === null ? 'hidden' : 'visible',
      }}
    >
      {filtered.map(({ Icon, label, title }, index) => (
        <Box
          key={`${label}-${index}`}
          title={title ?? label}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
            visibility: visibleCount === null || index < visibleCount ? 'visible' : 'hidden',
            px: 0.9,
            py: 0.45,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) => primaryMainAlpha(theme.palette.mode === 'dark' ? 0.12 : 0.07),
            color: 'primary.main',
          }}
        >
          <Box component="span" aria-hidden sx={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <Icon size={14} weight="bold" />
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.primary',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

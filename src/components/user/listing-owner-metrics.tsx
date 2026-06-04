'use client';

import * as React from 'react';
import { Stack, Typography } from '@mui/material';
import { BookmarkSimple as BookmarkIcon } from '@phosphor-icons/react/dist/ssr/BookmarkSimple';
import { CursorClick as ClickIcon } from '@phosphor-icons/react/dist/ssr/CursorClick';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { ShareNetwork as ShareIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';

import type { ListingMetrics } from '@/lib/listing-metrics';

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {new Intl.NumberFormat('en-GB').format(value)} {label}
      </Typography>
    </Stack>
  );
}

export function ListingOwnerMetrics({ metrics }: { metrics: Partial<ListingMetrics> }) {
  const viewCount = metrics.viewCount ?? 0;
  const clickCount = metrics.clickCount ?? 0;
  const shareCount = metrics.shareCount ?? 0;
  const saveCount = metrics.saveCount ?? 0;

  return (
    <Stack
      direction="row"
      sx={{ flexWrap: 'wrap', gap: { xs: 1, sm: 1.5 }, pt: 0.5, borderTop: 1, borderColor: 'divider' }}
    >
      <Stat icon={<EyeIcon size={14} />} label="shikime" value={viewCount} />
      <Stat icon={<ClickIcon size={14} />} label="klikime" value={clickCount} />
      <Stat icon={<ShareIcon size={14} />} label="ndarje" value={shareCount} />
      <Stat icon={<BookmarkIcon size={14} />} label="ruajtje" value={saveCount} />
    </Stack>
  );
}

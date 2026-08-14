'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Stack, Typography } from '@mui/material';
import { MapPin as MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';

import { primaryMainAlpha } from '@/lib/css-var-alpha';
import type { ListingInquiryCardData } from '@/lib/listing-inquiry-message';
import { listingCardImageUrl } from '@/lib/storage-image';

type ListingInquiryCardProps = {
  data: ListingInquiryCardData;
  /** @deprecated use variant="card" */
  compact?: boolean;
  variant?: 'card' | 'composer';
  href?: string | null;
};

export function ListingInquiryCard({
  data,
  compact = false,
  variant,
  href,
}: ListingInquiryCardProps) {
  const resolvedVariant = variant ?? (compact ? 'card' : 'card');
  const imageSrc = listingCardImageUrl(data.imageUrl) || data.imageUrl || undefined;
  const cardHref = href ?? data.url;

  if (resolvedVariant === 'composer') {
    const inner = (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.75,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'primary.main',
          bgcolor: 'background.paper',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 4px 16px rgba(0,0,0,0.35)'
              : '0 4px 14px rgba(15, 23, 10, 0.1)',
          maxWidth: 260,
        }}
      >
        {imageSrc ? (
          <Box
            component="img"
            src={imageSrc}
            alt={data.title}
            sx={{
              flexShrink: 0,
              width: 52,
              height: 52,
              borderRadius: 1.25,
              objectFit: 'cover',
              bgcolor: 'action.hover',
            }}
          />
        ) : (
          <Box sx={{ flexShrink: 0, width: 52, height: 52, borderRadius: 1.25, bgcolor: 'action.hover' }} />
        )}
        <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            noWrap
            sx={{ fontWeight: 700, fontSize: '0.8125rem', lineHeight: 1.25, letterSpacing: '-0.01em' }}
          >
            {data.title}
          </Typography>
          {data.priceLabel ? (
            <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: 'primary.main', lineHeight: 1.1 }}>
              {data.priceLabel}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    );
    return inner;
  }

  const inner = (
    <Box
      sx={{
        overflow: 'hidden',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'primary.main',
        bgcolor: 'background.paper',
        boxShadow: (theme) =>
          theme.palette.mode === 'dark'
            ? '0 8px 28px rgba(0,0,0,0.35)'
            : '0 8px 24px rgba(15, 23, 10, 0.12)',
        maxWidth: compact ? 280 : 320,
      }}
    >
      {imageSrc ? (
        <Box
          component="img"
          src={imageSrc}
          alt={data.title}
          sx={{
            display: 'block',
            width: '100%',
            aspectRatio: '16 / 10',
            objectFit: 'cover',
            bgcolor: 'action.hover',
          }}
        />
      ) : (
        <Box sx={{ width: '100%', aspectRatio: '16 / 10', bgcolor: 'action.hover' }} />
      )}
      <Stack spacing={0.85} sx={{ p: 1.35, bgcolor: '#0c0c0c', color: '#fff' }}>
        {data.subtitle ? (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.68rem',
            }}
          >
            {data.subtitle}
          </Typography>
        ) : null}
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: compact ? '0.95rem' : '1rem',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
          }}
        >
          {data.title}
        </Typography>
        {data.priceLabel ? (
          <Typography sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'primary.main', lineHeight: 1.1 }}>
            {data.priceLabel}
          </Typography>
        ) : null}
        {data.specs.length ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.65 }}>
            {data.specs.map((label) => (
              <Box
                key={label}
                sx={{
                  px: 0.75,
                  py: 0.35,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: primaryMainAlpha(0.35),
                  bgcolor: primaryMainAlpha(0.12),
                  color: 'primary.main',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
        ) : null}
        {data.location ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(255,255,255,0.72)' }}>
            <MapPinIcon size={14} weight="fill" />
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {data.location}
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );

  if (!cardHref) return inner;
  return (
    <Link href={cardHref} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      {inner}
    </Link>
  );
}

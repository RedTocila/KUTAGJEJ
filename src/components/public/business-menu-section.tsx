'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Divider, IconButton, Stack, Typography } from '@mui/material';
import { ArrowLeft as ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';

import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import {
  businessMenuSections,
  type BusinessMenuItemView,
  type BusinessMenuSectionView,
} from '@/lib/business-listing-detail-content';
import { MOBILE_CONTENT_BOTTOM_PADDING } from '@/lib/mobile-layout';
import type { PublicDirectoryListingDetail } from '@/lib/public-listings-client';
import { listingBusinessMenuHref, listingBusinessPublicHref } from '@/paths';

function MenuItemRow({
  item,
  dense = false,
}: {
  item: BusinessMenuItemView;
  dense?: boolean;
}) {
  const size = dense ? 64 : 80;

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: dense ? 0.25 : 0.5 }}>
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'action.hover',
        }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box sx={{ width: '100%', height: '100%', bgcolor: 'rgba(var(--mui-palette-primary-mainChannel) / 0.1)' }} />
        )}
      </Box>
      <Stack spacing={0.35} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: dense ? '0.9rem' : '0.95rem',
              lineHeight: 1.3,
              minWidth: 0,
            }}
          >
            {item.name}
          </Typography>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: dense ? '0.9rem' : '0.95rem',
              color: 'primary.main',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {formatPrice(item.price, item.currency)}
          </Typography>
        </Stack>
        {item.description ? (
          <Typography
            sx={{
              fontSize: '0.78rem',
              color: 'text.secondary',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.description}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

function CategoryTags({
  sections,
  activeId,
  onSelect,
}: {
  sections: BusinessMenuSectionView[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        overflowX: 'auto',
        mx: -0.25,
        px: 0.25,
        pb: 0.25,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {sections.map((section) => {
        const active = section.id === activeId;
        return (
          <Box
            key={section.id}
            component="button"
            type="button"
            onClick={() => onSelect(section.id)}
            sx={{
              flexShrink: 0,
              cursor: 'pointer',
              border: 'none',
              outline: 'none',
              borderRadius: 999,
              px: 1.6,
              py: 0.7,
              fontSize: '0.8rem',
              fontWeight: 700,
              lineHeight: 1.2,
              fontFamily: 'inherit',
              transition: 'background-color 0.15s ease, color 0.15s ease',
              bgcolor: active ? 'primary.main' : 'action.hover',
              color: active ? 'common.black' : 'text.secondary',
              '&:hover': {
                bgcolor: active ? 'primary.main' : 'action.selected',
              },
            }}
          >
            {section.name}
          </Box>
        );
      })}
    </Stack>
  );
}

function useActiveMenuSection(sections: BusinessMenuSectionView[]) {
  const [activeId, setActiveId] = React.useState(() => sections[0]?.id ?? '');
  React.useEffect(() => {
    if (!sections.some((s) => s.id === activeId)) {
      setActiveId(sections[0]?.id ?? '');
    }
  }, [sections, activeId]);
  const active = sections.find((s) => s.id === activeId) ?? sections[0] ?? null;
  return { activeId: active?.id ?? '', setActiveId, active };
}

/** Preview on business detail: category tags + up to 3 items of the selected category. */
export function BusinessMenuPreview({
  listing,
  maxPerCategory = 3,
}: {
  listing: PublicDirectoryListingDetail;
  savedHearts?: Set<string>;
  onToggleHeart?: (id: string) => void;
  maxPerCategory?: number;
}) {
  const allSections = React.useMemo(() => businessMenuSections(listing), [listing]);
  const { activeId, setActiveId, active } = useActiveMenuSection(allSections);
  const previewItems = React.useMemo(
    () => (active?.items ?? []).slice(0, maxPerCategory),
    [active, maxPerCategory],
  );
  const totalItems = listing.menuItems?.length ?? 0;
  if (allSections.length === 0 && totalItems === 0) return null;

  const menuHref = listingBusinessMenuHref(listing);
  const categoryTotal = active?.items.length ?? 0;
  const hasMore = totalItems > previewItems.length || categoryTotal > maxPerCategory;

  return (
    <Stack spacing={1.5}>
      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Menu</Typography>
      <CategoryTags sections={allSections} activeId={activeId} onSelect={setActiveId} />
      {previewItems.length > 0 ? (
        <Stack spacing={0} divider={<Divider sx={{ borderColor: 'divider', opacity: 0.6 }} />}>
          {previewItems.map((item) => (
            <Box key={item.id} sx={{ py: 1.25 }}>
              <MenuItemRow item={item} dense />
            </Box>
          ))}
        </Stack>
      ) : (
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          Nuk ka artikuj në këtë kategori.
        </Typography>
      )}
      <Button
        component={Link}
        href={menuHref}
        variant="text"
        endIcon={<ArrowRightIcon size={16} weight="bold" />}
        sx={{
          alignSelf: 'flex-end',
          px: 0,
          minWidth: 0,
          fontWeight: 700,
          textTransform: 'none',
          fontSize: '0.8rem',
          color: 'primary.main',
          '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
        }}
      >
        {hasMore ? 'Shiko menunë e plotë' : 'Shiko menunë'}
      </Button>
    </Stack>
  );
}

/** Full-page menu — flat layout, no card wrapper. */
export function BusinessMenuFullPage({ listing }: { listing: PublicDirectoryListingDetail }) {
  const sections = React.useMemo(() => businessMenuSections(listing), [listing]);
  const { activeId, setActiveId, active } = useActiveMenuSection(sections);
  const backHref = listingBusinessPublicHref(listing);

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        pb: MOBILE_CONTENT_BOTTOM_PADDING,
      }}
    >
      <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: 'rgba(var(--mui-palette-background-defaultChannel) / 0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: 2,
            pt: 1.5,
            pb: 1.5,
          }}
        >
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <IconButton
                component={Link}
                href={backHref}
                aria-label="Kthehu te biznesi"
                size="medium"
                sx={{
                  bgcolor: 'rgb(var(--mui-palette-background-paperChannel) / 0.92)',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'rgb(var(--mui-palette-background-paperChannel) / 0.98)',
                  },
                }}
              >
                <ArrowLeftIcon size={22} weight="regular" />
              </IconButton>
              <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
                <Typography component="h1" sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.2 }}>
                  Menu
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {listing.title}
                </Typography>
              </Stack>
            </Stack>
            {sections.length > 0 ? (
              <CategoryTags sections={sections} activeId={activeId} onSelect={setActiveId} />
            ) : null}
          </Stack>
        </Box>

        <Box sx={{ px: 2, pt: 1, pb: 2 }}>
          {sections.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Nuk ka artikuj në menu ende.
            </Typography>
          ) : (active?.items.length ?? 0) > 0 ? (
            <Stack spacing={0} divider={<Divider sx={{ borderColor: 'divider', opacity: 0.55 }} />}>
              {active!.items.map((item) => (
                <Box key={item.id} sx={{ py: 1.5 }}>
                  <MenuItemRow item={item} />
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', py: 3, textAlign: 'center' }}>
              Nuk ka artikuj në këtë kategori.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';

import { formatPrice } from '@/components/public/listing-cards/format-helpers';
import { ProductBackButton, ProductTag } from '@/components/public/product-browse-chrome';
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
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        overscrollBehaviorX: 'contain',
        WebkitOverflowScrolling: 'touch',
        mx: -0.25,
        px: 0.25,
        pb: 0.25,
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ width: 'max-content', maxWidth: 'none', flexWrap: 'nowrap', pr: 2 }}
      >
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <ProductTag
              key={section.id}
              label={section.name}
              active={active}
              onClick={() => onSelect(section.id)}
              sx={{ flexShrink: 0 }}
            />
          );
        })}
      </Stack>
    </Box>
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

/** Approx. dense row height (64px thumb + padding) — used for the scroll viewport. */
const MENU_PREVIEW_ROW_PX = 92;

/** Preview on business detail: category tags + scrollable items (4 visible). */
export function BusinessMenuPreview({
  listing,
  maxPerCategory = 4,
}: {
  listing: PublicDirectoryListingDetail;
  savedHearts?: Set<string>;
  onToggleHeart?: (id: string) => void;
  /** How many product rows are visible before scrolling. */
  maxPerCategory?: number;
}) {
  const allSections = React.useMemo(() => businessMenuSections(listing), [listing]);
  const { activeId, setActiveId, active } = useActiveMenuSection(allSections);
  const previewItems = active?.items ?? [];
  const totalItems = listing.menuItems?.length ?? 0;
  if (allSections.length === 0 && totalItems === 0) return null;

  const menuHref = listingBusinessMenuHref(listing);
  const categoryTotal = previewItems.length;
  const hasMore = totalItems > categoryTotal || categoryTotal > maxPerCategory;

  return (
    <Stack spacing={1.5}>
      <CategoryTags sections={allSections} activeId={activeId} onSelect={setActiveId} />
      <Stack spacing={0}>
        {previewItems.length > 0 ? (
          <Box
            sx={{
              maxHeight: MENU_PREVIEW_ROW_PX * maxPerCategory,
              overflowY: 'auto',
              overscrollBehaviorY: 'contain',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
            }}
          >
            <Stack spacing={0} divider={<Divider sx={{ borderColor: 'divider', opacity: 0.6 }} />}>
              {previewItems.map((item) => (
                <Box key={item.id} sx={{ py: 1.25 }}>
                  <MenuItemRow item={item} dense />
                </Box>
              ))}
            </Stack>
          </Box>
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
            py: 0,
            mt: 0.5,
            minWidth: 0,
            minHeight: 0,
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
              <ProductBackButton href={backHref} aria-label="Kthehu te biznesi" />
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

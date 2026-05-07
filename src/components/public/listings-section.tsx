'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';

import { findVertical, type HomeVerticalId } from '@/lib/home-categories';

import { SubcategoryPills } from './subcategory-pills';
import { VerticalIcon } from './vertical-icon';

export interface ListingsSectionProps {
  verticalId: HomeVerticalId;
  /** Total listings count from the API — appended to the section title. */
  total?: number;
  /**
   * The card grid for this section. When `isEmpty` is true a quiet placeholder
   * is rendered instead, so first-time visitors still see the layout.
   */
  children?: React.ReactNode;
  isEmpty: boolean;
}

export function ListingsSection({ verticalId, total, children, isEmpty }: ListingsSectionProps) {
  const vertical = findVertical(verticalId);

  return (
    <Box component="section" aria-labelledby={`section-${verticalId}`} sx={{ py: { xs: 3, md: 4 } }}>
      <Container maxWidth="xl">
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            <VerticalIcon verticalId={verticalId} size={42} decorative />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', minWidth: 0 }}>
              <Typography
                id={`section-${verticalId}`}
                component="h2"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                }}
              >
                {vertical.label}
              </Typography>
              {typeof total === 'number' && total > 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {total.toLocaleString('en-GB')}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
          <Button
            component={RouterLink}
            href={vertical.href}
            size="small"
            endIcon={React.createElement(ArrowRightIcon, { size: 14, weight: 'bold' })}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: 'primary.main',
              flexShrink: 0,
              px: 1,
            }}
          >
            Shfleto të gjitha
          </Button>
        </Stack>

        <SubcategoryPills verticalId={verticalId} />

        {isEmpty ? <EmptyPlaceholder verticalId={verticalId} /> : <Box>{children}</Box>}
      </Container>
    </Box>
  );
}

function EmptyPlaceholder({ verticalId }: { verticalId: HomeVerticalId }) {
  const vertical = findVertical(verticalId);
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        py: { xs: 4, md: 5 },
        px: 3,
        textAlign: 'center',
      }}
    >
      <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <VerticalIcon verticalId={verticalId} size={64} decorative />
        <Typography variant="body2" color="text.secondary">
          Nuk ka njoftime ende në {vertical.label.toLowerCase()}.
        </Typography>
        <Button
          component={RouterLink}
          href={vertical.postHref}
          size="small"
          variant="outlined"
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
        >
          Bëhu i pari që poston
        </Button>
      </Stack>
    </Box>
  );
}

'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import ArrowForward from '@mui/icons-material/ArrowForward';
import { Box, Button, Container, Stack, Typography } from '@mui/material';

import { findVertical, type HomeVerticalId } from '@/lib/home-categories';

import { SubcategoryPills } from './subcategory-pills';
import { HomeVerticalIcon } from './home-vertical-icon';
import { VerticalIcon } from './vertical-icon';

export interface ListingsSectionProps {
  verticalId: HomeVerticalId;
  total?: number;
  children?: React.ReactNode;
  isEmpty: boolean;
  /** Override the H2 label (e.g. homepage “Njoftimet e fundit”). */
  titleOverride?: string;
  /** Use `@mui/icons-material` category icons instead of PNG assets. */
  useMuiVerticalIcon?: boolean;
  /** Hide numeric total next to the title. */
  hideTotal?: boolean;
  /** Title + CTA only (no category icon tile) — matches compact section headers. */
  hideVerticalIcon?: boolean;
  /** Hide subcategory pill row (e.g. mixed “Njoftimet e fundit”). */
  hideSubcategoryPills?: boolean;
  /** Hide the “Shfleto të gjitha” action (e.g. when there is no single browse target). */
  hideBrowseAction?: boolean;
  /** Drop top padding — e.g. first section directly under the hero. */
  compactTop?: boolean;
}

export function ListingsSection({
  verticalId,
  total,
  children,
  isEmpty,
  titleOverride,
  useMuiVerticalIcon = false,
  hideTotal = false,
  hideVerticalIcon = false,
  hideSubcategoryPills = false,
  hideBrowseAction = false,
  compactTop = false,
}: ListingsSectionProps) {
  const vertical = findVertical(verticalId);
  const title = titleOverride ?? vertical.label;

  return (
    <Box
      component="section"
      aria-labelledby={`section-${verticalId}`}
      sx={compactTop ? { pt: 0, pb: { xs: 3, md: 4 } } : { py: { xs: 3, md: 4 } }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: { xs: 1.5, md: 2 } }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
            {!hideVerticalIcon ? (
              useMuiVerticalIcon ? (
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    color: 'primary.main',
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(var(--mui-palette-primary-mainChannel) / 0.14)'
                        : 'rgba(var(--mui-palette-primary-mainChannel) / 0.1)',
                  }}
                >
                  <HomeVerticalIcon verticalId={verticalId} size={26} />
                </Box>
              ) : (
                <VerticalIcon verticalId={verticalId} size={42} decorative />
              )
            ) : null}
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
                {title}
              </Typography>
              {!hideTotal && typeof total === 'number' && total > 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {total.toLocaleString('en-GB')}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
          {!hideBrowseAction ? (
          <Button
            component={RouterLink}
            href={vertical.href}
            size="small"
            endIcon={<ArrowForward sx={{ fontSize: 18 }} />}
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
          ) : null}
        </Stack>

        {!hideSubcategoryPills ? <SubcategoryPills verticalId={verticalId} /> : null}

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
        <HomeVerticalIcon verticalId={verticalId} size={48} />
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

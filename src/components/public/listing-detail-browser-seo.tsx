'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Box, Link as MuiLink, Stack, Typography } from '@mui/material';
import { ArrowRight as ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';

import type { HomeVerticalId } from '@/lib/home-categories';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { LISTING_DETAIL_SEO, listingDetailSeoParagraphs } from '@/lib/public-seo-copy';
import { listingInternalLinks } from '@/lib/seo-internal-links';
import { BrowserSeoSection } from '@/components/public/browser-seo-section';
import { SeoEyebrow, SeoHeadingPanel, SeoTextLinkRow } from '@/components/public/seo-heading-panel';

export function ListingDetailBrowserSeo({
  vertical,
  listingTitle,
  locationLine,
  cityName,
  categorySlug,
  transactionSlug,
}: {
  vertical: HomeVerticalId;
  listingTitle: string;
  locationLine?: string | null;
  cityName?: string | null;
  categorySlug?: string | null;
  transactionSlug?: string | null;
}) {
  const meta = LISTING_DETAIL_SEO[vertical];
  const paragraphs = listingDetailSeoParagraphs({
    vertical,
    listingTitle,
    locationLine: locationLine || cityName,
  });
  const [lead, ...rest] = paragraphs;
  const links = listingInternalLinks({
    vertical,
    cityName: cityName || null,
    categorySlug,
    transactionSlug,
  });
  const primary = links[0];

  return (
    <BrowserSeoSection aria-labelledby="listing-seo-aside" sx={{ py: { xs: 1.5, md: 2 } }}>
      <SeoHeadingPanel
        titleId="listing-seo-aside"
        title={meta.sectionTitle}
        subtext={lead}
        titleComponent="h2"
        dense
        eyebrow={<SeoEyebrow>Udhëzues</SeoEyebrow>}
        maxWidth="100%"
        actions={
          <Stack spacing={1.25} sx={{ pt: 0.25 }}>
            {rest.map((text) => (
              <Typography
                key={text.slice(0, 40)}
                component="p"
                sx={{ m: 0, fontSize: '0.94rem', lineHeight: 1.65, color: 'text.secondary', fontWeight: 500 }}
              >
                {text}
              </Typography>
            ))}
            <SeoTextLinkRow links={links.slice(0, 5)} />
            {primary ? (
              <Box>
                <MuiLink
                  component={RouterLink}
                  href={primary.href}
                  underline="none"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    color: 'primary.dark',
                    px: 1.35,
                    py: 0.7,
                    borderRadius: 2,
                    bgcolor: primaryMainAlpha(0.12),
                    border: '1px solid',
                    borderColor: primaryMainAlpha(0.2),
                    transition: 'background-color 140ms ease, transform 140ms ease',
                    '&:hover': { bgcolor: primaryMainAlpha(0.2) },
                    '.dark &': { color: 'primary.light' },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  {meta.browseCta}
                  <ArrowRightIcon size={16} weight="bold" />
                </MuiLink>
              </Box>
            ) : null}
          </Stack>
        }
      />
    </BrowserSeoSection>
  );
}

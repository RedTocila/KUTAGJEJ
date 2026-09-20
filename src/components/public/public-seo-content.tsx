'use client';

import * as React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { CaretDown as CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';

import type { SeoFaqItem } from '@/lib/public-seo-copy';
import { primaryMainAlpha } from '@/lib/css-var-alpha';
import { BannerSurface } from '@/components/public/banner-surface';
import { BrowserSeoSection } from '@/components/public/browser-seo-section';
import { SeoEyebrow, SeoTextLinkRow } from '@/components/public/seo-heading-panel';

export function PublicFaqList({ items, headingId }: { items: readonly SeoFaqItem[]; headingId: string }) {
  return (
    <Stack spacing={1.25} sx={{ mt: 0.5 }}>
      <Typography
        id={headingId}
        component="h3"
        sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', md: '1.15rem' }, letterSpacing: '-0.015em' }}
      >
        Pyetjet e shpeshta
      </Typography>
      <Box
        sx={{
          borderRadius: 2.5,
          overflow: 'hidden',
          boxShadow: `inset 0 0 0 1px ${primaryMainAlpha(0.12)}`,
          bgcolor: primaryMainAlpha(0.03),
          '.dark &': { bgcolor: primaryMainAlpha(0.06) },
        }}
      >
        {items.map((item, index) => (
          <Accordion
            key={item.question}
            disableGutters
            elevation={0}
            sx={{
              bgcolor: 'transparent',
              borderBottom: index === items.length - 1 ? 'none' : '1px solid',
              borderColor: primaryMainAlpha(0.1),
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<CaretDownIcon size={18} weight="bold" />}
              sx={{
                px: { xs: 1.5, md: 2 },
                minHeight: 54,
                '& .MuiAccordionSummary-content': { my: 1.35 },
                '& .MuiAccordionSummary-expandIconWrapper': { color: 'primary.main' },
              }}
            >
              <Typography component="h4" sx={{ fontWeight: 700, fontSize: '0.98rem', pr: 1, letterSpacing: '-0.01em' }}>
                {item.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: { xs: 1.5, md: 2 }, pt: 0, pb: 2 }}>
              <Typography component="p" color="text.secondary" sx={{ lineHeight: 1.7, fontWeight: 500 }}>
                {item.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Stack>
  );
}

export function PublicSeoContentBlock({
  headline,
  subtext,
  paragraphs,
  faqs,
  headingId,
  faqHeadingId,
  relatedLinks,
}: {
  headline: string;
  subtext: string;
  paragraphs: readonly string[];
  faqs: readonly SeoFaqItem[];
  headingId: string;
  faqHeadingId: string;
  relatedLinks?: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <BrowserSeoSection aria-labelledby={headingId} sx={{ py: { xs: 3.5, md: 5 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
        <BannerSurface>
          <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
            <SeoEyebrow>Udhëzues</SeoEyebrow>
            <Typography
              id={headingId}
              component="h2"
              sx={{
                m: 0,
                fontWeight: 800,
                fontSize: { xs: '1.45rem', sm: '1.75rem', md: '2.1rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: 'text.primary',
              }}
            >
              {headline}
            </Typography>
            <Typography
              component="p"
              sx={{
                m: 0,
                fontSize: { xs: '0.95rem', md: '1.05rem' },
                lineHeight: 1.55,
                fontWeight: 500,
                color: 'text.secondary',
              }}
            >
              {subtext}
            </Typography>
            <Stack spacing={1.5}>
              {paragraphs.map((text) => (
                <Typography
                  key={text.slice(0, 48)}
                  component="p"
                  sx={{ m: 0, color: 'text.secondary', lineHeight: 1.7, fontWeight: 500, fontSize: '0.98rem' }}
                >
                  {text}
                </Typography>
              ))}
            </Stack>
            {relatedLinks?.length ? <SeoTextLinkRow links={relatedLinks} /> : null}
            <PublicFaqList items={faqs} headingId={faqHeadingId} />
          </Stack>
        </BannerSurface>
      </Container>
    </BrowserSeoSection>
  );
}

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
import { BrowserSeoSection } from '@/components/public/browser-seo-section';
import { SeoEyebrow, SeoHeadingPanel } from '@/components/public/seo-heading-panel';

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
}: {
  headline: string;
  subtext: string;
  paragraphs: readonly string[];
  faqs: readonly SeoFaqItem[];
  headingId: string;
  faqHeadingId: string;
}) {
  return (
    <BrowserSeoSection aria-labelledby={headingId} sx={{ py: { xs: 3.5, md: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={2.5}>
          <SeoHeadingPanel
            titleId={headingId}
            title={headline}
            subtext={subtext}
            titleComponent="h2"
            eyebrow={<SeoEyebrow>Udhëzues</SeoEyebrow>}
            maxWidth="100%"
          />
          <Box
            sx={{
              px: { xs: 0.25, md: 0.5 },
              display: 'grid',
              gap: 1.5,
            }}
          >
            {paragraphs.map((text) => (
              <Typography
                key={text.slice(0, 48)}
                component="p"
                sx={{ m: 0, color: 'text.secondary', lineHeight: 1.75, fontWeight: 500, fontSize: '0.98rem' }}
              >
                {text}
              </Typography>
            ))}
          </Box>
          <PublicFaqList items={faqs} headingId={faqHeadingId} />
        </Stack>
      </Container>
    </BrowserSeoSection>
  );
}

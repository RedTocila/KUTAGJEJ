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
import { BrowserSeoSection } from '@/components/public/browser-seo-section';

export function PublicFaqList({ items, headingId }: { items: readonly SeoFaqItem[]; headingId: string }) {
  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Typography
        id={headingId}
        component="h3"
        sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', md: '1.25rem' }, letterSpacing: '-0.01em' }}
      >
        Pyetjet e shpeshta
      </Typography>
      <Box component="div">
        {items.map((item) => (
          <Accordion
            key={item.question}
            disableGutters
            elevation={0}
            sx={{
              bgcolor: 'transparent',
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<CaretDownIcon size={18} />}
              sx={{ px: 0, minHeight: 52, '& .MuiAccordionSummary-content': { my: 1.25 } }}
            >
              <Typography component="h4" sx={{ fontWeight: 650, fontSize: '0.98rem', pr: 1 }}>
                {item.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0, pb: 2 }}>
              <Typography component="p" color="text.secondary" sx={{ lineHeight: 1.7 }}>
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
    <BrowserSeoSection aria-labelledby={headingId} sx={{ py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Typography
            id={headingId}
            component="h2"
            sx={{
              fontWeight: 750,
              fontSize: { xs: '1.35rem', md: '1.65rem' },
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            {headline}
          </Typography>
          <Typography component="p" color="text.secondary" sx={{ lineHeight: 1.7, fontSize: '1.02rem' }}>
            {subtext}
          </Typography>
          {paragraphs.map((text) => (
            <Typography key={text.slice(0, 48)} component="p" color="text.secondary" sx={{ lineHeight: 1.75 }}>
              {text}
            </Typography>
          ))}
          <PublicFaqList items={faqs} headingId={faqHeadingId} />
        </Stack>
      </Container>
    </BrowserSeoSection>
  );
}

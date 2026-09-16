'use client';

import * as React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';

import { paths } from '@/paths';
import { HOME_SEO_COPY } from '@/lib/public-seo-copy';
import { BrowserSeoSection } from '@/components/public/browser-seo-section';
import { PublicSeoContentBlock } from '@/components/public/public-seo-content';
import { SeoTextLinkRow } from '@/components/public/seo-heading-panel';

/** Homepage SEO copy + FAQ — browser / Google only (hidden in native app). */
export function SeoIntroSection() {
  return (
    <>
      <PublicSeoContentBlock
        headline={HOME_SEO_COPY.headline}
        subtext={HOME_SEO_COPY.subtext}
        paragraphs={HOME_SEO_COPY.paragraphs}
        faqs={HOME_SEO_COPY.faqs}
        headingId="about-kutagjej"
        faqHeadingId="faq-kutagjej"
      />
      <HomeSeoLinkCloud />
    </>
  );
}

/** Extra internal links for crawlers (browser only). */
function HomeSeoLinkCloud() {
  return (
    <BrowserSeoSection sx={{ pb: { xs: 3.5, md: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={1.25} sx={{ alignItems: 'center' }}>
          <Typography
            component="p"
            sx={{ m: 0, fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'primary.main' }}
          >
            Eksploro kategoritë
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <SeoTextLinkRow
              links={[
                { href: paths.public.realEstate, label: 'Prona' },
                { href: paths.public.cars, label: 'Makina' },
                { href: paths.public.jobs, label: 'Punë' },
                { href: paths.public.marketplace, label: 'Tregu' },
                { href: paths.public.businesses, label: 'Biznese' },
                { href: paths.public.professionals, label: 'Profesionistë' },
                { href: paths.auth.signIn, label: 'Hyr / Regjistrohu' },
              ]}
            />
          </Box>
          <Typography component="p" variant="caption" color="text.secondary" sx={{ textAlign: 'center', m: 0 }}>
            Posto njoftim falas ose kërko në kategoritë e mësipërme — KuTaGjej.
          </Typography>
        </Stack>
      </Container>
    </BrowserSeoSection>
  );
}

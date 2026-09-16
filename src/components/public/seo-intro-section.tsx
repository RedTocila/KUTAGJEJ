'use client';

import * as React from 'react';
import RouterLink from 'next/link';
import { Link as MuiLink, Stack, Typography } from '@mui/material';

import { paths } from '@/paths';
import { HOME_SEO_COPY } from '@/lib/public-seo-copy';
import { BrowserSeoSection } from '@/components/public/browser-seo-section';
import { PublicSeoContentBlock } from '@/components/public/public-seo-content';

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
    <BrowserSeoSection sx={{ pb: { xs: 3, md: 4 } }}>
      <Stack
        direction="row"
        spacing={1.5}
        useFlexGap
        sx={{ flexWrap: 'wrap', justifyContent: 'center', px: 2, maxWidth: 900, mx: 'auto' }}
      >
        {[
          { href: paths.public.realEstate, label: 'Prona' },
          { href: paths.public.cars, label: 'Makina' },
          { href: paths.public.jobs, label: 'Punë' },
          { href: paths.public.marketplace, label: 'Tregu' },
          { href: paths.public.businesses, label: 'Biznese' },
          { href: paths.public.professionals, label: 'Profesionistë' },
          { href: paths.auth.signIn, label: 'Hyr / Regjistrohu' },
        ].map((item) => (
          <MuiLink
            key={item.href}
            component={RouterLink}
            href={item.href}
            underline="hover"
            color="text.secondary"
            sx={{ fontSize: '0.9rem', fontWeight: 600 }}
          >
            {item.label}
          </MuiLink>
        ))}
      </Stack>
      <Typography
        component="p"
        variant="caption"
        color="text.secondary"
        sx={{ textAlign: 'center', display: 'block', mt: 1.5, px: 2 }}
      >
        Posto njoftim falas ose kërko në kategoritë e mësipërme — KuTaGjej.
      </Typography>
    </BrowserSeoSection>
  );
}

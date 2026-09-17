'use client';

import * as React from 'react';
import { Container } from '@mui/material';

import { BrowserSeoSection } from '@/components/public/browser-seo-section';
import { SeoEyebrow, SeoHeadingPanel } from '@/components/public/seo-heading-panel';

/** SEO interlude between homepage carousel pairs — community-banner container style. */
export function HomeFeedSeoInterlude({
  titleId,
  title,
  text,
}: {
  titleId: string;
  title: string;
  text: string;
}) {
  return (
    <BrowserSeoSection sx={{ py: { xs: 2.5, md: 3.5 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
        <SeoHeadingPanel
          titleId={titleId}
          title={title}
          subtext={text}
          titleComponent="h2"
          dense
          eyebrow={<SeoEyebrow>KuTaGjej</SeoEyebrow>}
        />
      </Container>
    </BrowserSeoSection>
  );
}

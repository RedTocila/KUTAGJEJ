'use client';

import * as React from 'react';
import { Box, Container } from '@mui/material';

import { OKAZION_ACCENT, OKAZION_ACCENT_SOFT } from '@/lib/home-categories';
import { verticalCityHubLinks } from '@/lib/seo-internal-links';
import { BrowserSeoSection } from '@/components/public/browser-seo-section';
import { SeoEyebrow, SeoHeadingPanel, SeoTextLinkRow } from '@/components/public/seo-heading-panel';

const accentSx = {
  color: 'primary.main',
  fontWeight: 700,
} as const;

const okazionAccentSx = {
  color: OKAZION_ACCENT,
  fontWeight: 700,
} as const;

function Accent({ children }: { children: React.ReactNode }) {
  return (
    <Box component="span" sx={accentSx}>
      {children}
    </Box>
  );
}

function OkazionAccent({ children }: { children: React.ReactNode }) {
  return (
    <Box component="span" sx={okazionAccentSx}>
      {children}
    </Box>
  );
}

/**
 * Primary homepage H1 + lead for browsers/crawlers (hidden in native app).
 * Sits under the banner slider so the promo leads, then the SEO paragraph.
 */
export function HomeBrowserHeroSeo() {
  const cityLinks = [
    ...verticalCityHubLinks('real-estate', { includeVerticalLabel: true }).slice(0, 4),
    ...verticalCityHubLinks('cars', { includeVerticalLabel: true }).slice(0, 2),
  ];
  return (
    <BrowserSeoSection
      aria-labelledby="home-seo-h1"
      sx={{
        // Stack gap is a bit wide under the slider — pull up slightly, then breathe before Okazion.
        mt: { xs: -0.75, md: -1 },
        pt: 0,
        pb: { xs: 2, md: 2.5 },
      }}
    >
      <SeoHeadingPanel
        titleId="home-seo-h1"
        dense
        titleComponent="h1"
        title={
          <>
            Njoftime <Accent>falas</Accent> në Shqipëri — <Accent>prona</Accent>, <Accent>makina</Accent>,{' '}
            <Accent>punë</Accent> dhe <Accent>tregu</Accent>
          </>
        }
        subtext={
          <>
            <Accent>KuTaGjej</Accent> është marketplace-i lokal ku poston dhe gjen shpejt:{' '}
            <Accent>apartamente me qira ose shitje</Accent>, <Accent>makina</Accent>, <Accent>vende pune</Accent>,{' '}
            <Accent>biznese</Accent>, <Accent>profesionistë</Accent> dhe artikuj të rinj e të dorës së dytë.
          </>
        }
        actions={<SeoTextLinkRow links={cityLinks} />}
      />
    </BrowserSeoSection>
  );
}

/** `/okazion` browse H1 + lead — red keyword accents. */
export function OkazionBrowserHeroSeo() {
  return (
    <BrowserSeoSection aria-labelledby="okazion-seo-h1" sx={{ pb: { xs: 1, md: 1.5 } }}>
      <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
        <SeoHeadingPanel
          titleId="okazion-seo-h1"
          dense
          tone="okazion"
          titleComponent="h1"
          eyebrow={
            <SeoEyebrow color={OKAZION_ACCENT} bgcolor={OKAZION_ACCENT_SOFT}>
              Okazion
            </SeoEyebrow>
          }
          title={
            <>
              <OkazionAccent>Okazion</OkazionAccent> — oferta me kohë të kufizuar në Shqipëri
            </>
          }
          subtext={
            <>
              <OkazionAccent>Okazion</OkazionAccent> mbledh njoftime me prioritet për{' '}
              <OkazionAccent>7 ditë</OkazionAccent>: <OkazionAccent>prona</OkazionAccent>,{' '}
              <OkazionAccent>makina</OkazionAccent>, <OkazionAccent>punë</OkazionAccent> dhe{' '}
              <OkazionAccent>tregu</OkazionAccent>. Ofertat shfaqen me temë të kuqe dhe timer — gjej shpejt dhe
              kontakto shitësin, qiradhënësin ose punëdhënësin drejtpërdrejt.
            </>
          }
        />
      </Container>
    </BrowserSeoSection>
  );
}

/** Compact SEO title block used on browse / landing heroes. */
export function BrowseBrowserHeroSeo({
  title,
  subtext,
  titleId,
}: {
  title: string;
  subtext: string;
  titleId: string;
}) {
  return (
    <BrowserSeoSection aria-labelledby={titleId} sx={{ pb: { xs: 1, md: 1.5 } }}>
      <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, md: 3, lg: 4 } }}>
        <SeoHeadingPanel titleId={titleId} title={title} subtext={subtext} titleComponent="h1" />
      </Container>
    </BrowserSeoSection>
  );
}

export function BrowseMidPageExplainer({
  heading,
  text,
  links,
}: {
  heading: string;
  text: string;
  links?: ReadonlyArray<{ href: string; label: string }>;
}) {
  return (
    <BrowserSeoSection sx={{ py: { xs: 1.5, md: 2 } }}>
      <Container maxWidth="xl">
        <SeoHeadingPanel
          titleId="browse-mid-seo"
          title={heading}
          subtext={text}
          titleComponent="h2"
          dense
          eyebrow={<SeoEyebrow>Si funksionon</SeoEyebrow>}
          actions={links?.length ? <SeoTextLinkRow links={links} /> : null}
        />
      </Container>
    </BrowserSeoSection>
  );
}

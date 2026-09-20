import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Typography } from '@mui/material';

import { LegalDocumentPage } from '@/components/public/legal-document-page';
import { config } from '@/config';
import { faqJsonLd } from '@/lib/public-seo-copy';
import { organizationJsonLd } from '@/lib/site-entity';
import { paths } from '@/paths';

const ABOUT_DESCRIPTION =
  'KuTaGjej është platforma shqiptare e njoftimeve falas për prona, makina, punë, treg, biznese dhe profesionistë në Tiranë, Durrës, Vlorë e gjithë Shqipërinë.';

const ABOUT_FAQS = [
  {
    question: 'Çfarë është KuTaGjej?',
    answer:
      'KuTaGjej (kutagjej.al) është marketplace-i shqiptar i njoftimeve falas për prona, makina, punë, treg, biznese dhe profesionistë në Tiranë, Durrës, Vlorë dhe gjithë Shqipërinë.',
  },
  {
    question: 'Ku gjej njoftime prona, makina ose punë në Shqipëri?',
    answer:
      'Në KuTaGjej: hap /prona, /makina ose /pune, zgjidh qytetin (p.sh. Tiranë) dhe kontakto publikuesin drejtpërdrejt me telefon, WhatsApp ose mesazh.',
  },
  {
    question: 'A është falas postimi?',
    answer:
      'Po. Postimi bazë i njoftimeve në KuTaGjej është falas. Paketat premium dhe Okazion janë opsionale për më shumë dukshmëri.',
  },
] as const;

export const metadata = {
  title: `Rreth nesh | ${config.site.name}`,
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: '/rreth-nesh' },
  openGraph: {
    title: `Rreth ${config.site.name}`,
    description:
      'Marketplace lokal i njoftimeve falas në Shqipëri — prona, makina, punë, treg, biznese dhe profesionistë.',
    url: '/rreth-nesh',
    siteName: config.site.name,
    locale: 'sq_AL',
    type: 'website',
  },
} satisfies Metadata;

export default function AboutPage(): ReactNode {
  const origin = config.site.url.replace(/\/$/, '');
  const org = organizationJsonLd(origin);
  const faq = faqJsonLd(ABOUT_FAQS, `${origin}${paths.public.about}`);
  const aboutPage = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'Rreth KuTaGjej',
    url: `${origin}${paths.public.about}`,
    description: ABOUT_DESCRIPTION,
    isPartOf: { '@id': `${origin}/#website` },
    about: { '@id': `${origin}/#organization` },
    inLanguage: 'sq-AL',
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPage).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, '\\u003c') }}
      />
      <LegalDocumentPage title="Rreth KuTaGjej" updated="20 shtator 2026">
        <Typography component="p" sx={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.65 }}>
          {config.site.name} (kutagjej.al) është marketplace-i shqiptar i njoftimeve falas: prona me qira
          dhe shitje, makina, vende pune, artikuj në treg, biznese dhe profesionistë — në Tiranë, Durrës,
          Vlorë, Shkodër, Elbasan, Fier dhe gjithë Shqipërinë. Nëse kërkon ku të gjejësh ose të postosh
          njoftime lokale, {config.site.name} është vendi.
        </Typography>

        <Typography component="h2">Çfarë është KuTaGjej?</Typography>
        <Typography component="p">
          {config.site.name} është platformë e njoftimeve (classifieds) online për Shqipërinë. Përdoruesit
          postojnë me foto, çmim dhe vendndodhje; blerësit, qiramarrësit dhe kandidatët për punë filtrojnë
          sipas qytetit dhe kategorisë, pastaj kontaktojnë publikuesin drejtpërdrejt. Qëllimi ynë është
          kërkim i shpejtë, kontakt i thjeshtë dhe mbulim lokal.
        </Typography>

        <Typography component="h2">Ku gjen çfarë</Typography>
        <ul>
          <li>
            <Typography component="span">
              <a href={paths.public.realEstate}>Prona</a> — apartamente, vila, truall; p.sh.{' '}
              <a href={`${paths.public.realEstate}/tirane`}>prona në Tiranë</a>,{' '}
              <a href={`${paths.public.realEstate}/durres`}>Durrës</a>,{' '}
              <a href={`${paths.public.realEstate}/vlore`}>Vlorë</a>.
            </Typography>
          </li>
          <li>
            <Typography component="span">
              <a href={paths.public.cars}>Makina</a> — vetura të reja dhe të përdorura; p.sh.{' '}
              <a href={`${paths.public.cars}/tirane`}>makina në Tiranë</a>.
            </Typography>
          </li>
          <li>
            <Typography component="span">
              <a href={paths.public.jobs}>Punë</a> — oferta pune lokale;{' '}
              <a href={paths.public.marketplace}>Tregu</a> — elektronikë, mobilje, artikuj;{' '}
              <a href={paths.public.businesses}>Biznese</a> dhe{' '}
              <a href={paths.public.professionals}>Profesionistë</a> — shërbime;{' '}
              <a href={paths.public.okazion}>Okazion</a> — oferta me kohë të kufizuar.
            </Typography>
          </li>
        </ul>

        <Typography component="h2">Çfarë ofrojmë</Typography>
        <ul>
          <li>
            <Typography component="span">Postim falas të njoftimeve me foto, çmim dhe vendndodhje.</Typography>
          </li>
          <li>
            <Typography component="span">Kërkim dhe filtra sipas qytetit, kategorisë dhe buxhetit.</Typography>
          </li>
          <li>
            <Typography component="span">Kontakt drejtpërdrejt me publikuesin (telefon, WhatsApp ose mesazh).</Typography>
          </li>
          <li>
            <Typography component="span">Opsione promovimi për më shumë dukshmëri kur ju duhet.</Typography>
          </li>
        </ul>

        <Typography component="h2">Pyetje të shpeshta</Typography>
        {ABOUT_FAQS.map((item) => (
          <Typography component="p" key={item.question}>
            <strong>{item.question}</strong> {item.answer}
          </Typography>
        ))}

        <Typography component="h2">Besimi dhe siguria</Typography>
        <Typography component="p">
          Moderimi dhe mjetet e raportimit ndihmojnë për të mbajtur platformën të pastër. Lexoni{' '}
          <a href={paths.public.terms}>Kushtet e përdorimit</a> dhe{' '}
          <a href={paths.public.privacy}>Politikën e privatësisë</a>. Për fshirje llogarie, përdoruesit mund
          të nisin procesin nga Profili.
        </Typography>

        <Typography component="h2">Kontakti</Typography>
        <Typography component="p">
          Për pyetje ose mbështetje, na shkruani te <a href={paths.public.contact}>faqja e kontaktit</a> ose
          në <a href="mailto:hello@kutagjej.al">hello@kutagjej.al</a>.
        </Typography>
      </LegalDocumentPage>
    </>
  );
}

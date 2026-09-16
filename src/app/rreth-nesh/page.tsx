import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Typography } from '@mui/material';

import { LegalDocumentPage } from '@/components/public/legal-document-page';
import { config } from '@/config';

export const metadata = {
  title: `Rreth nesh | ${config.site.name}`,
  description: `KuTaGjej është platforma shqiptare e njoftimeve falas për prona, makina, punë, treg, biznese dhe profesionistë.`,
  alternates: { canonical: '/rreth-nesh' },
} satisfies Metadata;

export default function AboutPage(): ReactNode {
  return (
    <LegalDocumentPage title="Rreth KuTaGjej" updated="16 shtator 2026">
      <Typography component="h2">Kush jemi</Typography>
      <Typography component="p">
        {config.site.name} është marketplace-i lokal ku shqiptarët postojnë dhe gjejnë njoftime për
        prona, makina, vende pune, artikuj në treg, biznese dhe shërbime profesionale. Qëllimi ynë
        është të bëjmë kërkimin dhe kontaktin sa më të shpejtë dhe të drejtpërdrejtë.
      </Typography>

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

      <Typography component="h2">Besimi dhe siguria</Typography>
      <Typography component="p">
        Moderimi dhe mjetet e raportimit ndihmojnë për të mbajtur platformën të pastër. Lexoni{' '}
        <a href="/kushtet">Kushtet e përdorimit</a> dhe <a href="/privatesia">Politikën e privatësisë</a>.
        Për fshirje llogarie, përdoruesit mund të nisin procesin nga Profili.
      </Typography>

      <Typography component="h2">Kontakti</Typography>
      <Typography component="p">
        Për pyetje ose mbështetje, na shkruani te <a href="/kontakt">faqja e kontaktit</a> ose në{' '}
        <a href="mailto:hello@kutagjej.al">hello@kutagjej.al</a>.
      </Typography>
    </LegalDocumentPage>
  );
}

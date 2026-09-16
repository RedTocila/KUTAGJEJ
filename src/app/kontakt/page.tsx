import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Typography } from '@mui/material';

import { LegalDocumentPage } from '@/components/public/legal-document-page';
import { config } from '@/config';

export const metadata = {
  title: `Kontakt | ${config.site.name}`,
  description: `Kontaktoni ekipin e KuTaGjej për mbështetje, bashkëpunime ose pyetje rreth njoftimeve.`,
  alternates: { canonical: '/kontakt' },
} satisfies Metadata;

export default function ContactPage(): ReactNode {
  return (
    <LegalDocumentPage title="Kontakt" updated="16 shtator 2026">
      <Typography component="h2">Si të na kontaktoni</Typography>
      <Typography component="p">
        Për mbështetje llogarie, probleme me njoftime, pagesa ose bashkëpunime, na shkruani në email.
        Përpiqemi të përgjigjemi sa më shpejt në ditët e punës.
      </Typography>

      <Typography component="h2">Email</Typography>
      <Typography component="p">
        <a href="mailto:hello@kutagjej.al">hello@kutagjej.al</a>
      </Typography>

      <Typography component="h2">Para se të na shkruani</Typography>
      <ul>
        <li>
          <Typography component="span">Për njoftime: kontrolloni filtrin dhe qytetin në kategorinë përkatëse.</Typography>
        </li>
        <li>
          <Typography component="span">Për llogari: hyni në panelin e përdoruesit dhe Profilin.</Typography>
        </li>
        <li>
          <Typography component="span">
            Për privatësi / fshirje llogarie: shihni <a href="/privatesia">Politikën e privatësisë</a>.
          </Typography>
        </li>
      </ul>

      <Typography component="h2">Informacion ligjor</Typography>
      <Typography component="p">
        Lexoni <a href="/kushtet">Kushtet e përdorimit</a> dhe <a href="/rreth-nesh">Rreth nesh</a> për më
        shumë rreth platformës {config.site.name}.
      </Typography>
    </LegalDocumentPage>
  );
}

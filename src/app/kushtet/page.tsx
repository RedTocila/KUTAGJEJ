import * as React from 'react';
import type { Metadata } from 'next';
import { Typography } from '@mui/material';

import { LegalDocumentPage } from '@/components/public/legal-document-page';
import { config } from '@/config';

export const metadata = {
  title: `Kushtet e përdorimit | ${config.site.name}`,
  description: `Kushtet e përdorimit të platformës ${config.site.name}.`,
} satisfies Metadata;

export default function TermsPage(): React.ReactNode {
  return (
    <LegalDocumentPage title="Kushtet e përdorimit" updated="1 gusht 2026">
      <Typography component="h2">1. Pranimi i kushteve</Typography>
      <Typography component="p">
        Duke përdorur {config.site.name}, ju pranoni këto kushte. Nëse nuk pajtoheni, mos e përdorni
        platformën.
      </Typography>

      <Typography component="h2">2. Llogaria e përdoruesit</Typography>
      <Typography component="p">
        Ju jeni përgjegjës për saktësinë e të dhënave të llogarisë dhe për ruajtjen e fjalëkalimit.
        Njoftimet dhe aktiviteti i postuar nga llogaria juaj mbeten përgjegjësi juaj.
      </Typography>

      <Typography component="h2">3. Njoftimet</Typography>
      <ul>
        <li>
          <Typography component="span">
            Postoni vetëm përmbajtje të ligjshme, të vërtetë dhe që nuk shkel të drejtat e të tjerëve.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Ne mund të moderojmë, fshehim ose heqim njoftime që shkelin rregullat e platformës.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            KuTaGjej nuk është palë në marrëveshjet mes përdoruesve.
          </Typography>
        </li>
      </ul>

      <Typography component="h2">4. Sjellja e ndaluar</Typography>
      <ul>
        <li>
          <Typography component="span">
            Mashtrim, spam, gjuhë urrejtjeje ose përmbajtje e paligjshme.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Kopjimi i paautorizuar i përmbajtjes së platformës ose të përdoruesve të tjerë.
          </Typography>
        </li>
        <li>
          <Typography component="span">Përdorimi i automatizuar që dëmton shërbimin.</Typography>
        </li>
      </ul>

      <Typography component="h2">5. Ndryshime</Typography>
      <Typography component="p">
        Mund t’i përditësojmë këto kushte. Vazhdimi i përdorimit pas publikimit të ndryshimeve
        konsiderohet pranim.
      </Typography>

      <Typography component="h2">6. Kontakti</Typography>
      <Typography component="p">
        Për pyetje rreth këtyre kushteve, na kontaktoni përmes faqes së kontaktit në {config.site.name}.
      </Typography>
    </LegalDocumentPage>
  );
}

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
    <LegalDocumentPage title="Kushtet e përdorimit" updated="4 gusht 2026">
      <Typography component="h2">1. Pranimi i kushteve</Typography>
      <Typography component="p">
        Duke përdorur {config.site.name}, ju pranoni këto kushte. Nëse nuk pajtoheni, mos e përdorni
        platformën. Regjistrimi kërkon pranimin e shprehur të këtyre kushteve dhe të politikës së
        privatësisë.
      </Typography>

      <Typography component="h2">2. Llogaria e përdoruesit</Typography>
      <Typography component="p">
        Ju jeni përgjegjës për saktësinë e të dhënave të llogarisë dhe për ruajtjen e fjalëkalimit.
        Njoftimet dhe aktiviteti i postuar nga llogaria juaj mbeten përgjegjësi juaj. Llogaritë
        individuale dhe të biznesit duhet të përdoren sipas qëllimit për të cilin janë krijuar.
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
            Ju jeni përgjegjës për saktësinë e informacionit, çmimeve, fotove dhe detajeve të njoftimeve
            tuaja.
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

      <Typography component="h2">4. Mjetet AI dhe importi i të dhënave</Typography>
      <Typography component="p">
        Platforma mund të ofrojë mjete me inteligjencë artificiale për të ndihmuar në krijimin,
        plotësimin ose përditësimin e njoftimeve (përfshirë importin nga linke, faqe ose foto).
      </Typography>
      <ul>
        <li>
          <Typography component="span">
            Ju jeni përgjegjës që të përdorni këto mjete vetëm me përmbajtje dhe burime që keni të
            drejtë t&apos;i përdorni.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Nëse importoni, skraponi ose nxirrni të dhëna nga një faqe, profil ose burim që nuk ju
            përket, ju e bëni këtë tërësisht me përgjegjësinë tuaj. {config.site.name} nuk merr asnjë
            përgjegjësi për dëmtime, pretendime, shkelje të të drejtave të autorit, shkelje të
            kushteve të palëve të treta, ose pasoja ligjore që rrjedhin nga skrapimi apo importi i
            përmbajtjes që nuk është juaja.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Draftet e gjeneruara nga AI duhet të kontrollohen nga ju para publikimit. Platforma nuk
            garanton saktësi të plotë të rezultateve të AI.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Ndalohet përdorimi i mjeteve të importit për të kopjuar njoftime ose përmbajtje të
            përdoruesve të tjerë pa leje.
          </Typography>
        </li>
      </ul>

      <Typography component="h2">5. Paketat, ngritjet dhe pagesat</Typography>
      <Typography component="p">
        Disa funksione (si njoftime premium, ngritje/boost ose paketa shtesë) mund të kërkojnë pagesë.
        Kushtet e ofertës, kohëzgjatja dhe çmimi shfaqen para blerjes. Pagesat e kryera për shërbime
        digjitale zakonisht nuk rimbursohen, përveç rasteve të kërkuara nga ligji.
      </Typography>

      <Typography component="h2">6. Sjellja e ndaluar</Typography>
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
          <Typography component="span">
            Skrapimi, importi ose ripërdorimi i faqeve dhe të dhënave të palëve të treta pa të drejtë
            ose pa leje.
          </Typography>
        </li>
        <li>
          <Typography component="span">Përdorimi i automatizuar që dëmton shërbimin.</Typography>
        </li>
      </ul>

      <Typography component="h2">7. Kufizimi i përgjegjësisë</Typography>
      <Typography component="p">
        {config.site.name} ofrohet &quot;siç është&quot;. Nuk jemi përgjegjës për humbje që rrjedhin nga
        marrëveshjet mes përdoruesve, nga përmbajtja e postuar nga përdoruesit, nga rezultatet e
        mjeteve AI, ose nga importi/skrapimi i burimeve të jashtme. Ju mbeteni përgjegjës për
        respektimin e ligjeve dhe të kushteve të palëve të treta.
      </Typography>

      <Typography component="h2">8. Ndryshime</Typography>
      <Typography component="p">
        Mund t&apos;i përditësojmë këto kushte. Vazhdimi i përdorimit pas publikimit të ndryshimeve
        konsiderohet pranim.
      </Typography>

      <Typography component="h2">9. Kontakti</Typography>
      <Typography component="p">
        Për pyetje rreth këtyre kushteve, na kontaktoni përmes faqes së kontaktit në {config.site.name}.
      </Typography>
    </LegalDocumentPage>
  );
}

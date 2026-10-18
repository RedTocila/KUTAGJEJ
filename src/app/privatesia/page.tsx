import * as React from 'react';
import type { Metadata } from 'next';
import { Typography } from '@mui/material';

import { LegalDocumentPage } from '@/components/public/legal-document-page';
import { config } from '@/config';

export const metadata = {
  title: `Politika e privatësisë | ${config.site.name}`,
  description: `Politika e privatësisë së platformës ${config.site.name}.`,
} satisfies Metadata;

export default function PrivacyPage(): React.ReactNode {
  return (
    <LegalDocumentPage title="Politika e privatësisë" updated="18 tetor 2026">
      <Typography component="h2">1. Të dhënat që mbledhim</Typography>
      <Typography component="p">
        Mbledhim të dhëna që na jepni gjatë regjistrimit dhe përdorimit të {config.site.name}: emri,
        email-i, numri i telefonit, të dhënat e biznesit, përmbajtja e njoftimeve (tekst, foto, linke
        dhe të dhëna të importuara), mesazhet mes përdoruesve dhe fotot që bashkëngjitni. Për kërkesa
        verifikimi mund të ruhet fotoja e dokumentit të identitetit që ngarkoni. Nëse e aktivizoni
        vetë njoftimin në pajisje, ruajmë token-in e pajisjes për t’ju dërguar njoftime.
      </Typography>

      <Typography component="h2">2. Si i përdorim</Typography>
      <ul>
        <li>
          <Typography component="span">Për të ofruar dhe përmirësuar shërbimin.</Typography>
        </li>
        <li>
          <Typography component="span">Për komunikim rreth llogarisë, njoftimeve dhe pagesave.</Typography>
        </li>
        <li>
          <Typography component="span">
            Për siguri, moderim dhe parandalim të keqpërdorimit — përfshirë zbulimin e përmbajtjes së
            ndaluar (p.sh. lakuriqësi, lojëra fati, droga, armë ose aktivitete të paligjshme) me mjete
            AI dhe/ose shqyrtim manual.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Për të publikuar njoftimet tuaja menjëherë dhe për t&apos;i hequr ose kufizuar ato nëse
            shkelin kushtet e përdorimit.
          </Typography>
        </li>
      </ul>

      <Typography component="h2">3. Ndarja e të dhënave</Typography>
      <Typography component="p">
        Nuk i shesim të dhënat tuaja personale. Për të funksionuar platforma, të dhënat përpunohen nga
        këta ofrues, vetëm sa duhet për rolin e tyre:
      </Typography>
      <ul>
        <li>
          <Typography component="span">
            Supabase — llogaria, baza e të dhënave dhe skedarët e ngarkuar në hapësirën publike të
            ruajtjes.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Vercel — hosting i faqes. Kur është i konfiguruar, edhe ruajtja e fotove në Vercel Blob.
          </Typography>
        </li>
        <li>
          <Typography component="span">POK Payments — pagesa me kartë në faqen e internetit.</Typography>
        </li>
        <li>
          <Typography component="span">
            Apple In-App Purchase dhe RevenueCat — blerjet e paketave brenda aplikacionit iOS. Çmimi
            shfaqet nga App Store.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            OpenAI — kur përdorni importin me AI, kërkimin me AI ose skanimin e dokumentit të
            identitetit, teksti, linket ose fotot e dërguara për atë veprim përpunohen nga OpenAI.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Apple Push Notification service — vetëm pasi të lejoni njoftimet në pajisje, për të
            dërguar njoftimin.
          </Typography>
        </li>
      </ul>
      <Typography component="p">Mund t’i ndajmë të dhënat edhe kur e kërkon ligji.</Typography>

      <Typography component="h2">4. Ruajtja dhe siguria</Typography>
      <Typography component="p">
        Ruajmë të dhënat për sa kohë llogaria është aktive dhe sa duhet për të ofruar shërbimin, dhe
        zbatojmë masa të arsyeshme teknike për t’i mbrojtur. Njoftimet e hequra për shkak të shkeljes
        së politikës së përmbajtjes mund të ruhen për qëllime auditimi, ankesash ose detyrimesh
        ligjore.
      </Typography>

      <Typography component="h2">5. Fshirja e llogarisë</Typography>
      <Typography component="p">
        Përdoruesit e regjistruar mund të nisin fshirjen e përhershme nga Profili → “Fshi llogarinë”
        (në ueb dhe në aplikacion). Para se të fshihet llogaria, sistemi mbledh shtigjet e skedarëve
        që i përkasin asaj llogarie (foto njoftimesh, avatar, foto mesazhesh, dokument verifikimi dhe
        foto të ngjashme të ngarkuara nga ju) dhe përpiqet t’i heqë nga ruajtja jonë në Supabase dhe,
        kur ekzistojnë, nga Vercel Blob. Nuk fshihen skedarë të përdoruesve të tjerë dhe as foto të
        importuara nga faqe të jashtme. Nëse heqja e skedarëve dështon, llogaria nuk fshihet dhe nuk
        ju themi se fshirja u krye. Pas fshirjes së suksesshme, llogaria e hyrjes hiqet dhe të dhënat
        e lidhura me të në bazë fshihen sipas lidhjeve të bazës.
      </Typography>
      <Typography component="p">
        Mund të kërkoni edhe qasje ose korrigjim duke na kontaktuar përmes platformës.
      </Typography>

      <Typography component="h2">6. Aplikacioni celular</Typography>
      <Typography component="p">
        Aplikacioni Zyrtar KuTaGjej hap të njëjtën platformë. Kamera dhe libraria e fotove përdoren
        kur zgjidhni foto për njoftime ose për verifikim. Njoftimet push nuk kërkohen në hapje; i
        lejoni vetë te Cilësimet e njoftimeve. Lidhjet e thella hapin faqen përkatëse të kutagjej.al.
        Në iOS, paketat paguhen përmes App Store, jo me formularin e kartës së faqes.
      </Typography>

      <Typography component="h2">7. Ndryshime</Typography>
      <Typography component="p">
        Kjo politikë mund të përditësohet. Data e përditësimit shfaqet në krye të faqes.
      </Typography>
    </LegalDocumentPage>
  );
}

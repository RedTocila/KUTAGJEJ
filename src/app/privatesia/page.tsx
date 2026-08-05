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
    <LegalDocumentPage title="Politika e privatësisë" updated="5 gusht 2026">
      <Typography component="h2">1. Të dhënat që mbledhim</Typography>
      <Typography component="p">
        Mbledhim të dhëna që na jepni gjatë regjistrimit dhe përdorimit të {config.site.name}, si emri,
        email-i, numri i telefonit, të dhënat e biznesit dhe përmbajtja e njoftimeve (tekst, foto,
        linke dhe të dhëna të importuara).
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
        Nuk i shesim të dhënat tuaja personale. Mund t’i ndajmë me ofrues shërbimesh (p.sh. pagesa,
        hosting, ofrues AI për analiza të draftëve) vetëm sa duhet për funksionimin e platformës, ose
        kur e kërkon ligji. Kur përdorni mjete AI, përmbajtja e dërguar për analizë (tekst, linke,
        foto) mund të përpunohet nga ofruesi i shërbimit AI sipas kushteve të tyre dhe të kësaj
        politike.
      </Typography>

      <Typography component="h2">4. Ruajtja dhe siguria</Typography>
      <Typography component="p">
        Ruajmë të dhënat për sa kohë është e nevojshme për qëllimet e mësipërme dhe zbatojmë masa
        të arsyeshme teknike për t’i mbrojtur. Njoftimet e hequra për shkak të shkeljes së politikës
        së përmbajtjes mund të ruhen përkohësisht për qëllime auditimi, ankesash ose detyrimesh
        ligjore.
      </Typography>

      <Typography component="h2">5. Të drejtat tuaja</Typography>
      <Typography component="p">
        Mund të kërkoni qasje, korrigjim ose fshirje të të dhënave tuaja duke na kontaktuar përmes
        platformës, sipas kufizimeve ligjore.
      </Typography>

      <Typography component="h2">6. Ndryshime</Typography>
      <Typography component="p">
        Kjo politikë mund të përditësohet. Data e përditësimit shfaqet në krye të faqes.
      </Typography>
    </LegalDocumentPage>
  );
}

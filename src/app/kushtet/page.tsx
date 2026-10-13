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
    <LegalDocumentPage title="Kushtet e përdorimit" updated="13 tetor 2026">
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

      <Typography component="h2">3. Njoftimet dhe publikimi</Typography>
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
            Njoftimet e reja publikohen menjëherë pas dërgimit (pa miratim paraprak nga administratori).
            Platforma mund të heqë, fshehë ose kufizojë njoftime më vonë nëse shkelin këto kushte ose
            ligjin.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            KuTaGjej nuk është palë në marrëveshjet mes përdoruesve.
          </Typography>
        </li>
      </ul>

      <Typography component="h2">4. Përmbajtja e ndaluar</Typography>
      <Typography component="p">
        Ndalohet publikimi i njoftimeve, fotove, teksteve ose ofertave që lidhen me (pa kufizim):
      </Typography>
      <ul>
        <li>
          <Typography component="span">
            Lakuriqësi, përmbajtje pornografike, shërbime seksuale ose materiale të të rriturve.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Lojëra fati, bast, kazino, skema lotarie ose shërbime të ngjashme të paligjshme/të
            paautorizuara.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Droga të paligjshme, substanca të kontrolluara, armë zjarrfikëse, eksplozivë ose municion.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Dhunë grafike, kërcënime, gjuhë urrejtjeje, diskriminim ose rekrutim ekstremist.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Mashtrime, dokumente të rreme, skema piramidale, mallra të vjedhura ose të falsifikuara.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Çdo aktivitet tjetër i paligjshëm ose që dëmton sigurinë e përdoruesve.
          </Typography>
        </li>
      </ul>
      <Typography component="p">
        Mjetet AI mund të zbulojnë dhe të bllokojnë draftet me përmbajtje të ndaluar. Bllokimi automatik
        nuk garanton zbulim të plotë; ju mbeteni përgjegjës për atë që publikoni, dhe administratori
        mund të heqë njoftime edhe pas publikimit.
      </Typography>

      <Typography component="h2">5. Mjetet AI dhe importi i të dhënave</Typography>
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
            AI mund të refuzojë draftet që duken të jenë në kategori të gabuar ose që shkelin politikën
            e përmbajtjes (përfshirë lakuriqësinë, lojërat e fatit dhe aktivitetet e ndaluara).
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Ndalohet përdorimi i mjeteve të importit për të kopjuar njoftime ose përmbajtje të
            përdoruesve të tjerë pa leje.
          </Typography>
        </li>
      </ul>

      <Typography component="h2">6. Paketat, ngritjet dhe pagesat</Typography>
      <Typography component="p">
        Disa funksione (si njoftime premium, ngritje/boost ose paketa shtesë) mund të kërkojnë pagesë.
        Kushtet e ofertës, kohëzgjatja dhe çmimi shfaqen para blerjes. Pagesat e kryera për shërbime
        digjitale zakonisht nuk rimbursohen, përveç rasteve të kërkuara nga ligji.
      </Typography>
      <Typography component="p">
        Blerjet brenda aplikacionit për iOS kryhen përmes Apple. Abonimet me rinovim automatik
        përshkruhen në seksionin 11. Blerjet njëherëshe (Boost Coins, Premium, Okazion, Auto-Refresh)
        nuk rinovohen. Politika e privatësisë është në{' '}
        <a href="https://www.kutagjej.al/privatesia">https://www.kutagjej.al/privatesia</a>.
      </Typography>

      <Typography component="h2">7. Sjellja e ndaluar</Typography>
      <ul>
        <li>
          <Typography component="span">
            Mashtrim, spam, gjuhë urrejtjeje ose përmbajtje e paligjshme.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Publikimi i përmbajtjes së ndaluar të përshkruar në seksionin 4.
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

      <Typography component="h2">8. Kufizimi i përgjegjësisë</Typography>
      <Typography component="p">
        {config.site.name} ofrohet &quot;siç është&quot;. Nuk jemi përgjegjës për humbje që rrjedhin nga
        marrëveshjet mes përdoruesve, nga përmbajtja e postuar nga përdoruesit, nga rezultatet e
        mjeteve AI, ose nga importi/skrapimi i burimeve të jashtme. Ju mbeteni përgjegjës për
        respektimin e ligjeve dhe të kushteve të palëve të treta.
      </Typography>

      <Typography component="h2">9. Ndryshime</Typography>
      <Typography component="p">
        Mund t&apos;i përditësojmë këto kushte. Vazhdimi i përdorimit pas publikimit të ndryshimeve
        konsiderohet pranim.
      </Typography>

      <Typography component="h2">10. Kontakti</Typography>
      <Typography component="p">
        KuTaGjej. Për pyetje, ankesa ose pretendime rreth këtyre kushteve ose aplikacionit, na
        kontaktoni në <a href="mailto:hello@kutagjej.al">hello@kutagjej.al</a> ose në{' '}
        <a href="https://www.kutagjej.al/kontakt">https://www.kutagjej.al/kontakt</a>.
      </Typography>

      <Typography component="h2">11. Abonimet me rinovim automatik (App Store)</Typography>
      <Typography component="p">
        Në aplikacionin për iOS, KuTaGjej ofron këto abonime mujore me rinovim automatik. Çmimi që
        paguani është çmimi që Apple shfaq në ekranin e blerjes për vendin dhe monedhën tuaj. Çmimet
        e katalogut në euro, para lokalizimit të Apple, janë:
      </Typography>
      <ul>
        <li>
          <Typography component="span">
            Starter Monthly — 1 muaj, rinovim automatik. Çmimi i katalogut: 14€.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Grow Monthly — 1 muaj, rinovim automatik. Çmimi i katalogut: 59€.
          </Typography>
        </li>
        <li>
          <Typography component="span">
            Elite Monthly — 1 muaj, rinovim automatik. Çmimi i katalogut: 149€.
          </Typography>
        </li>
      </ul>
      <Typography component="p">
        Pagesa ngarkohet në llogarinë tuaj Apple ID në momentin e konfirmimit të blerjes. Abonimi
        rinovohet automatikisht, përveç nëse e fikni rinovimin automatik të paktën 24 orë para
        fundit të periudhës aktuale. Llogaria ngarkohet për rinovimin brenda 24 orëve para fundit të
        periudhës, me çmimin e planit të zgjedhur.
      </Typography>
      <Typography component="p">
        Abonimet menaxhohen dhe rinovimi automatik fiket te Cilësimet e llogarisë Apple ID pas
        blerjes (Cilësimet → Apple ID → Abonimet). Anulimi hyn në fuqi në fund të periudhës së
        paguar; qasja vazhdon deri atëherë. Nëse ofrohet një periudhë prove falas, pjesa e papërdorur
        e saj humbet kur blini një abonim.
      </Typography>
      <Typography component="p">
        Rimbursimet për blerjet në App Store i trajton Apple sipas politikave të App Store, përveç
        rasteve kur ligji kërkon ndryshe. KuTaGjej ofron mirëmbajtjen dhe mbështetjen e shërbimit.
        Apple nuk është e detyruar të ofrojë mirëmbajtje ose mbështetje për aplikacionin.
      </Typography>

      <Typography component="h2">12. Apple Licensed Application</Typography>
      <Typography component="p">
        Ky seksion zbatohet për aplikacionin KuTaGjej të shkarkuar nga Apple App Store
        (&quot;Licensed Application&quot;). Teksti në anglisht më poshtë është marrëveshja e
        licencës që plotëson kushtet minimale të Apple dhe është teksti që përdoret si EULA në App
        Store.
      </Typography>
      <Typography component="p">
        This End-User License Agreement (&quot;EULA&quot;) is between you and KuTaGjej only, and not
        with Apple. KuTaGjej, not Apple, is solely responsible for the Licensed Application and its
        content. This EULA may not provide for usage rules that are less restrictive than the Usage
        Rules set forth for Licensed Applications in the Apple Media Services Terms and Conditions.
      </Typography>
      <Typography component="p">
        The license granted to you is a non-transferable license to use the Licensed Application on
        any Apple-branded products that you own or control, as permitted by the Usage Rules in the
        Apple Media Services Terms and Conditions, except that the Licensed Application may be
        accessed and used by other accounts associated with the purchaser via Family Sharing or
        volume purchasing.
      </Typography>
      <Typography component="p">
        KuTaGjej is solely responsible for providing maintenance and support for the Licensed
        Application. You and KuTaGjej acknowledge that Apple has no obligation whatsoever to furnish
        any maintenance or support services for the Licensed Application. Support:{' '}
        <a href="mailto:hello@kutagjej.al">hello@kutagjej.al</a>.
      </Typography>
      <Typography component="p">
        KuTaGjej is solely responsible for any product warranties, whether express or implied by
        law, to the extent not effectively disclaimed. If the Licensed Application fails to conform
        to any applicable warranty, you may notify Apple, and Apple will refund the purchase price
        for the Licensed Application. To the maximum extent permitted by applicable law, Apple has
        no other warranty obligation whatsoever with respect to the Licensed Application, and any
        other claims, losses, liabilities, damages, costs, or expenses attributable to any failure
        to conform to any warranty are KuTaGjej&apos;s sole responsibility.
      </Typography>
      <Typography component="p">
        You and KuTaGjej acknowledge that KuTaGjej, not Apple, is responsible for addressing any
        claims by you or any third party relating to the Licensed Application or your possession
        and/or use of it, including: (i) product liability claims; (ii) any claim that the Licensed
        Application fails to conform to any applicable legal or regulatory requirement; and (iii)
        claims arising under consumer protection, privacy, or similar legislation.
      </Typography>
      <Typography component="p">
        You and KuTaGjej acknowledge that, in the event of any third-party claim that the Licensed
        Application or your possession and use of it infringes that third party&apos;s intellectual
        property rights, KuTaGjej, not Apple, will be solely responsible for the investigation,
        defense, settlement, and discharge of any such intellectual property infringement claim.
      </Typography>
      <Typography component="p">
        You represent and warrant that (i) you are not located in a country that is subject to a
        U.S. Government embargo, or that has been designated by the U.S. Government as a
        &quot;terrorist supporting&quot; country; and (ii) you are not listed on any U.S. Government
        list of prohibited or restricted parties.
      </Typography>
      <Typography component="p">
        You must comply with applicable third-party terms of agreement when using the Licensed
        Application, including your wireless data service agreement.
      </Typography>
      <Typography component="p">
        Auto-renewable subscriptions available in the iOS app are Starter Monthly, Grow Monthly, and
        Elite Monthly. Each subscription length is 1 month. The price is the price displayed on the
        App Store purchase sheet for your storefront at the time of purchase. Catalog reference
        prices before Apple localization are Starter Monthly 14 EUR, Grow Monthly 59 EUR, and Elite
        Monthly 149 EUR. Payment is charged to your Apple ID account at confirmation of purchase.
        The subscription automatically renews unless you turn off auto-renew at least 24 hours
        before the end of the current period. Your account is charged for renewal within 24 hours
        prior to the end of the current period. You can manage the subscription and turn off
        auto-renewal in your Apple ID Account Settings after purchase. If a free trial is offered,
        any unused portion of that free trial is forfeited when you purchase a subscription. One-time
        in-app purchases (Boost Coins, Premium, Okazion, Auto-Refresh) do not auto-renew.
      </Typography>
      <Typography component="p">
        Developer: KuTaGjej. Contact for questions, complaints, or claims:{' '}
        <a href="mailto:hello@kutagjej.al">hello@kutagjej.al</a>,{' '}
        <a href="https://www.kutagjej.al/kontakt">https://www.kutagjej.al/kontakt</a>. Privacy
        Policy:{' '}
        <a href="https://www.kutagjej.al/privatesia">https://www.kutagjej.al/privatesia</a>. Terms of
        Use:{' '}
        <a href="https://www.kutagjej.al/kushtet">https://www.kutagjej.al/kushtet</a>.
      </Typography>
      <Typography component="p">
        You and KuTaGjej acknowledge and agree that Apple, and Apple&apos;s subsidiaries, are third-party
        beneficiaries of this EULA, and that, upon your acceptance of this EULA, Apple will have the
        right (and will be deemed to have accepted the right) to enforce this EULA against you as a
        third-party beneficiary.
      </Typography>
    </LegalDocumentPage>
  );
}

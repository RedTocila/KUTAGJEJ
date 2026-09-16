import type { HomeVerticalId } from '@/lib/home-categories';

export type SeoFaqItem = {
  question: string;
  answer: string;
};

export type VerticalSeoCopy = {
  headline: string;
  subtext: string;
  paragraphs: string[];
  faqs: SeoFaqItem[];
};

export const HOME_SEO_COPY = {
  headline: 'Njoftime falas në Shqipëri — prona, makina, punë dhe tregu',
  subtext:
    'KuTaGjej është marketplace-i lokal ku poston dhe gjen shpejt: apartamente me qira ose shitje, makina, vende pune, biznese, profesionistë dhe artikuj të rinj e të dorës së dytë.',
  paragraphs: [
    'Çdo ditë mijëra përdorues kërkojnë dhe publikojnë njoftime në Tiranë, Durrës, Vlorë, Shkodër, Elbasan dhe në gjithë Shqipërinë. Postimi është falas: shto foto, çmim, vendndodhje dhe detajet kryesore — njoftimi shfaqet menjëherë në kategorinë përkatëse.',
    'Krahaso oferta, filtro sipas qytetit dhe kategorisë, dhe kontakto drejtpërdrejt shitësin, qiradhënësin ose punëdhënësin. Nëse shet, jep me qira ose punëson, KuTaGjej të ndihmon të arrijë audiencën e duhur pa kompleksitet.',
  ],
  faqs: [
    {
      question: 'A është falas postimi i njoftimeve në KuTaGjej?',
      answer:
        'Po. Mund të krijosh llogari dhe të postosh njoftime falas për prona, makina, punë, treg, biznese dhe profesionistë. Paketat premium janë opsionale për më shumë dukshmëri.',
    },
    {
      question: 'Në cilat qytete funksionon KuTaGjej?',
      answer:
        'KuTaGjej mbulon gjithë Shqipërinë. Njoftimet më të shpeshta janë në Tiranë, Durrës, Vlorë, Shkodër, Elbasan, Fier, Korçë dhe qytete të tjera.',
    },
    {
      question: 'Si gjej apartament me qira ose makinë për shitje?',
      answer:
        'Hap kategorinë Prona ose Makina, filtro sipas qytetit, çmimit dhe tipit, pastaj hap njoftimin dhe kontakto publikuesin me telefon, WhatsApp ose mesazh.',
    },
    {
      question: 'A mund të postoj oferta pune ose shërbime profesionale?',
      answer:
        'Po. Seksioni Punë është për vende të lira; Profesionistë dhe Biznese janë për shërbime, freelance dhe aktivitete lokale.',
    },
    {
      question: 'Si fshihet llogaria ime?',
      answer:
        'Nga Profili në panelin e përdoruesit mund të nisësh fshirjen e përhershme të llogarisë. Detajet janë edhe në Politikën e privatësisë.',
    },
  ] satisfies SeoFaqItem[],
} as const;

export const VERTICAL_SEO_COPY: Record<HomeVerticalId, VerticalSeoCopy> = {
  'real-estate': {
    headline: 'Prona në shitje dhe me qira në Shqipëri',
    subtext:
      'Gjej apartamente, vila, dyqane, zyra dhe toka — ose posto njoftimin tënd falas në KuTaGjej.',
    paragraphs: [
      'Në seksionin Prona shfleto njoftime të përditësuara për qira dhe shitje. Filtro sipas qytetit, zonës, tipit të pronës, çmimit dhe sipërfaqes për të gjetur më shpejt atë që të duhet.',
      'Pronarët dhe agjencitë postojnë me foto dhe detaje kryesore. Kur gjen një njoftim interesant, kontakto drejtpërdrejt — pa ndërmjetës të detyrueshëm nga platforma.',
      'Kërkimet e shpeshta përfshijnë apartamente me qira në Tiranë, shtëpi për shitje në Durrës, vila në Vlorë dhe ambiente biznesi në qendra urbane.',
    ],
    faqs: [
      {
        question: 'Si postohet një pronë falas?',
        answer:
          'Krijo llogari, hap “Shto njoftim”, zgjidh Prona, plotëso tipin (qira/shitje), vendndodhjen, çmimin, sipërfaqen dhe fotot. Njoftimi publikohet pas dorëzimit.',
      },
      {
        question: 'A mund të filtroj apartamente me qira sipas qytetit?',
        answer:
          'Po. Përdor filtrat e kategorisë Prona për qytetin, zonën, tipin e pronës dhe buxhetin. Mund të hapësh edhe faqe lokale SEO si “apartamente me qira në Tiranë”.',
      },
      {
        question: 'A ka njoftime për dyqane, zyra dhe toka?',
        answer:
          'Po. Përveç apartamenteve dhe vilave, gjen ambiente biznesi, dyqane, zyra, magazina dhe toka ndërtimi ose bujqësore.',
      },
    ],
  },
  cars: {
    headline: 'Makina për shitje në Shqipëri',
    subtext:
      'Shfleto makina, motora, mjete pune dhe pjesë këmbimi — me foto, çmim, kilometrazh dhe specifikime.',
    paragraphs: [
      'Seksioni Makina të ndihmon të krahasosh oferta të reja dhe të përdorura. Filtro sipas markës, modelit, vitit, karburantit, transmisionit dhe çmimit.',
      'Shitësit individualë dhe dealership-et postojnë njoftime me detaje teknike. Hap njoftimin për galerinë e fotove dhe kontakto shitësin menjëherë.',
      'Nga makina të dorës së dytë ekonomike deri te oferta premium, KuTaGjej mbledh tregun e automjeteve në një vend.',
    ],
    faqs: [
      {
        question: 'Si gjej makina të përdorura me buxhetin tim?',
        answer:
          'Hap Makina, vendos filtër çmimi dhe markë/model. Mund të ngushtosh edhe sipas vitit, karburantit dhe qytetit.',
      },
      {
        question: 'A mund të shes makinën time falas?',
        answer:
          'Po. Posto njoftim në kategorinë Makina me foto të qarta, çmim dhe të dhëna teknike. Blërësit të kontaktojnë drejtpërdrejt.',
      },
      {
        question: 'A ka edhe motora dhe mjete pune?',
        answer:
          'Po. Përveç makinave, gjen motora, mjete pune dhe pjesë këmbimi sipas filtrave të kategorisë.',
      },
    ],
  },
  jobs: {
    headline: 'Vende të lira pune në Shqipëri',
    subtext:
      'Gjej punë full-time, part-time, remote ose sezonale — ose publiko pozicionin që po kërkon.',
    paragraphs: [
      'Seksioni Punë mbledh oferta nga kompani dhe punëdhënës lokalë. Filtro sipas industrisë, llojit të kontrates, përvojës dhe vendndodhjes.',
      'Çdo njoftim tregon rolin, kërkesat kryesore dhe si të aplikosh ose të kontaktosh. Kandidatët mund të ruajnë njoftime dhe të kthehen shpejt te ato që i interesojnë.',
      'Nga IT dhe shitje, te hotelieri, ndërtim dhe administratë — kërko sipas fushës dhe qytetit.',
    ],
    faqs: [
      {
        question: 'Si aplikoj për një vend pune?',
        answer:
          'Hap njoftimin e punës dhe ndiq udhëzimet e punëdhënësit: telefon, email ose mesazh në platformë. Lexo me kujdes kërkesat para se të kontaktosh.',
      },
      {
        question: 'A mund të postoj oferta pune falas?',
        answer:
          'Po. Punëdhënësit mund të publikojnë vende të lira falas. Për dukshmëri ekstra mund të përdoren opsione promovimi kur janë të disponueshme.',
      },
      {
        question: 'A ka punë remote ose part-time?',
        answer:
          'Po. Përdor filtrat për tipin e punës (full-time, part-time, remote, freelance, sezonale) dhe industrinë.',
      },
    ],
  },
  marketplace: {
    headline: 'Tregu online — bli dhe shit në Shqipëri',
    subtext:
      'Elektronikë, mobilje, veshje, sportive dhe shumë kategori të tjera — njoftime të reja çdo ditë.',
    paragraphs: [
      'Tregu i KuTaGjej është vendi për artikuj të rinj dhe të dorës së dytë. Filtro sipas kategorisë, gjendjes dhe qytetit për të gjetur më shpejt.',
      'Posto fotot e produktit, çmimin dhe përshkrimin. Blërësit të shohin njoftimin në listë dhe të të kontaktojnë drejtpërdrejt.',
      'Ideale për pastrim shtëpie, shitje të shpejtë ose gjetjen e diçkaje me çmim të mirë pranë teje.',
    ],
    faqs: [
      {
        question: 'Çfarë mund të shes në Treg?',
        answer:
          'Elektronikë, mobilje, veshje, libra, sportive, lodra dhe artikuj të tjerë të lejuar nga kushtet e platformës. Përmbajtja e ndaluar hiqet.',
      },
      {
        question: 'A është falas shitja e artikujve?',
        answer:
          'Po. Postimi bazë është falas. Mund të shtosh foto dhe detaje që ta bëjnë njoftimin më të besueshëm.',
      },
      {
        question: 'Si takohen blerësi dhe shitësi?',
        answer:
          'Komunikoni në platformë ose me telefon/WhatsApp dhe organizoni dorëzimin ose takimin sipas marrëveshjes suaj.',
      },
    ],
  },
  businesses: {
    headline: 'Biznese dhe shërbime lokale në Shqipëri',
    subtext:
      'Gjej restorante, dyqane, sallone, hotelë dhe shërbime — ose listo biznesin tënd në KuTaGjej.',
    paragraphs: [
      'Seksioni Biznese të ndihmon të zbulosh aktivitete lokale me informacion kontakti, kategori dhe detaje që publikohen nga vetë biznesi.',
      'Pronarët mund të postojnë profilin e biznesit, menu ose oferta, dhe të marrin rezervime ose mesazhe kur janë të aktivizuara.',
      'Kërko sipas qytetit dhe kategorisë për të gjetur shpejt atë që të duhet pranë teje.',
    ],
    faqs: [
      {
        question: 'Si listoj biznesin tim?',
        answer:
          'Hap llogari biznesi, plotëso profilin dhe posto njoftimin e biznesit me kategori, vendndodhje, foto dhe kontakt.',
      },
      {
        question: 'A shfaqen oraret dhe kontakti?',
        answer:
          'Po, kur i ke plotësuar në njoftim. Vizitorët i shohin në faqen publike të biznesit.',
      },
      {
        question: 'A mund të marr rezervime?',
        answer:
          'Disa biznese mund të aktivizojnë kërkesa rezervimi përmes platformës, sipas tipit dhe cilësimeve të njoftimit.',
      },
    ],
  },
  professionals: {
    headline: 'Profesionistë dhe shërbime freelance',
    subtext:
      'Gjej ose ofro shërbime profesionale — nga riparime dhe design, te konsulencë dhe freelance.',
    paragraphs: [
      'Seksioni Profesionistë lidh klientët me individë që ofrojnë shërbime. Shfleto sipas kategorisë dhe qytetit, pastaj kontakto drejtpërdrejt.',
      'Profesionistët postojnë portofol, përshkrim dhe mënyrë kontakti. Vlerësimet ndihmojnë klientët të zgjedhin me më shumë besim kur janë të disponueshme.',
      'Nëse ofron një shërbim, listimi në KuTaGjej të jep dukshmëri lokale pa ndërtuar faqe nga e para.',
    ],
    faqs: [
      {
        question: 'Si postoj si profesionist?',
        answer:
          'Krijo llogari, zgjidh kategorinë Profesionistë, shto përshkrimin e shërbimit, zonën dhe fotot e punëve të tua.',
      },
      {
        question: 'A mund të filtroj sipas qytetit?',
        answer:
          'Po. Përdor filtrat e kategorisë për të gjetur profesionistë pranë teje ose në qytetin që të intereson.',
      },
      {
        question: 'Si kontaktohet një profesionist?',
        answer:
          'Hap profilin/njoftimin dhe përdor telefonin, WhatsApp ose mesazhin në platformë sipas opsioneve të shfaqura.',
      },
    ],
  },
};

export function faqJsonLd(faqs: readonly SeoFaqItem[], pageUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
    url: pageUrl,
  };
}

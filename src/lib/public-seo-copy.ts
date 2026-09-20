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
    'Çdo ditë mijëra përdorues kërkojnë dhe publikojnë njoftime në Tiranë, Durrës, Vlorë, Shkodër, Elbasan, Fier, Korçë, Berat, Sarandë, Kamëz, Kavajë, Lezhë, Pogradec, Lushnjë, Gjirokastër dhe në gjithë Shqipërinë. Postimi është falas: shto foto, çmim, vendndodhje dhe detajet kryesore — njoftimi shfaqet menjëherë në kategorinë përkatëse.',
    'Krahaso oferta, filtro sipas qytetit, zonës dhe kategorisë — p.sh. Blloku, Astir, Kombinat, Lapraka, Kashar ose Komuna e Parisit në Tiranë; Plazhi dhe Currila në Durrës; Lungomare në Vlorë — pastaj kontakto drejtpërdrejt shitësin, qiradhënësin ose punëdhënësin. Nëse shet, jep me qira ose punëson, KuTaGjej të ndihmon të arrijë audiencën e duhur pa kompleksitet.',
  ],
  faqs: [
    {
      question: 'A është falas postimi i njoftimeve në KuTaGjej?',
      answer:
        'Po. Mund të krijosh llogari dhe të postosh njoftime falas për prona, makina, punë, treg, biznese dhe profesionistë në çdo qytet të Shqipërisë. Paketat premium janë opsionale për më shumë dukshmëri.',
    },
    {
      question: 'Në cilat qytete funksionon KuTaGjej?',
      answer:
        'KuTaGjej mbulon gjithë Shqipërinë. Njoftimet më të shpeshta janë në Tiranë, Durrës, Vlorë, Shkodër, Elbasan, Fier, Korçë, Berat, Sarandë, Kamëz, Kavajë, Lezhë, Pogradec, Lushnjë, Gjirokastër, Himarë, Krujë dhe bashki të tjera.',
    },
    {
      question: 'A mund të filtroj sipas zonës ose lagjes?',
      answer:
        'Po. Përveç qytetit, shumë njoftime kanë zonë ose lagje. Në Tiranë gjen p.sh. Blloku, Komuna e Parisit, Astir, Kombinat, Lapraka, Kinostudio, Don Bosko, Ali Demi, Yzberisht dhe Kashar; në Durrës Plazhi, Currila dhe Shkozet; në Vlorë Lungomare, Uji i Ftohtë dhe Skelë.',
    },
    {
      question: 'Si gjej apartament me qira ose makinë për shitje?',
      answer:
        'Hap kategorinë Prona ose Makina, filtro sipas qytetit (Tiranë, Durrës, Vlorë, etj.), zonës, çmimit dhe tipit, pastaj hap njoftimin dhe kontakto publikuesin me telefon, WhatsApp ose mesazh.',
    },
    {
      question: 'Ku gjej prona me qira në Tiranë ose plazh në Durrës dhe Vlorë?',
      answer:
        'Në Prona filtro “Tiranë” dhe zonën (Blloku, Astir, Kashar, Lapraka…). Për plazh hap Durrës (Plazhi, Currila) ose Vlorë (Lungomare, Uji i Ftohtë). Ka edhe njoftime në Sarandë, Himarë dhe Pogradec.',
    },
    {
      question: 'A mund të postoj oferta pune ose shërbime profesionale?',
      answer:
        'Po. Seksioni Punë është për vende të lira në Tiranë, Durrës, Fier, Elbasan dhe më gjerë; Profesionistë dhe Biznese janë për shërbime, freelance dhe aktivitete lokale në qytetin ose zonën tënde.',
    },
    {
      question: 'Si funksionon Tregu dhe Okazion?',
      answer:
        'Tregu është për elektronikë, mobilje, veshje dhe artikuj të dorës së dytë pranë teje — filtro sipas qytetit. Okazion thekson oferta me kohë të kufizuar që shfaqen me prioritet në krye të listës.',
    },
    {
      question: 'A ka njoftime edhe jashtë qyteteve të mëdha?',
      answer:
        'Po. Përveç qendrave urbane, gjen njoftime në Kamëz (përfshirë Bathore), Kavajë, Shijak, Lushnjë, Kuçovë, Librazhd, Gramsh, Peqin dhe bashki të tjera — zgjidh qytetin nga filtrat.',
    },
    {
      question: 'Si kontaktohet shitësi ose qiradhënësi?',
      answer:
        'Hap njoftimin dhe përdor telefonin, WhatsApp ose mesazhin në platformë. Detajet e vendndodhjes (qytet, zonë, adresë kur është publikuar) ndihmojnë të organizosh vizitë ose dorëzim.',
    },
    {
      question: 'Si fshihet llogaria ime?',
      answer:
        'Nga Profili në panelin e përdoruesit mund të nisësh fshirjen e përhershme të llogarisë. Detajet janë edhe në Politikën e privatësisë.',
    },
  ] satisfies SeoFaqItem[],
} as const;

/** Browse page `/okazion` — H1, lead, long-form + FAQ for crawlers (red accents in UI). */
export const OKAZION_SEO_COPY: VerticalSeoCopy = {
  headline: 'Okazion — oferta me kohë të kufizuar në Shqipëri',
  subtext:
    'Okazion mbledh njoftime me prioritet për 7 ditë: prona, makina, punë dhe tregu. Ofertat shfaqen me temë të kuqe dhe timer — gjej shpejt dhe kontakto shitësin, qiradhënësin ose punëdhënësin drejtpërdrejt.',
  paragraphs: [
    'Në Okazion shfaqen njoftime që kanë aktivizuar boost-in Okazion — zakonisht 7 ditë me prioritet në listë dhe dukshmëri më të lartë. Filtro sipas kategorisë (prona, makina, punë, tregu) dhe fjalëve kyçe për të gjetur oferta me kohë të kufizuar në Tiranë, Durrës, Vlorë dhe në gjithë Shqipërinë.',
    'Çdo njoftim Okazion ka timer deri në skadim. Hap njoftimin, shiko fotot dhe detajet, pastaj kontakto publikuesin me telefon, WhatsApp ose mesazh. Nëse shet ose jep me qira, mund të aktivizosh Okazion nga paneli i përdoruesit ose kur poston njoftim.',
    'Krahaso me njoftimet standarde në Prona, Makina, Punë dhe Tregu — Okazion është shtresa e ofertave urgjente që duan vëmendje të shpejtë.',
  ],
  faqs: [
    {
      question: 'Çfarë është Okazion në KuTaGjej?',
      answer:
        'Okazion është seksioni i njoftimeve me prioritet për 7 ditë. Njoftimet shfaqen me temë të kuqe, timer dhe vend më të lartë në listë që blerësit t’i gjejnë më shpejt.',
    },
    {
      question: 'Sa kohë zgjat një njoftim Okazion?',
      answer:
        'Zakonisht 7 ditë nga aktivizimi. Pas skadimit njoftimi mbetet në kategorinë e tij (p.sh. Prona ose Makina), por nuk mbahet më si Okazion aktiv.',
    },
    {
      question: 'Cilat kategori mbështeten në Okazion?',
      answer:
        'Prona, makina, punë dhe tregu. Mund të filtrosh sipas kategorisë dhe të kërkosh me fjalë kyçe në faqen Okazion.',
    },
    {
      question: 'Si aktivizoj Okazion për njoftimin tim?',
      answer:
        'Nga paneli i përdoruesit (Shpalljet e mia / paketat) ose kur poston njoftim. Mund të përdorësh vendet nga planet Grow/Elite ose të blesh Okazion me euro ose monedha Boost.',
    },
  ],
};

/** Short interludes inserted between homepage carousel pairs (SEO + readability). */
export const HOME_FEED_SEO_INTERLUDES = [
  {
    id: 'home-seo-okazion-recommended',
    title: 'Okazion dhe njoftime të rekomanduara',
    text: 'Në krye gjen ofertat Okazion me kohë të kufizuar dhe njoftimet e rekomanduara për ty — në Tiranë, Durrës, Vlorë, Shkodër, Elbasan dhe më gjerë. Hap kategorinë, filtro sipas qytetit, zonës dhe çmimit, pastaj kontakto publikuesin drejtpërdrejt — postimi mbetet falas për shitës dhe qiradhënës.',
  },
  {
    id: 'home-seo-prona-makina',
    title: 'Prona dhe makina në një vend',
    text: 'Shfleto apartamente me qira ose shitje në Tiranë (Blloku, Astir, Kombinat, Kashar…), Durrës, Vlorë, Korçë ose Sarandë, pastaj kalon te makina, motora dhe mjete pune. Krahaso foto, çmim dhe detaje teknike; kur gjen atë që të duhet, telefononi, shkruani në WhatsApp ose dërgoni mesazh nga platforma.',
  },
  {
    id: 'home-seo-pune-tregu',
    title: 'Punë dhe tregu lokal',
    text: 'Seksioni Punë mbledh vende të lira full-time, part-time dhe remote në Tiranë, Durrës, Fier, Kamëz dhe qytete të tjera; Tregu është për elektronikë, mobilje, veshje dhe artikuj të dorës së dytë pranë teje. Posto ose kërko falas — KuTaGjej lidh blerës, shitës dhe punëdhënës në gjithë Shqipërinë.',
  },
  {
    id: 'home-seo-biznese-profesioniste',
    title: 'Biznese dhe profesionistë pranë teje',
    text: 'Gjej restorante, dyqane, sallone dhe shërbime lokale në Tiranë, Durrës, Vlorë, Shkodër, Berat ose Gjirokastër, ose profesionistë për riparime, design dhe freelance në zonën tënde. Listo biznesin ose profilin tënd për dukshmëri lokale — me kontakt, foto dhe kategori të qarta për klientët që kërkojnë sot.',
  },
] as const;

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

/** Short “about this listing / how to use” copy for detail pages (browser SEO). */
export const LISTING_DETAIL_SEO: Record<
  HomeVerticalId,
  { sectionTitle: string; howTo: string; browseCta: string }
> = {
  'real-estate': {
    sectionTitle: 'Rreth këtij njoftimi të pronës',
    howTo:
      'Lexo përshkrimin, shiko fotot dhe specifika (sipërfaqe, tip, çmim). Kontakto publikuesin me telefon, WhatsApp ose mesazh për vizitë ose pyetje. Krahaso me prona të ngjashme më poshtë ose kthehu te lista e pronave.',
    browseCta: 'Shfleto më shumë prona',
  },
  cars: {
    sectionTitle: 'Rreth këtij njoftimi automjeti',
    howTo:
      'Kontrollo vitin, kilometrazhin, karburantin dhe fotot. Kontakto shitësin për provë ose negociim. Shiko edhe automjete të ngjashme ose kthehu te lista e makinave në KuTaGjej.',
    browseCta: 'Shfleto më shumë makina',
  },
  jobs: {
    sectionTitle: 'Rreth kësaj oferte pune',
    howTo:
      'Lexo kërkesat, tipin e kontrates dhe vendndodhjen. Apliko ose kontakto punëdhënësin sipas udhëzimeve në njoftim. Gjej oferta të ngjashme më poshtë ose shfleto të gjitha vendet e lira.',
    browseCta: 'Shfleto më shumë punë',
  },
  marketplace: {
    sectionTitle: 'Rreth këtij artikulli në treg',
    howTo:
      'Shiko gjendjen, çmimin dhe fotot. Kontakto shitësin për disponueshmëri dhe dorëzim. Krahaso me artikuj të ngjashëm ose hap tregun për më shumë oferta.',
    browseCta: 'Shfleto më shumë në treg',
  },
  businesses: {
    sectionTitle: 'Rreth këtij biznesi',
    howTo:
      'Shiko kategorinë, vendndodhjen dhe kontaktin. Telefono, shkruaj ose vizito sipas orarit të publikuar. Zbulo biznese të ngjashme ose shfleto të gjitha bizneset në KuTaGjej.',
    browseCta: 'Shfleto më shumë biznese',
  },
  professionals: {
    sectionTitle: 'Rreth këtij profesionisti',
    howTo:
      'Lexo përshkrimin e shërbimit dhe zonën. Kontakto për ofertë ose takim. Shiko profesionistë të ngjashëm ose hap listën e plotë të shërbimeve.',
    browseCta: 'Shfleto më shumë profesionistë',
  },
};

export function listingDetailSeoParagraphs(opts: {
  vertical: HomeVerticalId;
  listingTitle: string;
  locationLine?: string | null;
}): string[] {
  const loc = String(opts.locationLine || '').trim();
  const title = opts.listingTitle.trim() || 'Ky njoftim';
  const where = loc ? ` në ${loc}` : ' në Shqipëri';
  const verticalLabel: Record<HomeVerticalId, string> = {
    'real-estate': 'pronë',
    cars: 'automjet',
    jobs: 'ofertë pune',
    marketplace: 'artikull',
    businesses: 'biznes',
    professionals: 'shërbim profesional',
  };
  return [
    `${title} është një ${verticalLabel[opts.vertical]} i publikuar në KuTaGjej${where}. Platforma të lejon të shohësh detajet dhe të kontaktosh publikuesin drejtpërdrejt.`,
    LISTING_DETAIL_SEO[opts.vertical].howTo,
  ];
}

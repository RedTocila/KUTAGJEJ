/**
 * Seeds demo listings per vertical for filter/browse testing.
 * Idempotent: re-running removes the previous batch (demo poster email)
 * before re-inserting.
 *
 * Totals: 25 listings per vertical × 6 categories = 150 demo listings
 *
 * Usage:  node scripts/seed-listings.js
 */

require('dotenv').config();

const mongoose = require('mongoose');

const { getMongoUri } = require('../lib/get-mongo-uri');
const RealEstateCity = require('../models/RealEstateCity');
const RealEstateListing = require('../models/RealEstateListing');
const CarListing = require('../models/CarListing');
const JobListing = require('../models/JobListing');
const MarketplaceListing = require('../models/MarketplaceListing');
const DirectoryListing = require('../models/DirectoryListing');
const IndividualUser = require('../models/IndividualUser');

const DEMO_EMAIL = 'demo@kutagjej.al';
const DEMO_PASSWORD = 'demo123456';
const DEMO_PHONE = '+355 69 200 0000';
const LISTINGS_PER_CATEGORY = 25;

function padToCount(base, count, build) {
  const out = base.map((item) => ({ ...item }));
  for (let i = out.length; i < count; i += 1) {
    out.push(build(i));
  }
  return out.slice(0, count);
}

/**
 * Curated, royalty-free Unsplash photos used as cover images for demo
 * listings. Each entry includes the original photo ID so the URL is stable
 * (Unsplash never re-uses IDs), plus standard query params for an 800px,
 * crop-fitted JPG that loads quickly.
 */
const UNSPLASH_BASE = 'https://images.unsplash.com';
function unsplash(photoId) {
  return `${UNSPLASH_BASE}/${photoId}?w=900&q=80&auto=format&fit=crop`;
}

const REAL_ESTATE_IMAGES = [
  unsplash('photo-1522708323590-d24dbb6b0267'),
  unsplash('photo-1613977257363-707ba9348227'),
  unsplash('photo-1493809842364-78817add7ffb'),
  unsplash('photo-1502672260266-1c1ef2d93688'),
  unsplash('photo-1604719312566-8912e9227c6a'),
  unsplash('photo-1500382017468-9049fed747ef'),
  unsplash('photo-1560448204-e02f11c2d0e2'),
  unsplash('photo-1484154218962-a197022b5858'),
  unsplash('photo-1600585154340-be6161a56a0c'),
  unsplash('photo-1600607687939-ce8a6c25118c'),
  unsplash('photo-1600566753190-17f0baa2a6c3'),
  unsplash('photo-1600047509807-ba8f8d28e08c'),
];

const CAR_IMAGES = [
  unsplash('photo-1555215695-3004980ad54e'), // BMW
  unsplash('photo-1606664515524-ed2f786a0bd6'), // Mercedes
  unsplash('photo-1543854704-9008985c63b5'), // Volkswagen
  unsplash('photo-1560958089-b8a1929cea89'), // Tesla
  unsplash('photo-1583121274602-3e2820c69888'), // Toyota
  unsplash('photo-1606220588913-b3aacb4d2f37'), // Audi
];

const JOB_IMAGES = [
  unsplash('photo-1573497019940-1c28c88b4f3e'), // tech workspace
  unsplash('photo-1414235077428-338989a2e8c0'), // restaurant
  unsplash('photo-1556761175-5973dc0f32e7'), // sales meeting
  unsplash('photo-1504917595217-d4dc5ebe6122'), // construction site
  unsplash('photo-1552664730-d307ca884978'), // marketing team
  unsplash('photo-1521737711867-e3b97375f902'), // customer support
];

const MARKETPLACE_IMAGES = [
  unsplash('photo-1632661674596-df8be070a5c5'), // iPhone
  unsplash('photo-1555041469-a586c61ea9bc'), // sofa
  unsplash('photo-1551488831-00ddcb6c6bd3'), // winter jacket
  unsplash('photo-1512820790803-83ca734da794'), // books stack
  unsplash('photo-1485965120184-e220f721d03e'), // mountain bike
  unsplash('photo-1558060370-d644479cb6f7'), // lego/toys
  unsplash('photo-1511707171634-5f897ff02aa9'), // phone on desk
  unsplash('photo-1498049794561-7780e7231661'), // laptop
  unsplash('photo-1586023492125-27b2c045efd7'), // armchair
  unsplash('photo-1445205170230-053b83016050'), // clothes rack
  unsplash('photo-1503676260728-1c00da094a0b'), // school supplies
  unsplash('photo-1571019613454-1cb2f99b2d8b'), // gym
  unsplash('photo-1566576912321-d58ddd7a6088'), // toys
  unsplash('photo-1486262715619-67b85e0b08d3'), // car parts
  unsplash('photo-1464226184884-fa280b87d399'), // farm produce
  unsplash('photo-1454165804606-c3d57bc86b40'), // services desk
  unsplash('photo-1516321318423-f06f85e504b3'), // misc items
];

/** Listings per vertical for filter/browse testing. */
const MARKETPLACE_FILTER_SAMPLES = LISTINGS_PER_CATEGORY;

const MARKETPLACE_CATEGORIES = [
  'elektronike',
  'mobilje-shtepi',
  'veshje-aksesore',
  'libra-shkolla',
  'sport-hobi',
  'lodra',
  'automjete-pjese',
  'ushqime-bujqesi',
  'sherbime',
  'te-tjera',
];

const MARKETPLACE_CATEGORY_CATALOG = {
  elektronike: {
    items: [
      ['iPhone 13 Pro 256GB', 'Telefon Apple, bateri 89%, kuti origjinale.', 650],
      ['Samsung Galaxy S23 Ultra', '128GB, ekran i paprekur, me garanci.', 720],
      ['MacBook Air M1 2020', '8GB RAM, 256GB SSD, përdorim i lehtë.', 780],
      ['iPad Air 5 — Wi‑Fi', '64GB, me cover dhe stylus.', 420],
      ['Sony WH-1000XM4', 'Kufje noise-cancelling, gjendje perfekte.', 180],
      ['LG OLED 55" C1', 'Smart TV, përdorur 1 vit, pa burn-in.', 890],
      ['PlayStation 5 + 2 lojëra', 'Disk edition, 2 kontrolle DualSense.', 520],
      ['Dell Monitor 27" 4K', 'USB-C, ideal për punë nga shtëpia.', 240],
      ['Canon EOS 2000D', 'Body + objektiv 18-55mm, 12k foto.', 310],
      ['Apple Watch Series 8', '45mm, GPS, bateri e mirë.', 260],
      ['JBL Charge 5', 'Speaker Bluetooth, rezistent ndaj ujit.', 85],
      ['Kindle Paperwhite', 'Ekran 6.8", pa reklama, me cover.', 95],
      ['Router TP-Link AX3000', 'Wi‑Fi 6, i ri në kuti.', 55],
      ['GoPro Hero 11', 'Me aksesorë mount, përdorur në pushime.', 290],
      ['Nintendo Switch OLED', 'Me case transporti dhe 3 lojëra.', 340],
    ],
  },
  'mobilje-shtepi': {
    items: [
      ['Divan 3 vendësh + 2 kolltukë', 'Set modern, pëlhurë e pastër, pa njolla.', 180],
      ['Krevat dopio me materac', '160×200, me hapësirë ruajtjeje.', 220],
      ['Tavolinë ngrënieje + 6 karrige', 'Druri masiv, gjendje e mirë.', 350],
      ['Raft librash IKEA Billy', '3 module, ngjyrë e bardhë.', 45],
      ['Kuzhinë e kompletuar', 'L-shaped, me lavaman dhe pllaka.', 1200],
      ['Dollap garderobe 3-dyertsh', 'Me pasqyrë, ngjyrë antracit.', 280],
      ['Tavolinë kafe + TV stand', 'Set minimal, ideal për apartament.', 90],
      ['Karrige zyre ergonomike', 'Mesh back, rregullim lartësie.', 75],
      ['Komodinë + lampë nate', 'Set për dhomë gjumi, stil skandinav.', 60],
      ['Set banjo — lavaman + kabinet', 'I ri, i papërdorur (projekt i ndryshuar).', 190],
      ['Perde blackout 2×2.5m', '4 copë, ngjyrë bezhë.', 35],
      ['Tapet laminat 25 m²', 'Ngjyrë druri, mbetje nga renovimi.', 120],
      ['Karrige lëkure vintage', 'Restauruar, shumë komode.', 110],
      ['Raft kuzhine me çanta', 'Organizim i mirë, montim i lehtë.', 40],
      ['Krevat fëmijësh me shtresa', '90×200, me gardhë, ngjyrë blu.', 95],
    ],
  },
  'veshje-aksesore': {
    items: [
      ['Xhup dimëri unisex — i ri', 'Masa M, etiketa ende të vendosura.', 45],
      ['Nike Air Max 90', 'Masa 42, pak përdorur, pa gërvishtje.', 65],
      ['Çantë lëkure Michael Kors', 'Origjinale, ngjyrë e zezë.', 85],
      ['Palë syze dielli Ray-Ban', 'Aviator, me case origjinal.', 70],
      ['Xhaketë lëkure vintage', 'Masa L, stil klasik.', 55],
      ['Fustan i veçantë — i ri', 'Masa S, etiketë, ngjyrë e kuqe.', 40],
      ['Adidas tracksuit', 'Komplet, masa M, përdorur 2 herë.', 35],
      ['Orë Casio G-Shock', 'Rezistente, me kutinë origjinale.', 90],
      ['Rrip lëkure i zi', 'I ri, i papërdorur.', 15],
      ['Kapele bucket — koleksion', '3 copë, stile të ndryshme.', 20],
      ['Veshje bebe 0–6 muaj', 'Set 12 copë, të pastra.', 25],
      ['Palë çizme UGG', 'Masa 38, gjendje shumë e mirë.', 50],
      ['Byzylyk argjendi 925', 'I vogël, i pastër, me certifikatë.', 30],
      ['Xhaketë jeans Levis', 'Masa 32/32, pak e zbehur.', 28],
      ['Fular cashmere', 'Ngjyrë krem, i butë, i ri.', 38],
    ],
  },
  'libra-shkolla': {
    items: [
      ['Set librash Inxhinieri Elektrike', '15 libra universitarë, gjendje e mirë.', 30],
      ['Enciklopedi për fëmijë — 12 vëllime', 'Ilustruar, i papërdorur.', 45],
      ['Libra shkollorë klasa 9', 'Matematikë, Fizikë, Kimi — të gjitha.', 18],
      ['Roman shqip — koleksion', '8 libra autorësh shqiptarë.', 22],
      ['Libra anglisht — IELTS prep', 'Cambridge + praktikë, me shënime.', 25],
      ['Atlas gjeografik + harta', 'I ri, për shkollë/mësim.', 12],
      ['Libra mjekësie — anatomi', '3 vëllime, foto me ngjyra.', 55],
      ['Fletore + stilolapsa — paketë', '20 fletore A4, stilolapsa Pilot.', 8],
      ['Kalkulator shkencor Casio', 'fx-991EX, i papërdorur.', 28],
      ['Libra letërsi — bestseller', '6 libra në anglisht, paperback.', 15],
      ['Ditar + planner akademik', '2025–2026, i ri në folie.', 10],
      ['Libra histori Shqipërie', '4 vëllime, hardcover.', 35],
      ['Materiale arti — vizatim', 'Ngjyra akuarel, brusha, canvas.', 20],
      ['Libra programimi', 'JavaScript, Python, React — 5 libra.', 40],
      ['Abacus + libra matematikë fëmijë', 'Për moshë 6–10 vjeç.', 14],
    ],
  },
  'sport-hobi': {
    items: [
      ['Biçikletë sportive Trek Marlin 7', 'Masa L, goma të reja, frenat hidraulike.', 220],
      ['Set peshash 20 kg', 'Dumbbells adjustable, me stand.', 85],
      ['Tavolinë ping-pong', 'Palosje, me rrjetë dhe 4 raketa.', 120],
      ['Kajak dy-vendësh', 'Me pedra dhe vest, përdorur 2 sezon.', 350],
      ['Kamera filmi Pentax K1000', 'Analog, me objektiv 50mm.', 95],
      ['Set golf — 7 shkopinj', 'Për fillestarë, me çantë transporti.', 110],
      ['Rollerblade inline — masa 42', 'Me mbrojtës, gjendje e mirë.', 45],
      ['Tentë kampingu 4 persona', 'Waterproof, me shtroja.', 75],
      ['Skis + shkopinj — 170 cm', 'Për nivel mesatar, servisuar.', 180],
      ['Set peshëkim — 12 copë', 'Me kapëse dhe linja.', 55],
      ['Yoga mat + bllok', 'Premium, pak përdorur.', 18],
      ['Drone DJI Mini 2', 'Me 2 bateri, fluturim i testuar.', 320],
      ['Gitarë akustike Yamaha', 'Për fillestarë, me case.', 140],
      ['Tavolinë bilardo mini', 'Për shtëpi, 120 cm.', 200],
      ['Set lojëra board — 8 lojëra', 'Catan, Monopoly, Scrabble etj.', 35],
    ],
  },
  lodra: {
    items: [
      ['LEGO Technic Bugatti Chiron', 'Set 42083, kuti e mbyllur, i ri.', 320],
      ['Doll Barbie — koleksion', '5 kukulla me veshje, të pastra.', 25],
      ['Makinë RC off-road', 'Me 2 bateri dhe charger.', 45],
      ['Set Play-Doh — 24 ngjyra', 'I papërdorur, i sigurt për fëmijë.', 18],
      ['Karrige lëkundjeje për bebe', 'Me muzikë dhe vibrim.', 35],
      ['Lojëra edukative Montessori', 'Druri, për moshë 2–4 vjeç.', 30],
      ['Hot Wheels — 30 makina', 'Koleksion, me garazh.', 22],
      ['Puzzle 1000 copë — peizazh', 'I ri, i papërdorur.', 12],
      ['Set ndërtimi magnetic', '120 copë, për moshë 3+.', 28],
      ['Kukull interaktive — fluturon', 'Me bateri, funksionon.', 40],
      ['Lojëra video për fëmijë — Switch', 'Mario Kart, Pokémon — 3 lojëra.', 55],
      ['Trampolinë 1.2m', 'Me rrjetë sigurie, për oborr.', 65],
      ['Set shkencor për fëmijë', 'Mikroskop + eksperimente.', 38],
      ['Kostum Halloween — superhero', 'Masa 8–10 vjeç, i përdorur 1 herë.', 15],
      ['Lojëra LEGO City — stacion zjarrfikësish', 'I montuar, me kutinë.', 42],
    ],
  },
  'automjete-pjese': {
    items: [
      ['Goma verore 205/55 R16 — set 4', 'Michelin, tread 7mm, 1 sezon.', 180],
      ['Bateri makine 70Ah', 'Varta, e testuar, 6 muaj garanci.', 65],
      ['Set frenash — para', 'BMW E90, disqe + pads, të reja.', 120],
      ['Navigim Android Auto', '7" touch, me kamera mbrapa.', 85],
      ['Amortizatorë — 2 copë', 'VW Golf 7, origjinalë OEM.', 95],
      ['Karrige fëmije ISOFIX', 'Grup 1/2/3, gjendje e mirë.', 55],
      ['Box bagazhi — 480L', 'Thule, me çelësin.', 110],
      ['Set llambash LED H7', '6000K, homologuar.', 25],
      ['Filter ajri + vaji — set servisi', 'Për Mercedes W204.', 35],
      ['Radio Pioneer Bluetooth', 'Me USB, pa defekte.', 70],
      ['Set chain dimerë', 'Për SUV, masa 225/65 R17.', 45],
      ['Alternator i riuturuar', 'Opel Astra H 1.7 CDTI.', 90],
      ['Kondicioner klimatizimi — recharge', 'Servis + gaz, në vend.', 40],
      ['Tapiceri lëkure — sedilje', 'Custom, për 2 sedilje para.', 200],
      ['Kamerë dashcam 4K', 'Me GPS, night vision.', 60],
    ],
  },
  'ushqime-bujqesi': {
    items: [
      ['Vaj ulliri extra virgin — 20L', 'Berat, i prodhuar 2024, i filtruar.', 85],
      ['Mjalte natyrale — 5 kg', 'Malësore, pa përpunim.', 35],
      ['Arra të thata — 10 kg', 'Tirana, të freskëta, të thara.', 45],
      ['Domate konservë — 24 kavanoza', 'Recetë familjare, pa aditivë.', 28],
      ['Mish viçi — ngrirë 15 kg', 'Fermë lokale, i certifikuar.', 120],
      ['Verë e kuqe — 12 shishe', 'Korçë, viti 2019, koleksion.', 95],
      ['Rrush i thatë — 8 kg', 'Musht, pa farë, për konsum.', 22],
      ['Djathë i bardhë — 5 kg', 'Gjirokastër, i freskët.', 40],
      ['Farë perimesh — paketë', 'Domate, speca, patëllxhan — bio.', 12],
      ['Makinë kositjeje — e vjetër', 'Funksionale, për oborr/kopsht.', 150],
      ['Ullinj — 50 kg', 'Për prodhim vaji, sezoni 2025.', 180],
      ['Mëllaga — 3 koshere', 'Organike, nga malësia.', 55],
      ['Pemë frutore — 10 copë', 'Mollë, kumbull, qershi — fidanë.', 65],
      ['Miell integral — 25 kg', 'Grurë lokal, i bluar fresk.', 18],
      ['Pajisje ujitjeje — drip system', 'Për kopsht 200 m², i ri.', 75],
    ],
  },
  sherbime: {
    items: [
      ['Pastrim apartamenti — çmim fiks', 'Apartament 2+1, materiale të përfshira.', 45],
      ['Transport dhe ngarkim', 'Kamion me lift, brenda Tiranës.', 50],
      ['Riparim telefonash', 'Ekran, bateri, charging port — garanci.', 0],
      ['Kurs anglisht — 10 seanca', 'Online ose në zyrë, nivel fillestar.', 120],
      ['Montim mobiljesh IKEA', 'Çdo lloj, me garanci montimi.', 35],
      ['Fotograf produktesh', '10 foto, editim, për e-commerce.', 80],
      ['Kujdes për kafshë — ditore', 'Qen ose mace, me raport ditor.', 15],
      ['Dizajn logo + kartvizita', 'Paketë fillestare për biznes të ri.', 150],
      ['Kopje dhe printim — A4/A3', '100 faqe, ngjyra ose bardhë e zi.', 12],
      ['Instalim kondicioneri', 'Split 12000 BTU, me materiale.', 60],
      ['Traductim shqip–anglisht', 'Dokumente, 5 faqe, i certifikuar.', 40],
      ['Organizim eventi — konsulencë', 'Dasmë ose ditëlindje, plan 2 orë.', 100],
      ['Riparim biçikletash', 'Servis i plotë + goma.', 25],
      ['Kursi drejtimi — orë shtesë', 'Instruktor me 10 vjet përvojë.', 20],
      ['Menaxhim social media — 1 muaj', '4 postime, 2 story/set javë.', 200],
    ],
  },
  'te-tjera': {
    items: [
      ['Kuti lëvizjeje — 20 copë', 'Karton i fortë, me shirit.', 25],
      ['Instrument muzikor — violinë', 'Për fillestarë, me case.', 95],
      ['Koleksion monedhash', 'Shqipëri + Evropë, 50 copë.', 120],
      ['Antik — orë mur', 'Vit 1960, funksionale.', 75],
      ['Akuarium 100L + peshq', 'Me filter dhe dritë LED.', 85],
      ['Set kopshtarie — lopata, secetë', 'Stainless steel, i ri.', 30],
      ['Valixhe cabin size', '4 rrota, TSA lock, ngjyrë blu.', 40],
      ['Koleksion pullash', '200 pulla, album i përfshirë.', 35],
      ['Piano digital Yamaha', '88 taste, me bench dhe pedal.', 450],
      ['Kafshë shtëpiake — hamster', 'Me kafaz, ushqim 1 muaj.', 20],
      ['Set gatimi profesional', '10 pjesë, inox, i papërdorur.', 55],
      ['Llamba dekor — 3 copë', 'Industrial style, E27.', 28],
      ['Skulpturë druri — dekor', 'E punuar me dorë, 40 cm.', 65],
      ['Koleksion vinylesh', '15 disqe, rock & jazz.', 90],
      ['Generator 2.5 kW', 'Benzinë, i testuar, i mirëmbajtur.', 280],
    ],
  },
};

const BUSINESS_DIRECTORY_IMAGES = [
  unsplash('photo-1517248135467-4c7edcad34c4'), // restaurant dining
  unsplash('photo-1543007630-9710e4a00a20'), // bar interior
  unsplash('photo-1501339847302-ac426a4a7cbb'), // speciality coffee
  unsplash('photo-1559339352-11d035aa65de'), // brunch / cafe table
  unsplash('photo-1565299624946-b28f40a0ae38'), // pizza / food
  unsplash('photo-1558618666-fcd25c85cd64'), // pastry / dessert
];

const PROFESSIONAL_DIRECTORY_IMAGES = [
  unsplash('photo-1522071820081-009f0129c71c'), // team collaboration
  unsplash('photo-1573496359132-6a29656c1867'), // professional portrait
  unsplash('photo-1552664730-d307ca884978'), // workshop
  unsplash('photo-1551434678-e076c223a692'), // developers
  unsplash('photo-1504384308090-c894fdcc538d'), // presentation
  unsplash('photo-1523240795612-9a054b0db644'), // training / classroom
];

// ---------------------------------------------------------------------------
// Demo cities & zones (only inserted when missing)
// ---------------------------------------------------------------------------

const DEMO_CITIES = [
  {
    name: 'Tiranë',
    slug: 'tirane',
    zones: [
      { name: 'Bllok', slug: 'bllok' },
      { name: 'Sheshi Skënderbej', slug: 'sheshi-skenderbej' },
      { name: 'Pazari i Ri', slug: 'pazari-i-ri' },
      { name: 'Myslym Shyri', slug: 'myslym-shyri' },
      { name: '21-Dhjetori', slug: '21-dhjetori' },
      { name: 'Komuna e Parisit', slug: 'komuna-e-parisit' },
      { name: 'Lundër', slug: 'lunder' },
      { name: 'Farkë', slug: 'farke' },
      { name: 'Astir', slug: 'astir' },
    ],
  },
  {
    name: 'Durrës',
    slug: 'durres',
    zones: [
      { name: 'Plepa', slug: 'plepa' },
      { name: 'Currila', slug: 'currila' },
      { name: 'Qendër', slug: 'qender' },
    ],
  },
  {
    name: 'Vlorë',
    slug: 'vlore',
    zones: [
      { name: 'Lungomare', slug: 'lungomare' },
      { name: 'Skelë', slug: 'skele' },
    ],
  },
  {
    name: 'Shkodër',
    slug: 'shkoder',
    zones: [
      { name: 'Qendër', slug: 'qender' },
      { name: 'Rus', slug: 'rus' },
    ],
  },
];

function collectLocationPairs() {
  const pairs = [];
  for (const city of DEMO_CITIES) {
    for (const zone of city.zones) {
      pairs.push([city.slug, zone.slug]);
    }
  }
  return pairs;
}

async function ensureCities() {
  for (const c of DEMO_CITIES) {
    const existing = await RealEstateCity.findOne({ slug: c.slug });
    if (existing) {
      // Make sure the demo zones we reference exist on this city.
      let dirty = false;
      for (const z of c.zones) {
        if (!existing.zones.some((ez) => ez.slug === z.slug)) {
          existing.zones.push(z);
          dirty = true;
        }
      }
      if (dirty) await existing.save();
    } else {
      await RealEstateCity.create({ name: c.name, slug: c.slug, zones: c.zones });
    }
  }
}

async function ensureDemoUser() {
  let user = await IndividualUser.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = new IndividualUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      firstName: 'Demo',
      lastName: 'User',
      phone: DEMO_PHONE,
      role: 'individual-user',
      isActive: true,
    });
    await user.save();
  }
  return user;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

async function loadCities() {
  const cities = await RealEstateCity.find({ slug: { $in: DEMO_CITIES.map((c) => c.slug) } });
  const bySlug = new Map(cities.map((c) => [c.slug, c]));
  function pick(citySlug, zoneSlug) {
    const city = bySlug.get(citySlug);
    if (!city) throw new Error(`Demo city not seeded: ${citySlug}`);
    const zone = city.zones.find((z) => z.slug === zoneSlug);
    if (!zone) throw new Error(`Demo zone not seeded: ${citySlug}/${zoneSlug}`);
    return { cityId: city._id, zoneId: zone._id, cityName: city.name };
  }
  return { bySlug, pick };
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

function realEstateSeeds(loc) {
  const base = [
    {
      ...loc.pick('tirane', 'komuna-e-parisit'),
      propertyCategory: 'apartment',
      title: 'Apartament 2+1 me pamje në Komuna e Parisit',
      description:
        'Apartament i ri 2+1 me ballkon të gjerë, pamje hapur, ngrohje qendrore dhe ashensor. Vetëm 5 minuta nga qendra.',
      transactionType: 'sale',
      price: 92000,
      currency: 'EUR',
      surfaceM2: 75,
      condition: 'new',
      floor: 6,
      bedrooms: 2,
      bathrooms: 1,
      furnishing: 'unfurnished',
      yearBuilt: 2024,
    },
    {
      ...loc.pick('tirane', 'lunder'),
      propertyCategory: 'villa',
      title: 'Vilë luksoze 4+1 me oborr & pishinë në Lundër',
      description:
        'Vilë private 320 m² me oborr 600 m², pishinë, parking për 3 makina dhe sistem alarmi. E mobiluar plotësisht.',
      transactionType: 'sale',
      price: 420000,
      currency: 'EUR',
      surfaceM2: 320,
      totalFloors: 3,
      bedrooms: 4,
      bathrooms: 3,
      furnishing: 'furnished',
    },
    {
      ...loc.pick('vlore', 'lungomare'),
      propertyCategory: 'penthouse-duplex',
      title: 'Penthouse duplex me pamje deti, Lungomare',
      description:
        'Penthouse 2-katësh me terracë private 50 m² dhe pamje 180° të detit. Përfshin parking nëntokësor dhe magazinë.',
      transactionType: 'sale',
      price: 285000,
      currency: 'EUR',
      surfaceM2: 145,
      condition: 'renovated',
      bedrooms: 3,
      bathrooms: 2,
      furnishing: 'partially-furnished',
    },
    {
      ...loc.pick('tirane', 'bllok'),
      propertyCategory: 'apartment',
      title: 'Apartament 1+1 me qira në Bllok',
      description:
        'Apartament i mobiluar me kuzhinë moderne, internet, klimë dhe ashensor. I gatshëm për banim që sot.',
      transactionType: 'rent',
      price: 450,
      currency: 'EUR',
      surfaceM2: 55,
      condition: 'good-condition',
      floor: 4,
      bedrooms: 1,
      bathrooms: 1,
      furnishing: 'furnished',
      yearBuilt: 2018,
    },
    {
      ...loc.pick('durres', 'plepa'),
      propertyCategory: 'shop',
      title: 'Dyqan 80 m² në rrugë kryesore, Plepa',
      description:
        'Dyqan me dy hyrje, vitrina të gjera, magazinë në krye dhe akses i shkëlqyer për klientët. Ideal për retail.',
      transactionType: 'sale',
      price: 75000,
      currency: 'EUR',
      surfaceM2: 80,
      condition: 'good-condition',
    },
    {
      ...loc.pick('tirane', 'farke'),
      propertyCategory: 'building-plot',
      title: 'Tokë ndërtimi 1500 m² me leje në Farkë',
      description:
        'Truall me dokumentacion të rregullt, koeficient ndërtimi i miratuar, akses asfaltuar. Ideale për vila ose objekt 4-katësh.',
      transactionType: 'sale',
      price: 180000,
      currency: 'EUR',
      surfaceM2: 1500,
    },
    {
      ...loc.pick('tirane', 'sheshi-skenderbej'),
      propertyCategory: 'apartment',
      title: 'Studio modern pranë Sheshit Skënderbej',
      description: 'Studio i rinovuar 38 m², kati i 3-të, ashensor, ideal për investim me qira afatgjatë.',
      transactionType: 'sale',
      price: 68000,
      currency: 'EUR',
      surfaceM2: 38,
      condition: 'renovated',
      floor: 3,
      bedrooms: 0,
      bathrooms: 1,
      furnishing: 'unfurnished',
      yearBuilt: 1975,
    },
    {
      ...loc.pick('tirane', 'pazari-i-ri'),
      propertyCategory: 'apartment',
      title: 'Apartament 2+1 me qira — Pazari i Ri',
      description: 'Banese e qetë 68 m², kuzhinë e hapur, 2 dhoma, parkim në oborr. Qera mujore.',
      transactionType: 'rent',
      price: 380,
      currency: 'EUR',
      surfaceM2: 68,
      condition: 'good-condition',
      floor: 2,
      bedrooms: 2,
      bathrooms: 1,
      furnishing: 'partially-furnished',
      yearBuilt: 2005,
    },
    {
      ...loc.pick('tirane', 'myslym-shyri'),
      propertyCategory: 'office',
      title: 'Zyrë 95 m² në Myslym Shyri',
      description: 'Hapësirë zyre me ndarje open-space, klimë, internet fibër. Kontratë qiraje 12+ muaj.',
      transactionType: 'rent',
      price: 850,
      currency: 'EUR',
      surfaceM2: 95,
      condition: 'new',
      floor: 5,
      furnishing: 'unfurnished',
      yearBuilt: 2022,
    },
    {
      ...loc.pick('tirane', '21-dhjetori'),
      propertyCategory: 'apartment',
      title: 'Apartament 1+1 ekonomik — 21-Dhjetori',
      description: 'Apartament i vogël por funksional, afër linjave të autobusit dhe marketeve.',
      transactionType: 'rent',
      price: 280,
      currency: 'EUR',
      surfaceM2: 42,
      condition: 'good-condition',
      floor: 1,
      bedrooms: 1,
      bathrooms: 1,
      furnishing: 'unfurnished',
      yearBuilt: 1990,
    },
    {
      ...loc.pick('tirane', 'astir'),
      propertyCategory: 'apartment',
      title: 'Apartament familjar 3+1 në Astir',
      description: 'Banese 92 m² me ballkon, 2 banjo, ngrohje individuale. Shitje me dokumentacion të plotë.',
      transactionType: 'sale',
      price: 105000,
      currency: 'EUR',
      surfaceM2: 92,
      condition: 'good-condition',
      floor: 7,
      bedrooms: 3,
      bathrooms: 2,
      furnishing: 'partially-furnished',
      yearBuilt: 2015,
    },
    {
      ...loc.pick('tirane', 'bllok'),
      propertyCategory: 'parking',
      title: 'Vendparkim të mbuluar në Bllok',
      description: 'Garazh i sigurt me kartë hyrje, i përshtatshëm për banorë të zonës.',
      transactionType: 'sale',
      price: 22000,
      currency: 'EUR',
      surfaceM2: 14,
      parkingFloor: -1,
    },
  ];

  const pairs = collectLocationPairs();
  const extraCategories = [
    'apartment',
    'room-studio-attic',
    'shop',
    'office',
    'commercial-local',
    'warehouse',
    'part-of-villa',
  ];
  const conditions = ['new', 'renovated', 'good-condition', 'in-construction'];
  const furnishings = ['furnished', 'unfurnished', 'partially-furnished', 'kitchen-only'];

  return padToCount(base, LISTINGS_PER_CATEGORY, (n) => {
    const [citySlug, zoneSlug] = pairs[n % pairs.length];
    const category = extraCategories[n % extraCategories.length];
    const tx = n % 4 === 0 ? 'rent' : 'sale';
    const surfaceM2 = 32 + (n * 19) % 420;
    const price = tx === 'rent' ? 260 + (n * 41) % 950 : 42000 + (n * 9300) % 480000;
    const doc = {
      ...loc.pick(citySlug, zoneSlug),
      propertyCategory: category,
      title: `${category === 'apartment' ? 'Apartament' : category} demo #${n + 1} — ${zoneSlug.replace(/-/g, ' ')}`,
      description: `Listim demo #${n + 1} për testim filtrash. ${tx === 'rent' ? 'Me qira' : 'Në shitje'}, ${surfaceM2} m².`,
      transactionType: tx,
      price,
      currency: 'EUR',
      surfaceM2,
    };

    if (['apartment', 'room-studio-attic', 'part-of-villa'].includes(category)) {
      doc.condition = conditions[n % conditions.length];
      doc.furnishing = furnishings[n % furnishings.length];
      doc.bedrooms = n % 4;
      doc.bathrooms = 1 + (n % 2);
      doc.yearBuilt = 1992 + (n % 30);
      if (category === 'apartment') doc.floor = 1 + (n % 9);
    } else if (['shop', 'office', 'commercial-local', 'warehouse'].includes(category)) {
      doc.condition = conditions[n % conditions.length];
      if (category === 'office') doc.floor = 1 + (n % 8);
    }

    return doc;
  });
}

function carSeeds(loc) {
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  const base = [
    {
      cityId: cityId('tirane'),
      make: 'BMW',
      model: '320d Series 3',
      variant: 'M-Sport',
      description: 'Mirëmbajtur në servisin zyrtar BMW, full opsion, sedile lëkure, navigim. Asnjë defekt.',
      year: 2018,
      kilometers: 145000,
      transmission: 'automatic',
      fuelType: 'diesel',
      price: 18500,
      currency: 'EUR',
      color: 'white',
      finish: ['metallic'],
      extras: ['LED headlights', 'Heated windshield', 'Tinted windows'],
    },
    {
      cityId: cityId('durres'),
      make: 'Mercedes-Benz',
      model: 'C220 CDI',
      variant: 'AMG line',
      description: 'Servisuar rregullisht, dokumentacion i plotë, gomat të reja. Pa aksidente.',
      year: 2016,
      kilometers: 198000,
      transmission: 'automatic',
      fuelType: 'diesel',
      price: 14900,
      currency: 'EUR',
      color: 'black',
      finish: ['metallic'],
      extras: ['LED headlights', 'Sports package', 'Sunroof'],
    },
    {
      cityId: cityId('tirane'),
      make: 'Volkswagen',
      model: 'Golf 7',
      variant: 'Highline',
      description: 'Golf 7 1.6 TDI, manual, makinë e pastër me letra Shqipërie. Ideale për qytet.',
      year: 2017,
      kilometers: 165000,
      transmission: 'manual',
      fuelType: 'diesel',
      price: 11500,
      currency: 'EUR',
      color: 'grey',
      finish: ['metallic'],
      extras: ['ABS', 'Alloy wheels', 'Bluetooth'],
    },
    {
      cityId: cityId('tirane'),
      make: 'Tesla',
      model: 'Model 3',
      variant: 'Long Range',
      description: 'Tesla Model 3 Long Range, autonomi 580 km, autopilot, akumulator në gjendje shumë të mirë.',
      year: 2021,
      kilometers: 65000,
      transmission: 'automatic',
      fuelType: 'electric',
      price: 38500,
      currency: 'EUR',
      color: 'white',
      finish: [],
      extras: ['Panoramic roof', 'Lane change assist', 'Adaptive lighting'],
    },
    {
      cityId: cityId('vlore'),
      make: 'Toyota',
      model: 'Corolla Hybrid',
      variant: 'Style',
      description: 'Hibrid me konsum 4.2 L/100km, mirëmbajtje në Toyota, kondicioner dual-zone.',
      year: 2020,
      kilometers: 87000,
      transmission: 'automatic',
      fuelType: 'hybrid-petrol',
      price: 21900,
      currency: 'EUR',
      color: 'blue',
      finish: ['metallic'],
      extras: ['LED headlights', 'Hill-start assist', 'Lane change assist'],
    },
    {
      cityId: cityId('shkoder'),
      make: 'Audi',
      model: 'Q5',
      variant: '2.0 TDI Quattro',
      description: 'SUV familjar, gjendje perfekte, leather seats, panoramic roof, parking sensors.',
      year: 2019,
      kilometers: 112000,
      transmission: 'automatic',
      fuelType: 'diesel',
      price: 32000,
      currency: 'EUR',
      color: 'black',
      finish: ['metallic'],
      extras: ['Panoramic roof', 'Heated windshield', 'LED headlights', 'Adaptive lighting'],
    },
    {
      cityId: cityId('tirane'),
      make: 'Ford',
      model: 'Fiesta',
      variant: '1.0 EcoBoost',
      description: 'Makinë ekonomike për qytet, konsum i ulët, letra të rregullta, pa defekte.',
      year: 2015,
      kilometers: 210000,
      transmission: 'manual',
      fuelType: 'petrol',
      price: 6200,
      currency: 'EUR',
      color: 'red',
      finish: ['metallic'],
      extras: ['ABS', 'Bluetooth'],
    },
    {
      cityId: cityId('durres'),
      make: 'Hyundai',
      model: 'Kona',
      variant: 'Electric',
      description: 'SUV elektrik me autonomi 400 km, karikues AC/DC, garanci baterie aktive.',
      year: 2022,
      kilometers: 34000,
      transmission: 'automatic',
      fuelType: 'electric',
      price: 26500,
      currency: 'EUR',
      color: 'green',
      finish: ['metallic'],
      extras: ['LED headlights', 'Lane change assist'],
    },
  ];

  const citySlugs = ['tirane', 'durres', 'vlore', 'shkoder'];
  const makeModels = [
    ['Audi', 'A4', '2.0 TDI'],
    ['Peugeot', '208', 'GT Line'],
    ['Renault', 'Clio', 'Intens'],
    ['Skoda', 'Octavia', 'Style'],
    ['Nissan', 'Qashqai', 'Tekna'],
    ['Kia', 'Sportage', 'GT-Line'],
    ['Mazda', 'CX-5', 'Skyactiv'],
    ['Volvo', 'XC60', 'Momentum'],
    ['Opel', 'Corsa', 'Edition'],
    ['Seat', 'Leon', 'FR'],
    ['Honda', 'Civic', 'Elegance'],
    ['Jeep', 'Compass', 'Limited'],
    ['Dacia', 'Duster', 'Comfort'],
    ['Mini', 'Cooper', 'Classic'],
    ['Porsche', 'Macan', 'S'],
    ['Lexus', 'IS300h', 'F Sport'],
    ['Citroën', 'C3', 'Feel'],
    ['Fiat', '500', 'Lounge'],
    ['Subaru', 'Forester', 'Premium'],
    ['Suzuki', 'Vitara', 'GLX'],
  ];
  const fuels = ['petrol', 'diesel', 'electric', 'hybrid-petrol', 'hybrid-diesel', 'lpg'];
  const transmissions = ['automatic', 'manual'];
  const colors = ['white', 'black', 'grey', 'blue', 'red', 'silver', 'green'];

  return padToCount(base, LISTINGS_PER_CATEGORY, (n) => {
    const mm = makeModels[n % makeModels.length];
    return {
      cityId: cityId(citySlugs[n % citySlugs.length]),
      make: mm[0],
      model: mm[1],
      variant: mm[2],
      description: `Makinë demo #${n + 1} — e mirëmbajtur, dokumentacion i plotë.`,
      year: 2011 + (n % 13),
      kilometers: 28000 + (n * 12400) % 240000,
      transmission: transmissions[n % transmissions.length],
      fuelType: fuels[n % fuels.length],
      price: 4800 + (n * 1750) % 48000,
      currency: 'EUR',
      color: colors[n % colors.length],
      finish: n % 2 === 0 ? ['metallic'] : ['matte'],
      extras: n % 3 === 0 ? ['Panoramic roof', 'LED headlights'] : ['ABS', 'Bluetooth'],
    };
  });
}

function jobSeeds(loc) {
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  const base = [
    {
      cityId: cityId('tirane'),
      title: 'Senior Frontend Developer (React / Next.js)',
      description:
        'Po kërkojmë një Senior Frontend që të na ndihmojë të ndërtojmë produkte të reja. Stack: React, Next.js, TypeScript, MUI.',
      industry: 'teknologji-informacioni',
      education: 'bachelor',
      experience: '3-5',
      jobType: 'full-time',
      workLocation: 'hybrid',
      salary: 1800,
      currency: 'EUR',
    },
    {
      cityId: cityId('durres'),
      title: 'Restaurant Manager — Plepa',
      description:
        'Mban përgjegjësi për operacionet e përditshme: menaxhim stafi, inventari, raportim, shërbim klienti.',
      industry: 'horeka',
      education: 'secondary',
      experience: '2-3',
      jobType: 'full-time',
      workLocation: 'onsite',
      salary: 900,
      currency: 'EUR',
    },
    {
      cityId: cityId('tirane'),
      title: 'Sales Executive B2B',
      description:
        'Pozicion me përgjegjësi për gjenerimin e leads, prezantime te klientët, mbylljen e shitjeve. Komision atraktiv.',
      industry: 'shitje-zhvillim',
      education: 'bachelor',
      experience: '1-2',
      jobType: 'full-time',
      workLocation: 'hybrid',
      salary: 800,
      currency: 'EUR',
    },
    {
      cityId: cityId('vlore'),
      title: 'Civil Engineer — Site Supervisor',
      description:
        'Mbikqyrës ndërtimi për projekt rezidencial. Mban përgjegjësi për kontrollin teknik, sigurinë dhe afatin.',
      industry: 'ndertim-industri',
      education: 'master',
      experience: '5-10',
      jobType: 'full-time',
      workLocation: 'onsite',
      salary: 1200,
      currency: 'EUR',
    },
    {
      cityId: cityId('tirane'),
      title: 'Marketing Specialist (Remote)',
      description:
        'Krijo dhe ekzekuto fushata digjitale (Meta Ads, Google Ads), prodho përmbajtje për social media dhe analizo rezultatet.',
      industry: 'marketing-produkte',
      education: 'bachelor',
      experience: '2-3',
      jobType: 'full-time',
      workLocation: 'remote',
      salary: 950,
      currency: 'EUR',
    },
    {
      cityId: cityId('shkoder'),
      title: 'Customer Support Agent (Part-time)',
      description:
        'Përgjigju kërkesave të klientëve nëpërmjet email, chat dhe telefon. Orari fleksibël, trajnim i plotë.',
      industry: 'sherbim-klienti',
      education: 'no-requirement',
      experience: 'no-experience',
      jobType: 'part-time',
      workLocation: 'remote',
      salary: 500,
      currency: 'EUR',
    },
  ];

  const citySlugs = ['tirane', 'durres', 'vlore', 'shkoder'];
  const industries = [
    'teknologji-informacioni',
    'horeka',
    'shitje-zhvillim',
    'ndertim-industri',
    'marketing-produkte',
    'sherbim-klienti',
    'finance',
    'burime-njerezore',
    'administrim',
    'mjekesore-shendetesore',
    'prodhim',
    'retail',
    'ligjore',
    'prokurim-logjistike',
    'instalime-mirembajtje',
  ];
  const educations = ['no-requirement', 'secondary', 'bachelor', 'master', 'vocational'];
  const experiences = ['no-experience', '1-2', '2-3', '3-5', '5-10'];
  const jobTypes = ['full-time', 'part-time', 'remote', 'internship', 'freelance'];
  const workLocations = ['onsite', 'hybrid', 'remote'];
  const titles = [
    'Specialist Operacionesh',
    'Koordinator Projektesh',
    'Analist të Dhënash',
    'Menaxher Depo',
    'Gazetar Digital',
    'Instruktor Trajnimi',
    'Inxhinier Prodhimi',
    'Agjent Sigurimesh',
    'Dizajner Grafik',
    'Kujdestar të Moshuarish',
    'Teknik Laboratori',
    'Operator Call Center',
    'Arkivist Dokumentesh',
    'Menaxher Social Media',
    'Konsulent IT',
    'Specialist Blerjesh',
    'Supervizor Magazinë',
    'Kontrollor Cilësie',
    'Asistent Menaxher',
  ];

  return padToCount(base, LISTINGS_PER_CATEGORY, (n) => ({
    cityId: cityId(citySlugs[n % citySlugs.length]),
    title: `${titles[n % titles.length]} — pozicion #${n + 1}`,
    description: `Punë demo #${n + 1} për testim filtrash. Përshkrim i detajuar i rolit dhe kërkesave.`,
    industry: industries[n % industries.length],
    education: educations[n % educations.length],
    experience: experiences[n % experiences.length],
    jobType: jobTypes[n % jobTypes.length],
    workLocation: workLocations[n % workLocations.length],
    salary: 450 + (n * 95) % 2200,
    currency: n % 5 === 0 ? 'LEK' : 'EUR',
  }));
}

function businessDirectorySeeds(loc) {
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  const base = [
    {
      vertical: 'businesses',
      cityId: cityId('tirane'),
      title: 'Gjelbër — kuzhinë mesdhetare & verandë',
      description:
        'Menù me peshk të freskët, makarona të përditësuara dhe verë rajonale. Tavolina në pemë gjatë verës. Fëmijë mirëpritur.',
      category: 'restorant',
      servicesHighlight: 'Tavolina me rezervim · Verandë · Muzikë live të premteve',
      openingHours: 'Hën–Die 12:00–24:00 · Diele: brunch 10:00–15:00, darkë 18:00–23:00',
      reservationsEnabled: true,
      reservationUrl: 'https://example.com/rezervo-gjelber',
    },
    {
      vertical: 'businesses',
      cityId: cityId('durres'),
      title: 'Radio Bar Durres — kokteje & vinyl',
      description:
        'Kokteje me përberës vendorë, birrë craft në tap dhe lista vinili çdo të mërkurë. Hyni pa vesh kode — vetëm gjallëri e mirë.',
      category: 'bar',
      servicesHighlight: 'Kokteje signature · DJ · Tarracë me det',
      openingHours: 'Mar–Die 18:00–02:00 · Hën: pushim',
      reservationsEnabled: true,
      reservationUrl: null,
    },
    {
      vertical: 'businesses',
      cityId: cityId('tirane'),
      title: 'Kafe Komuna — speciality & brunch i shpejtë',
      description:
        'Pjekje ditore, espresso bar dhe sanduiçe për në rrugë. Ushqyes për punonjësit e Bllokut — radhë e shpejtë në mëngjes.',
      category: 'kafe',
      servicesHighlight: 'Espresso · Croissant · Wi‑Fi · Ngjitësa USB',
      openingHours: 'Hën–Die 07:00–21:00 · Diele 08:00–20:00',
      reservationsEnabled: false,
      reservationUrl: null,
    },
    {
      vertical: 'businesses',
      cityId: cityId('tirane'),
      title: 'Mëngjesi i Parisit — brunch çdo fundjavë',
      description:
        'Pancake, brioche, vezë benedikt dhe leng të shtrydhur. Muzikë e butë dhe tavolina për miqësi. Përpiqu të vish herët.',
      category: 'brunch',
      servicesHighlight: 'Brunch · Mimoza · Tavolina jashtë (stinës)',
      openingHours: 'Sht–Die 09:00–15:00 (fundjavë)',
      reservationsEnabled: true,
      reservationUrl: null,
    },
    {
      vertical: 'businesses',
      cityId: cityId('vlore'),
      title: 'Pizza Lungomare — furre druri & porosi',
      description:
        'Brum i fermentuar 48 orë, mozzarella dhe domate San Marzano. Porosi për në plazh ose ha në tarracë me pamje deti.',
      category: 'piceri-fast-food',
      servicesHighlight: 'Porosi & take-away · Vegjetariane & pa gluten (kërko)',
      openingHours: 'Çdo ditë 11:00–00:00',
      reservationsEnabled: false,
      reservationUrl: null,
    },
    {
      vertical: 'businesses',
      cityId: cityId('shkoder'),
      title: 'Ëmbëlsira Rozafa — bakllava & torta porosi',
      description:
        'Traditë familjare që nga vitet ’90. Bakllava me arra, tulumba dhe torta për dasma në 48 orë paralajmërim.',
      category: 'pasticeri',
      servicesHighlight: 'Torta dasmash · ëmbëlsira orientale · kafe turke',
      openingHours: 'Hën–Sht 08:00–20:00 · Diele 09:00–14:00',
      reservationsEnabled: false,
      reservationUrl: null,
    },
  ];

  const citySlugs = ['tirane', 'durres', 'vlore', 'shkoder'];
  const categories = ['restorant', 'bar', 'kafe', 'brunch', 'piceri-fast-food', 'pasticeri'];
  const names = [
    'Odisea',
    'Veranda',
    'Stacioni',
    'Aromat',
    'Panorama',
    'Zgara',
    'Fiori',
    'Deti Blu',
    'Kodra',
    'Era',
    'Shtëpia',
    'Tradita',
    'Nova',
    'Luna',
    'Rrapi',
    'Ulliri',
    'Valbona',
    'Shpresa',
    'Arti',
  ];

  return padToCount(base, LISTINGS_PER_CATEGORY, (n) => {
    const category = categories[n % categories.length];
    const citySlug = citySlugs[n % citySlugs.length];
    const name = names[n % names.length];
    return {
      vertical: 'businesses',
      cityId: cityId(citySlug),
      title: `${name} — ${category.replace(/-/g, ' ')} demo #${n + 1}`,
      description: `Biznes demo #${n + 1} për testim filtrash. Shërbim lokal me stil unik dhe klientelë të rregullt.`,
      category,
      servicesHighlight: 'Wi‑Fi · Take-away · Tavolina jashtë',
      openingHours: 'Hën–Die 09:00–22:00',
      reservationsEnabled: n % 3 === 0,
      reservationUrl: n % 3 === 0 ? 'https://example.com/rezervo' : null,
    };
  });
}

function professionalDirectorySeeds(loc) {
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  const base = [
    {
      vertical: 'professionals',
      cityId: cityId('tirane'),
      title: 'Konsulent financiar — plane biznesi & investime',
      description:
        'MBA me 10+ vite përvojë. Ndihmë në buxhetim, pitch për investitorë dhe analiza të tregut. Anglisht / italisht.',
      category: 'konsulent',
      condition: null,
      price: 80,
      currency: 'EUR',
    },
    {
      vertical: 'professionals',
      cityId: cityId('tirane'),
      title: 'Full-stack Developer (Node, React) — remote & onsite',
      description:
        'Zhvillim aplikacionesh web dhe API. Punë me sprint, kod i dokumentuar, support pas dorëzimit.',
      category: 'freelance',
      condition: null,
      price: 45,
      currency: 'EUR',
    },
    {
      vertical: 'professionals',
      cityId: cityId('durres'),
      title: 'Avokat civil & biznes — mënyrime dhe kontrata',
      description:
        'Konsulencë në të drejtë tregtare, themelim shoqëri, kontrata pune. Takime në zyrë ose online.',
      category: 'sherbim',
      condition: null,
      price: null,
      currency: null,
    },
    {
      vertical: 'professionals',
      cityId: cityId('vlore'),
      title: 'Fotograf dasmash & eventesh — pako foto + video',
      description:
        'Portfolio 8 vite. Drone opsional, editim në 2 javë. Disponueshmëri maj–shtator (rezervim paraprak).',
      category: 'freelance',
      condition: null,
      price: 750,
      currency: 'EUR',
    },
    {
      vertical: 'professionals',
      cityId: cityId('tirane'),
      title: 'Kurse Excel për biznes — grup 6 persona',
      description:
        '4 seanca praktike: pivot, automate, raporte. Certifikatë pjesëmarrjeje. Materiale të përfshira.',
      category: 'kurse',
      condition: null,
      price: 12000,
      currency: 'LEK',
    },
    {
      vertical: 'professionals',
      cityId: cityId('shkoder'),
      title: 'Kontabilist i certifikuar — tatime & listë pagash',
      description:
        'Shërbim mujor për SME, deklarata TVSH dhe konsulencë përmes telefonit. Referenca nga 20+ klientë.',
      category: 'sherbim',
      condition: null,
      price: 350,
      currency: 'EUR',
    },
  ];

  const citySlugs = ['tirane', 'durres', 'vlore', 'shkoder'];
  const categories = ['konsulent', 'freelance', 'sherbim', 'kurse', 'dizajn-it', 'marketing', 'mjekesi', 'arsim'];
  const titles = [
    'Konsulent biznesi',
    'Dizajner UX/UI',
    'Mësues privat matematike',
    'Fotograf produktesh',
    'Trajner fitness',
    'Përkthyes juridik',
    'Social media manager',
    'Arkitekt i brendshëm',
    'Konsulent tatimesh',
    'Zhvillues WordPress',
    'Mami doula',
    'Kurs gitare',
    'Konsulent HR',
    'Videomaker',
    'Nutricionist',
    'Copywriter',
    'Konsulent eksporti',
    'Mësues anglishtje',
    'Ilustrues',
  ];

  return padToCount(base, LISTINGS_PER_CATEGORY, (n) => ({
    vertical: 'professionals',
    cityId: cityId(citySlugs[n % citySlugs.length]),
    title: `${titles[n % titles.length]} — profesionist demo #${n + 1}`,
    description: `Profesionist demo #${n + 1} për testim filtrash. Përvojë e verifikuar dhe referenca të disponueshme.`,
    category: categories[n % categories.length],
    condition: null,
    price: n % 4 === 0 ? null : 25 + (n * 37) % 900,
    currency: n % 4 === 0 ? null : n % 6 === 0 ? 'LEK' : 'EUR',
  }));
}

function marketplaceSeeds(loc) {
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  const citySlugs = ['tirane', 'durres', 'vlore', 'shkoder'];
  const conditions = ['i-ri', 'si-i-ri', 'shume-mire', 'mire', 'me-defekte'];
  const flat = [];

  for (const category of MARKETPLACE_CATEGORIES) {
    const catalog = MARKETPLACE_CATEGORY_CATALOG[category];
    if (!catalog) continue;
    for (const [title, description, price] of catalog.items) {
      flat.push({ category, title, description, price });
    }
  }

  return flat.slice(0, LISTINGS_PER_CATEGORY).map((item, i) => {
    const isService = item.category === 'sherbime';
    return {
      cityId: cityId(citySlugs[i % citySlugs.length]),
      transactionType: 'shes',
      title: item.title,
      description: item.description,
      category: item.category,
      condition: isService ? null : conditions[i % conditions.length],
      price: item.price > 0 ? item.price : null,
      currency: item.price > 0 ? 'EUR' : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function run() {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error('Set MONGODB_URI (or MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST) in backend/.env.');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
  console.log('Connected to MongoDB');

  await ensureCities();
  console.log('✓ Demo cities ready');

  const demoUser = await ensureDemoUser();
  console.log(`✓ Demo poster: ${demoUser.email} (${demoUser._id})`);

  const loc = await loadCities();

  // Wipe previous demo listings (idempotent re-runs).
  const wipeFilter = { posterId: demoUser._id, posterModel: 'IndividualUser' };
  const wiped = await Promise.all([
    RealEstateListing.deleteMany(wipeFilter),
    CarListing.deleteMany(wipeFilter),
    JobListing.deleteMany(wipeFilter),
    MarketplaceListing.deleteMany(wipeFilter),
    DirectoryListing.deleteMany(wipeFilter),
  ]);
  console.log(
    `✓ Cleared previous demo data (re=${wiped[0].deletedCount} cars=${wiped[1].deletedCount} jobs=${wiped[2].deletedCount} mkt=${wiped[3].deletedCount} dir=${wiped[4].deletedCount})`,
  );

  const baseDoc = { posterId: demoUser._id, posterModel: 'IndividualUser', contactPhone: DEMO_PHONE, status: 'approved' };

  // Stagger createdAt so listings sort nicely (newest first).
  const stagger = (i) => new Date(Date.now() - i * 60 * 1000); // 1 minute apart

  // Several distinct photos per listing (rotating through curated Unsplash URLs).
  function pickGalleryImages(gallery, i, desiredCount = 6) {
    if (!gallery.length) return [];
    const n = Math.min(Math.max(desiredCount, 1), gallery.length, 8);
    const urls = [];
    for (let k = 0; k < n; k += 1) {
      urls.push(gallery[(i * 2 + k) % gallery.length]);
    }
    return urls;
  }

  const realEstateDocs = realEstateSeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickGalleryImages(REAL_ESTATE_IMAGES, i, 6),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await RealEstateListing.insertMany(realEstateDocs, { timestamps: false });
  console.log(`✓ Inserted ${realEstateDocs.length} real-estate listings`);

  const carDocs = carSeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickGalleryImages(CAR_IMAGES, i, 6),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await CarListing.insertMany(carDocs, { timestamps: false });
  console.log(`✓ Inserted ${carDocs.length} car listings`);

  const jobDocs = jobSeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickGalleryImages(JOB_IMAGES, i, 6),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await JobListing.insertMany(jobDocs, { timestamps: false });
  console.log(`✓ Inserted ${jobDocs.length} job listings`);

  const mktDocs = marketplaceSeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickGalleryImages(MARKETPLACE_IMAGES, i, 6),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await MarketplaceListing.insertMany(mktDocs, { timestamps: false });
  console.log(
    `✓ Inserted ${mktDocs.length} marketplace listings (${LISTINGS_PER_CATEGORY} diverse samples)`,
  );

  const bizDocs = businessDirectorySeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickGalleryImages(BUSINESS_DIRECTORY_IMAGES, i, 6),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await DirectoryListing.insertMany(bizDocs, { timestamps: false });
  console.log(`✓ Inserted ${bizDocs.length} business directory listings`);

  const profDocs = professionalDirectorySeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickGalleryImages(PROFESSIONAL_DIRECTORY_IMAGES, i, 6),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await DirectoryListing.insertMany(profDocs, { timestamps: false });
  console.log(`✓ Inserted ${profDocs.length} professional directory listings`);

  console.log('\nAll done — refresh the homepage to see the seeded listings.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err?.message || err);
    process.exit(1);
  });

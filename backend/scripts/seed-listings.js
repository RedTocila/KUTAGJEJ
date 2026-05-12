/**
 * Seeds 6 demo listings per vertical (real-estate, cars, jobs, marketplace,
 * biznese, profesionistë). Idempotent: re-running removes the previous batch
 * (demo poster email) before re-inserting.
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
  unsplash('photo-1522708323590-d24dbb6b0267'), // modern apartment interior
  unsplash('photo-1613977257363-707ba9348227'), // luxury villa exterior
  unsplash('photo-1493809842364-78817add7ffb'), // penthouse view
  unsplash('photo-1502672260266-1c1ef2d93688'), // cozy living room
  unsplash('photo-1604719312566-8912e9227c6a'), // shop front
  unsplash('photo-1500382017468-9049fed747ef'), // open land
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
];

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
  return [
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
  ];
}

function carSeeds(loc) {
  // Cars only need cityId; pick the demo city directly.
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  return [
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
  ];
}

function jobSeeds(loc) {
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  return [
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
}

function businessDirectorySeeds(loc) {
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  return [
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
}

function professionalDirectorySeeds(loc) {
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  return [
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
}

function marketplaceSeeds(loc) {
  const cityId = (slug) => loc.bySlug.get(slug)._id;
  return [
    {
      cityId: cityId('tirane'),
      transactionType: 'shes',
      title: 'iPhone 13 Pro 256GB — Si i ri',
      description:
        'iPhone 13 Pro Sierra Blue, 256GB, përdorur me kujdes, pa gërvishtje. Vjen me kuti origjinale dhe karikues.',
      category: 'elektronike',
      condition: 'si-i-ri',
      price: 650,
      currency: 'EUR',
    },
    {
      cityId: cityId('durres'),
      transactionType: 'shes',
      title: 'Divan 3 vendësh + 2 kolltukë',
      description:
        'Set divani modern, përdorur 2 vjet, gjendje shumë e mirë, pa njolla. Mund të transportohet brenda Durrësit.',
      category: 'mobilje-shtepi',
      condition: 'mire',
      price: 180,
      currency: 'EUR',
    },
    {
      cityId: cityId('tirane'),
      transactionType: 'shes',
      title: 'Xhup dimëri unisex — i ri',
      description:
        'Xhup dimëri me kapuç i markës Geographical Norway, masa M, ngjyrë blu. Etiketa ende të vendosura.',
      category: 'veshje-aksesore',
      condition: 'i-ri',
      price: 45,
      currency: 'EUR',
    },
    {
      cityId: cityId('tirane'),
      transactionType: 'shes',
      title: 'Set librash universitar (Inxhinieri)',
      description:
        'Koleksion librash për inxhinieri elektrike (15 libra), në gjuhën angleze dhe shqipe, gjendje e mirë.',
      category: 'libra-shkolla',
      condition: 'mire',
      price: 30,
      currency: 'EUR',
    },
    {
      cityId: cityId('vlore'),
      transactionType: 'shes',
      title: 'Biçikletë sportive Trek Marlin 7',
      description:
        'Trek Marlin 7, masa L, përdorur 1 sezon, gomat e reja, frenat hidraulike. Ideale për mountain biking.',
      category: 'sport-hobi',
      condition: 'shume-mire',
      price: 220,
      currency: 'EUR',
    },
    {
      cityId: cityId('tirane'),
      transactionType: 'shes',
      title: 'LEGO Technic Bugatti Chiron — set i pahapur',
      description:
        'Set origjinal LEGO Technic 42083 Bugatti Chiron, kuti ende e mbyllur, ideale për koleksionarë.',
      category: 'lodra',
      condition: 'i-ri',
      price: 320,
      currency: 'EUR',
    },
  ];
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

  const baseDoc = { posterId: demoUser._id, posterModel: 'IndividualUser', contactPhone: DEMO_PHONE };

  // Stagger createdAt so listings sort nicely (newest first).
  const stagger = (i) => new Date(Date.now() - i * 60 * 1000); // 1 minute apart

  // Several distinct photos per listing (rotating through curated Unsplash URLs).
  function pickGalleryImages(gallery, i, desiredCount = 6) {
    if (!gallery.length) return [];
    const n = Math.min(Math.max(desiredCount, 1), gallery.length, 8);
    const urls = [];
    for (let k = 0; k < n; k += 1) {
      urls.push(gallery[(i + k) % gallery.length]);
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
  console.log(`✓ Inserted ${mktDocs.length} marketplace listings`);

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

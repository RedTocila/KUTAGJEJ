/**
 * Seeds 6 demo listings per vertical (real-estate, cars, jobs, marketplace) so
 * the homepage has something to render. Idempotent: re-running the script
 * removes the previous batch (recognised by the demo poster's email) before
 * re-inserting.
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
  ]);
  console.log(
    `✓ Cleared previous demo data (re=${wiped[0].deletedCount} cars=${wiped[1].deletedCount} jobs=${wiped[2].deletedCount} mkt=${wiped[3].deletedCount})`,
  );

  const baseDoc = { posterId: demoUser._id, posterModel: 'IndividualUser', contactPhone: DEMO_PHONE };

  // Stagger createdAt so listings sort nicely (newest first).
  const stagger = (i) => new Date(Date.now() - i * 60 * 1000); // 1 minute apart

  // Curated cover image per seed; cycles to the start if a vertical ever
  // grows past the curated list.
  const pickImage = (gallery, i) => [gallery[i % gallery.length]];

  const realEstateDocs = realEstateSeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickImage(REAL_ESTATE_IMAGES, i),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await RealEstateListing.insertMany(realEstateDocs, { timestamps: false });
  console.log(`✓ Inserted ${realEstateDocs.length} real-estate listings`);

  const carDocs = carSeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickImage(CAR_IMAGES, i),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await CarListing.insertMany(carDocs, { timestamps: false });
  console.log(`✓ Inserted ${carDocs.length} car listings`);

  const jobDocs = jobSeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickImage(JOB_IMAGES, i),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await JobListing.insertMany(jobDocs, { timestamps: false });
  console.log(`✓ Inserted ${jobDocs.length} job listings`);

  const mktDocs = marketplaceSeeds(loc).map((d, i) => ({
    ...baseDoc,
    ...d,
    imageUrls: pickImage(MARKETPLACE_IMAGES, i),
    createdAt: stagger(i),
    updatedAt: stagger(i),
  }));
  await MarketplaceListing.insertMany(mktDocs, { timestamps: false });
  console.log(`✓ Inserted ${mktDocs.length} marketplace listings`);

  console.log('\nAll done — refresh the homepage to see the seeded listings.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err?.message || err);
    process.exit(1);
  });

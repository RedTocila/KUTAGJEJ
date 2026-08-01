'use strict';

/**
 * Seed Albanian demo listings: 10 per category (approved).
 *
 * Usage (from backend/):
 *   node scripts/seed-albania-listings.js
 *
 * Creates poster users if missing, cities/zones, then listings.
 * Idempotent-ish: skips if a category already has ≥10 approved rows.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { randomUUID } = require('crypto');
const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { getProfileByEmail, insertProfile } = require('../lib/profiles');

const PHONE = '+355 69 400 1000';
const SEED_TAG = '[seed-albania]';

const IMG = {
  apt: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
  villa: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
  office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  shop: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  car: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  car2: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  job: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
  phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
  sofa: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
  bike: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
  resto: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
  bar: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80',
  pro: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
  medic: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
};

function weekHours(open = '09:00', close = '22:00') {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 6, // Sunday closed for some; still realistic
    open: dayOfWeek === 6 ? null : open,
    close: dayOfWeek === 6 ? null : close,
  }));
}

async function ensurePoster({ email, password, accountType, fields }) {
  const existing = await getProfileByEmail(email);
  if (existing) {
    console.log('Poster exists:', email, existing.id);
    return existing;
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account_type: accountType, ...fields.meta },
  });
  if (error) throw error;
  const profile = await insertProfile({
    id: data.user.id,
    email,
    account_type: accountType,
    is_active: true,
    ...fields.row,
  });
  console.log('Created poster:', email, profile.id);
  return profile;
}

async function ensureCities(sb) {
  const { data: existing } = await sb.from('real_estate_cities').select('*');
  if (existing?.length) {
    console.log('Cities already present:', existing.length);
    return existing;
  }

  const cities = [
    {
      name: 'Tiranë',
      slug: 'tirane',
      zones: [
        { id: randomUUID(), name: 'Blloku', slug: 'blloku' },
        { id: randomUUID(), name: 'Komuna e Parisit', slug: 'komuna-e-parisit' },
        { id: randomUUID(), name: 'Kombinat', slug: 'kombinat' },
        { id: randomUUID(), name: 'Astir', slug: 'astir' },
        { id: randomUUID(), name: 'Lapraka', slug: 'lapraka' },
      ],
    },
    {
      name: 'Durrës',
      slug: 'durres',
      zones: [
        { id: randomUUID(), name: 'Plazhi', slug: 'plazhi' },
        { id: randomUUID(), name: 'Qendra', slug: 'qendra' },
        { id: randomUUID(), name: 'Currila', slug: 'currila' },
      ],
    },
    {
      name: 'Vlorë',
      slug: 'vlore',
      zones: [
        { id: randomUUID(), name: 'Lungomare', slug: 'lungomare' },
        { id: randomUUID(), name: 'Qendra', slug: 'qendra' },
      ],
    },
    {
      name: 'Shkodër',
      slug: 'shkoder',
      zones: [
        { id: randomUUID(), name: 'Qendra', slug: 'qendra' },
        { id: randomUUID(), name: 'Bahçallëk', slug: 'bahcalleek' },
      ],
    },
    {
      name: 'Elbasan',
      slug: 'elbasan',
      zones: [
        { id: randomUUID(), name: 'Qendra', slug: 'qendra' },
        { id: randomUUID(), name: 'Lagjia 5 Maji', slug: 'lagjia-5-maji' },
      ],
    },
  ];

  const { data, error } = await sb.from('real_estate_cities').insert(cities).select('*');
  if (error) throw error;
  console.log('Inserted cities:', data.length);
  return data;
}

function pickCity(cities, i) {
  return cities[i % cities.length];
}

async function countApproved(sb, table, extra = {}) {
  let q = sb.from(table).select('*', { count: 'exact', head: true }).eq('status', 'approved');
  for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function seedRealEstate(sb, posterId, cities) {
  if ((await countApproved(sb, 'real_estate_listings')) >= 10) {
    console.log('Skip real-estate (already ≥10)');
    return;
  }
  const rows = [
    { property_category: 'apartment', title: 'Apartament 2+1 te Blloku', transaction_type: 'sale', price: 145000, surface_m2: 88, condition: 'renovated', floor: 4, bedrooms: 2, bathrooms: 1, furnishing: 'furnished', year_built: 2019, img: IMG.apt },
    { property_category: 'apartment', title: 'Apartament 1+1 Komuna e Parisit', transaction_type: 'rent', price: 450, surface_m2: 55, condition: 'good-condition', floor: 2, bedrooms: 1, bathrooms: 1, furnishing: 'partially-furnished', year_built: 2015, img: IMG.apt },
    { property_category: 'apartment', title: 'Apartament 3+1 Astir me parking', transaction_type: 'sale', price: 168000, surface_m2: 115, condition: 'new', floor: 6, bedrooms: 3, bathrooms: 2, furnishing: 'kitchen-only', year_built: 2023, img: IMG.apt },
    { property_category: 'villa', title: 'Vilë dy kate pranë Dajtit', transaction_type: 'sale', price: 320000, surface_m2: 240, condition: 'good-condition', total_floors: 2, bedrooms: 4, bathrooms: 3, furnishing: 'furnished', year_built: 2012, img: IMG.villa },
    { property_category: 'villa', title: 'Vilë me kopsht në Durrës Plazh', transaction_type: 'rent', price: 1200, surface_m2: 180, condition: 'renovated', total_floors: 2, bedrooms: 3, bathrooms: 2, furnishing: 'furnished', year_built: 2010, img: IMG.villa },
    { property_category: 'office', title: 'Zyrë e mobiluar në qendër të Tiranës', transaction_type: 'rent', price: 800, surface_m2: 70, condition: 'renovated', img: IMG.office },
    { property_category: 'shop', title: 'Dyqan në bulevardin kryesor Durrës', transaction_type: 'rent', price: 650, surface_m2: 45, condition: 'good-condition', img: IMG.shop },
    { property_category: 'penthouse-duplex', title: 'Penthouse me tarracë, Kombinat', transaction_type: 'sale', price: 210000, surface_m2: 140, condition: 'new', floor: 10, bedrooms: 3, bathrooms: 2, furnishing: 'unfurnished', year_built: 2024, img: IMG.apt },
    { property_category: 'room-studio-attic', title: 'Garsonierë e ndriçuar, Lapraka', transaction_type: 'rent', price: 280, surface_m2: 32, condition: 'good-condition', floor: 1, bedrooms: 0, bathrooms: 1, furnishing: 'furnished', year_built: 2016, img: IMG.apt },
    { property_category: 'building-plot', title: 'Tokë ndërtimi 600 m² periferi e Vlorës', transaction_type: 'sale', price: 90000, surface_m2: 600, img: IMG.villa },
  ].map((r, i) => {
    const city = pickCity(cities, i);
    const zone = city.zones[i % city.zones.length];
    return {
      poster_id: posterId,
      property_category: r.property_category,
      title: r.title,
      description: `${SEED_TAG} ${r.title}. Vendndodhje e mirë në ${city.name}, ${zone.name}. I përshtatshëm për banim ose investim. Kontaktoni për vizitë.`,
      transaction_type: r.transaction_type,
      price: r.price,
      currency: 'EUR',
      surface_m2: r.surface_m2,
      city_id: city.id,
      zone_id: zone.id,
      contact_phone: PHONE,
      condition: r.condition ?? null,
      floor: r.floor ?? null,
      total_floors: r.total_floors ?? null,
      bedrooms: r.bedrooms ?? null,
      bathrooms: r.bathrooms ?? null,
      furnishing: r.furnishing ?? null,
      year_built: r.year_built ?? null,
      image_urls: [r.img],
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });
  const { error } = await sb.from('real_estate_listings').insert(rows);
  if (error) throw error;
  console.log('Seeded real-estate:', rows.length);
}

async function seedCars(sb, posterId, cities) {
  if ((await countApproved(sb, 'car_listings')) >= 10) {
    console.log('Skip cars (already ≥10)');
    return;
  }
  const rows = [
    { make: 'BMW', model: '320d', variant: 'M Sport', year: 2018, kilometers: 98000, transmission: 'automatic', fuel_type: 'diesel', price: 17500, color: 'black' },
    { make: 'Mercedes-Benz', model: 'C 220', variant: 'AMG Line', year: 2019, kilometers: 72000, transmission: 'automatic', fuel_type: 'diesel', price: 24500, color: 'silver' },
    { make: 'Volkswagen', model: 'Golf', variant: '7.5', year: 2017, kilometers: 125000, transmission: 'manual', fuel_type: 'petrol', price: 9800, color: 'white' },
    { make: 'Audi', model: 'A4', variant: '2.0 TDI', year: 2016, kilometers: 140000, transmission: 'automatic', fuel_type: 'diesel', price: 13200, color: 'grey' },
    { make: 'Toyota', model: 'Corolla', variant: 'Hybrid', year: 2021, kilometers: 45000, transmission: 'automatic', fuel_type: 'hybrid-petrol', price: 18900, color: 'blue' },
    { make: 'Mercedes-Benz', model: 'Sprinter', variant: '311', year: 2015, kilometers: 210000, transmission: 'manual', fuel_type: 'diesel', price: 11500, color: 'white' },
    { make: 'Fiat', model: '500', variant: 'Lounge', year: 2014, kilometers: 89000, transmission: 'manual', fuel_type: 'petrol', price: 6200, color: 'red' },
    { make: 'Skoda', model: 'Octavia', variant: '1.6 TDI', year: 2018, kilometers: 110000, transmission: 'manual', fuel_type: 'diesel', price: 10500, color: 'grey' },
    { make: 'Renault', model: 'Clio', variant: '1.5 dCi', year: 2019, kilometers: 76000, transmission: 'manual', fuel_type: 'diesel', price: 7900, color: 'black' },
    { make: 'Hyundai', model: 'Tucson', variant: '1.6 T-GDI', year: 2020, kilometers: 58000, transmission: 'automatic', fuel_type: 'petrol', price: 19800, color: 'green' },
  ].map((r, i) => {
    const city = pickCity(cities, i + 1);
    return {
      poster_id: posterId,
      ...r,
      description: `${SEED_TAG} ${r.make} ${r.model} ${r.year}. Makina e mirëmbajtur, e rregjistruar në Shqipëri. Shërbime të dokumentuara. Vendndodhja: ${city.name}.`,
      currency: 'EUR',
      finish: ['metallic'],
      extras: ['ABS', 'Air conditioning', 'Parking sensors'],
      contact_phone: PHONE,
      city_id: city.id,
      image_urls: [i % 2 === 0 ? IMG.car : IMG.car2],
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });
  const { error } = await sb.from('car_listings').insert(rows);
  if (error) throw error;
  console.log('Seeded cars:', rows.length);
}

async function seedJobs(sb, posterId, cities) {
  if ((await countApproved(sb, 'job_listings')) >= 10) {
    console.log('Skip jobs (already ≥10)');
    return;
  }
  const rows = [
    { title: 'Kamerier/e – Restorant Tiranë', industry: 'horeka', education: 'secondary', experience: 'less-than-1', job_type: 'full-time', work_location: 'onsite', salary: 450 },
    { title: 'Frontend Developer (React)', industry: 'teknologji-informacioni', education: 'bachelor', experience: '2-3', job_type: 'full-time', work_location: 'hybrid', salary: 1400 },
    { title: 'Shitës/e në dyqan elektronike', industry: 'retail', education: 'secondary', experience: '1-2', job_type: 'full-time', work_location: 'onsite', salary: 500 },
    { title: 'Kontabilist/e', industry: 'finance', education: 'bachelor', experience: '3-5', job_type: 'full-time', work_location: 'onsite', salary: 900 },
    { title: 'Recepsionist/e hoteli – Durrës', industry: 'horeka', education: 'secondary', experience: '1-2', job_type: 'seasonal', work_location: 'onsite', salary: 550 },
    { title: 'Specialist marketing digjital', industry: 'marketing-produkte', education: 'bachelor', experience: '2-3', job_type: 'full-time', work_location: 'hybrid', salary: 800 },
    { title: 'Elektricist ndërtese', industry: 'instalime-mirembajtje', education: 'vocational', experience: '3-5', job_type: 'full-time', work_location: 'onsite', salary: 700 },
    { title: 'Infermier/e', industry: 'mjekesore-shendetesore', education: 'bachelor', experience: '1-2', job_type: 'full-time', work_location: 'onsite', salary: 750 },
    { title: 'Punëtor magazina', industry: 'prokurim-logjistike', education: 'no-requirement', experience: 'no-experience', job_type: 'full-time', work_location: 'onsite', salary: 420 },
    { title: 'Praktikant IT Support', industry: 'teknologji-informacioni', education: 'bachelor', experience: 'no-experience', job_type: 'internship', work_location: 'onsite', salary: 250 },
  ].map((r, i) => {
    const city = pickCity(cities, i);
    return {
      poster_id: posterId,
      title: r.title,
      description: `${SEED_TAG} Pozicion i hapur në ${city.name}. Ofrojmë mjedis pune profesional dhe mundësi zhvillimi. Aplikoni me CV.`,
      industry: r.industry,
      education: r.education,
      experience: r.experience,
      job_type: r.job_type,
      work_location: r.work_location,
      city_id: city.id,
      salary: r.salary,
      currency: 'EUR',
      contact_phone: PHONE,
      image_urls: [IMG.job],
      responsibilities: ['Kryen detyrat e përditshme sipas përshkrimit të pozicionit.', 'Bashkëpunon me ekipin dhe klientët.'],
      requirements: ['Komunikim i mirë në shqip.', 'Gatishmëri për punë në ekip.'],
      benefits: [
        { id: 'pay', label: 'Pagë e rregullt' },
        { id: 'training', label: 'Trajnim në punë' },
      ],
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });
  const { error } = await sb.from('job_listings').insert(rows);
  if (error) throw error;
  console.log('Seeded jobs:', rows.length);
}

async function seedMarketplace(sb, posterId, cities) {
  if ((await countApproved(sb, 'marketplace_listings')) >= 10) {
    console.log('Skip marketplace (already ≥10)');
    return;
  }
  const rows = [
    { title: 'iPhone 13 128GB', category: 'elektronike', condition: 'si-i-ri', price: 420, img: IMG.phone },
    { title: 'Samsung Galaxy S22', category: 'elektronike', condition: 'shume-mire', price: 380, img: IMG.phone },
    { title: 'Divan këndor 3+2', category: 'mobilje-shtepi', condition: 'mire', price: 280, img: IMG.sofa },
    { title: 'Tavolinë ngrënie dru masiv', category: 'mobilje-shtepi', condition: 'si-i-ri', price: 190, img: IMG.sofa },
    { title: 'Bicikletë mountain bike', category: 'sport-hobi', condition: 'shume-mire', price: 150, img: IMG.bike },
    { title: 'Xbox Series S + 2 lojëra', category: 'elektronike', condition: 'si-i-ri', price: 220, img: IMG.phone },
    { title: 'Jakë dimërore Zara (M)', category: 'veshje-aksesore', condition: 'si-i-ri', price: 35, img: IMG.shop },
    { title: 'Libra universitarë Ekonomi', category: 'libra-shkolla', condition: 'mire', price: 25, img: IMG.shop },
    { title: 'Goma dimërore 205/55 R16', category: 'automjete-pjese', condition: 'mire', price: 120, img: IMG.car },
    { title: 'Shërbim montimi mobiljesh', category: 'sherbime', condition: 'i-ri', price: 40, img: IMG.pro },
  ].map((r, i) => {
    const city = pickCity(cities, i + 2);
    return {
      poster_id: posterId,
      transaction_type: 'shes',
      title: r.title,
      description: `${SEED_TAG} ${r.title}. Në gjendje të mirë, i disponueshëm në ${city.name}. Çmimi i diskutueshëm për blerje të shpejtë.`,
      category: r.category,
      condition: r.condition,
      price: r.price,
      currency: 'EUR',
      city_id: city.id,
      contact_phone: PHONE,
      image_urls: [r.img],
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });
  const { error } = await sb.from('marketplace_listings').insert(rows);
  if (error) throw error;
  console.log('Seeded marketplace:', rows.length);
}

async function seedBusinesses(sb, posterId, cities) {
  if ((await countApproved(sb, 'directory_listings', { vertical: 'businesses' })) >= 10) {
    console.log('Skip businesses (already ≥10)');
    return;
  }
  const rows = [
    { title: 'Restorant Deti Blu', category: 'restorant', desc: 'Kuzhinë mesdhetare dhe peshk i freskët.', img: IMG.resto, open: '12:00', close: '23:30' },
    { title: 'Kafe Muzeu', category: 'kafe', desc: 'Kafe specialiteti dhe ëmbëlsira artizanale.', img: IMG.cafe, open: '08:00', close: '22:00' },
    { title: 'Bar Skyline', category: 'bar', desc: 'Koktejle dhe muzikë live në mbrëmje.', img: IMG.bar, open: '17:00', close: '01:00' },
    { title: 'Brunch House Tiranë', category: 'brunch', desc: 'Mëngjes dhe brunch gjatë gjithë ditës.', img: IMG.cafe, open: '09:00', close: '16:00' },
    { title: 'Piceri Napoli Express', category: 'piceri-fast-food', desc: 'Pica napolitane dhe delivery.', img: IMG.resto, open: '11:00', close: '23:00' },
    { title: 'Pasticeri Era', category: 'pasticeri', desc: 'Torta dhe bakllava të shtëpisë.', img: IMG.cafe, open: '08:00', close: '20:00' },
    { title: 'Restorant Tradita Shkodër', category: 'restorant', desc: 'Gjellë tradicionale shkodrane.', img: IMG.resto, open: '12:00', close: '22:00' },
    { title: 'Kafe Lungomare Vlorë', category: 'kafe', desc: 'Pamje deti dhe pije të freskëta.', img: IMG.cafe, open: '09:00', close: '00:00' },
    { title: 'Bar Plazhi Durrës', category: 'bar', desc: 'Bar plazhi me muzikë dhe cocktail.', img: IMG.bar, open: '10:00', close: '02:00' },
    { title: 'Fast Food Qendra Elbasan', category: 'piceri-fast-food', desc: 'Burger, pizza dhe menu ditore.', img: IMG.resto, open: '10:00', close: '23:00' },
  ].map((r, i) => {
    const city = pickCity(cities, i);
    return {
      vertical: 'businesses',
      poster_id: posterId,
      title: r.title,
      description: `${SEED_TAG} ${r.desc} Vendndodhja: ${city.name}. Rezervime të mira të pranuara.`,
      category: r.category,
      city_id: city.id,
      contact_phone: PHONE,
      image_urls: [r.img],
      weekly_hours: weekHours(r.open, r.close),
      opening_hours: `${r.open}–${r.close}`,
      menu_categories: [],
      menu_items: [],
      reservations_enabled: true,
      reservation_time_slots: ['12:00', '13:00', '19:00', '20:00', '21:00'],
      reservation_party_sizes: [2, 4, 6, 8],
      services_highlight: 'Wifi, parking, delivery',
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });
  const { error } = await sb.from('directory_listings').insert(rows);
  if (error) throw error;
  console.log('Seeded businesses:', rows.length);
}

async function seedProfessionals(sb, posterId, cities) {
  if ((await countApproved(sb, 'directory_listings', { vertical: 'professionals' })) >= 10) {
    console.log('Skip professionals (already ≥10)');
    return;
  }
  const rows = [
    { title: 'Avokat civil – Tiranë', category: 'konsulent', price: 60, highlight: 'Kontrata, divorc, pronësi', img: IMG.pro },
    { title: 'Freelance grafik designer', category: 'dizajn-it', price: 25, highlight: 'Logo, branding, social media', img: IMG.pro },
    { title: 'Kurs anglisht për të rritur', category: 'kurse', price: 15, highlight: 'Online dhe face-to-face', img: IMG.pro },
    { title: 'Mjek familjar – konsultë', category: 'mjekesi', price: 30, highlight: 'Kontroll periodik dhe receta', img: IMG.medic },
    { title: 'Specialist SEO & Google Ads', category: 'marketing', price: 40, highlight: 'Kampanja për SME shqiptare', img: IMG.pro },
    { title: 'Instalim AC dhe servis', category: 'sherbim', price: 35, highlight: 'Montim dhe mirëmbajtje', img: IMG.pro },
    { title: 'Tutor matematikë / fizikë', category: 'arsim', price: 12, highlight: 'Nxënës 9-vjeçare dhe gjimnaz', img: IMG.pro },
    { title: 'Web developer WordPress', category: 'freelance', price: 20, highlight: 'Website biznesi dhe e-commerce', img: IMG.pro },
    { title: 'Fotografe eventi', category: 'sherbim', price: 150, highlight: 'Dasma, fejesë, korporatë', img: IMG.pro },
    { title: 'Konsulent biznesi SME', category: 'konsulent', price: 50, highlight: 'Biznes plan dhe financim', img: IMG.pro },
  ].map((r, i) => {
    const city = pickCity(cities, i + 1);
    return {
      vertical: 'professionals',
      poster_id: posterId,
      title: r.title,
      description: `${SEED_TAG} ${r.highlight}. Shërbim profesional në ${city.name} dhe online. Kontaktoni për orar.`,
      category: r.category,
      city_id: city.id,
      contact_phone: PHONE,
      image_urls: [r.img],
      price: r.price,
      currency: 'EUR',
      response_time_hours: 24,
      services_highlight: r.highlight,
      portfolio_items: [],
      weekly_hours: weekHours('09:00', '18:00'),
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    };
  });
  const { error } = await sb.from('directory_listings').insert(rows);
  if (error) throw error;
  console.log('Seeded professionals:', rows.length);
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  const sb = getSupabaseAdmin();

  const individual = await ensurePoster({
    email: 'seed.individual@kutagjej.local',
    password: 'SeedDemo_1',
    accountType: 'individual',
    fields: {
      meta: { first_name: 'Arben', last_name: 'Hoxha' },
      row: {
        first_name: 'Arben',
        last_name: 'Hoxha',
        phone: PHONE,
        role: 'individual-user',
      },
    },
  });

  const business = await ensurePoster({
    email: 'seed.business@kutagjej.local',
    password: 'SeedDemo_1',
    accountType: 'business',
    fields: {
      meta: { business_name: 'KuTaGjej Demo SHPK' },
      row: {
        first_name: 'Luan',
        last_name: 'Krasniqi',
        phone: PHONE,
        role: 'business-user',
        nipt: 'L12345678A',
        business_name: 'KuTaGjej Demo SHPK',
        business_owner: 'Luan Krasniqi',
        business_category: 'sherbime',
        jobs_employer_verified_at: new Date().toISOString(),
        professionals_verified_at: new Date().toISOString(),
      },
    },
  });

  const cities = await ensureCities(sb);

  await seedRealEstate(sb, individual.id, cities);
  await seedCars(sb, individual.id, cities);
  await seedJobs(sb, business.id, cities);
  await seedMarketplace(sb, individual.id, cities);
  await seedBusinesses(sb, business.id, cities);
  await seedProfessionals(sb, business.id, cities);

  console.log('\nDone. Browse http://localhost:3000');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

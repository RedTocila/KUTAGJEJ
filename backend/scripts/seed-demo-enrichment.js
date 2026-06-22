/**
 * Pas seed-listings: vleresime, rezervime, verifikime, fusha te plota biznese/profesioniste.
 */

const { randomUUID } = require('crypto');
const IndividualUser = require('../models/IndividualUser');
const BusinessUser = require('../models/BusinessUser');
const DirectoryListing = require('../models/DirectoryListing');
const BusinessListingReview = require('../models/BusinessListingReview');
const ProfessionalListingReview = require('../models/ProfessionalListingReview');
const BusinessReservation = require('../models/BusinessReservation');
const JobListing = require('../models/JobListing');

const DEMO_PASSWORD = 'demo123456';

const TEST_ACCOUNTS = [
  {
    kind: 'individual',
    email: 'demo@kutagjej.al',
    firstName: 'Demo',
    lastName: 'User',
    phone: '+355 69 200 0000',
    jobsEmployerVerifiedAt: true,
    professionalsVerifiedAt: true,
  },
  {
    kind: 'individual',
    email: 'klient@kutagjej.al',
    firstName: 'Ardit',
    lastName: 'Muca',
    phone: '+355 69 211 1111',
  },
  {
    kind: 'individual',
    email: 'elona@kutagjej.al',
    firstName: 'Elona',
    lastName: 'Krasniqi',
    phone: '+355 69 222 2222',
  },
  {
    kind: 'business',
    email: 'biznesi@kutagjej.al',
    firstName: 'Mark',
    lastName: 'Hoxha',
    phone: '+355 69 333 3333',
    businessName: 'Studio Hoxha',
    businessOwner: 'Mark Hoxha',
    nipt: 'L12345678A',
    businessCategory: 'restorant',
  },
];

function defaultWeeklyHours() {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    closed: dayOfWeek === 6,
    open: dayOfWeek === 6 ? null : '09:00',
    close: dayOfWeek === 6 ? null : dayOfWeek === 5 ? '23:00' : '22:00',
  }));
}

function enrichBusinessDoc(doc, imageUrl) {
  const catMain = randomUUID();
  const catDrinks = randomUUID();
  return {
    ...doc,
    weeklyHours: defaultWeeklyHours(),
    openingHours: 'Hen-Die 09:00-22:00 · Die: 10:00-20:00',
    menuCategories: [
      { id: catMain, name: 'Pjata kryesore', sortOrder: 0 },
      { id: catDrinks, name: 'Pije', sortOrder: 1 },
    ],
    menuItems: [
      {
        id: randomUUID(),
        categoryId: catMain,
        name: 'Peshk i dites',
        description: 'Peshk i fresket me perime sezoni.',
        price: 1400,
        currency: 'LEK',
        imageUrl: imageUrl,
        sortOrder: 0,
      },
      {
        id: randomUUID(),
        categoryId: catMain,
        name: 'Risotto kungull',
        description: 'Me parmesan dhe ereza mesdhetare.',
        price: 950,
        currency: 'LEK',
        imageUrl: imageUrl,
        sortOrder: 1,
      },
      {
        id: randomUUID(),
        categoryId: catDrinks,
        name: 'Vere e bardhe',
        description: 'Gote 150ml.',
        price: 450,
        currency: 'LEK',
        imageUrl: null,
        sortOrder: 0,
      },
    ],
    reservationTimeSlots: ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00'],
    reservationPartySizes: [2, 3, 4, 5, 6, 8],
    reservationsEnabled: doc.reservationsEnabled !== false,
  };
}

function enrichProfessionalDoc(doc, images) {
  const img0 = images[0] || images[images.length - 1];
  const img1 = images[1] || img0;
  return {
    ...doc,
    responseTimeHours: doc.responseTimeHours ?? 2 + (doc.title.length % 3),
    portfolioItems: [
      {
        id: randomUUID(),
        title: 'Projekt Urban Residence',
        description: 'Renovim i plote i apartamentit.',
        imageUrl: img0,
        location: 'Tirane, Shqiperi',
        sortOrder: 0,
      },
      {
        id: randomUUID(),
        title: 'Vila Horizon',
        description: 'Dizajn i jashtem dhe peizazh.',
        imageUrl: img1,
        location: null,
        sortOrder: 1,
      },
    ],
    servicesHighlight:
      doc.servicesHighlight ||
      `${doc.category} · Konsulence · Online & ne zyre`,
  };
}

async function ensureTestUsers() {
  const out = {};
  for (const acc of TEST_ACCOUNTS) {
    if (acc.kind === 'business') {
      let u = await BusinessUser.findOne({ email: acc.email });
      if (!u) {
        u = new BusinessUser({
          email: acc.email,
          password: DEMO_PASSWORD,
          firstName: acc.firstName,
          lastName: acc.lastName,
          phone: acc.phone,
          businessName: acc.businessName,
          businessOwner: acc.businessOwner,
          nipt: acc.nipt,
          businessCategory: acc.businessCategory,
          role: 'business-user',
          isActive: true,
        });
        await u.save();
      }
      out.business = u;
      continue;
    }
    let u = await IndividualUser.findOne({ email: acc.email });
    if (!u) {
      u = new IndividualUser({
        email: acc.email,
        password: DEMO_PASSWORD,
        firstName: acc.firstName,
        lastName: acc.lastName,
        phone: acc.phone,
        role: 'individual-user',
        isActive: true,
      });
      await u.save();
    }
    if (acc.jobsEmployerVerifiedAt) u.jobsEmployerVerifiedAt = new Date();
    if (acc.professionalsVerifiedAt) u.professionalsVerifiedAt = new Date();
    await u.save();
    if (acc.email === 'demo@kutagjej.al') out.demo = u;
    if (acc.email === 'klient@kutagjej.al') out.reviewer1 = u;
    if (acc.email === 'elona@kutagjej.al') out.reviewer2 = u;
  }
  return out;
}

async function enrichDirectoryListings() {
  const businesses = await DirectoryListing.find({ vertical: 'businesses' }).lean();
  for (let i = 0; i < businesses.length; i += 1) {
    const b = businesses[i];
    const cover = (b.imageUrls && b.imageUrls[0]) || null;
    const patch = enrichBusinessDoc(b, cover);
    await DirectoryListing.updateOne({ _id: b._id }, { $set: patch });
  }

  const professionals = await DirectoryListing.find({ vertical: 'professionals' }).lean();
  for (let i = 0; i < professionals.length; i += 1) {
    const p = professionals[i];
    const imgs = p.imageUrls?.length ? p.imageUrls : [];
    const patch = enrichProfessionalDoc(p, imgs);
    await DirectoryListing.updateOne({ _id: p._id }, { $set: patch });
  }
  console.log(`✓ Enriched ${businesses.length} businesses, ${professionals.length} professionals`);
}

async function seedReviews(users) {
  await BusinessListingReview.deleteMany({});
  await ProfessionalListingReview.deleteMany({});

  const businesses = await DirectoryListing.find({ vertical: 'businesses' }).limit(4).lean();
  const professionals = await DirectoryListing.find({ vertical: 'professionals' }).limit(4).lean();

  const reviewers = [users.reviewer1, users.reviewer2].filter(Boolean);
  const comments = [
    'Sherbim shume profesional, do ta rekomandoj.',
    'Cmime te drejta dhe cilesi e mire.',
    'Komunikim i shpejte, faleminderit!',
  ];

  let n = 0;
  for (const listing of businesses) {
    for (let r = 0; r < reviewers.length && r < 2; r += 1) {
      const rev = reviewers[r];
      if (String(listing.posterId) === String(rev._id)) continue;
      await BusinessListingReview.create({
        listingId: listing._id,
        reviewerId: rev._id,
        reviewerModel: 'IndividualUser',
        rating: 4 + (n % 2),
        comment: comments[n % comments.length],
      });
      n += 1;
    }
  }

  for (const listing of professionals) {
    for (let r = 0; r < reviewers.length && r < 1; r += 1) {
      const rev = reviewers[r];
      if (String(listing.posterId) === String(rev._id)) continue;
      await ProfessionalListingReview.create({
        listingId: listing._id,
        reviewerId: rev._id,
        reviewerModel: 'IndividualUser',
        rating: 5,
        comment: 'Ekspert i vertete, bashkepunim i kendshem.',
      });
      n += 1;
    }
  }
  console.log(`✓ Seeded ${n} reviews (biznes + profesioniste)`);
}

async function seedReservations() {
  await BusinessReservation.deleteMany({});
  const biz = await DirectoryListing.findOne({
    vertical: 'businesses',
    reservationsEnabled: true,
  }).lean();
  if (!biz) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  await BusinessReservation.create({
    listingId: biz._id,
    guestName: 'Besnik Hoxha',
    guestPhone: '+355 69 444 4444',
    partySize: 4,
    reservationDate: dateStr,
    timeSlot: '19:00',
    status: 'pending',
  });
  await BusinessReservation.create({
    listingId: biz._id,
    guestName: 'Dorina Shehu',
    guestPhone: '+355 69 555 5555',
    partySize: 2,
    reservationDate: dateStr,
    timeSlot: '20:00',
    status: 'confirmed',
  });
  console.log('✓ Seeded 2 demo reservations (biznes me rezervim)');
}

async function enrichJobs() {
  const jobs = await JobListing.find().limit(3).lean();
  const patches = [
    {
      responsibilities: ['Menaxhim i ekipeve', 'Planifikim ditor', 'Raportim te menaxherit'],
      requirements: ['Eksperience 2+ vite', 'Gjuhe angleze B1'],
      benefits: [
        { id: 'pay', label: 'Paga konkuruese' },
        { id: 'flex', label: 'Orar fleksibel' },
      ],
    },
    {
      responsibilities: ['Zhvillim frontend React', 'Review kodi nga ekipi', 'Deploy ne produksion'],
      requirements: ['React dhe TypeScript', 'Eksperience 1+ vit'],
      benefits: [{ id: 'growth', label: 'Mundesi zhvillimi' }],
    },
    {
      responsibilities: ['Kontakt me klientet ne telefon', 'Regjistrim porosish ne sistem'],
      requirements: ['Komunikim te qarte me klientet'],
      benefits: [{ id: 'pay', label: 'Paga konkuruese' }],
    },
  ];
  for (let i = 0; i < jobs.length; i += 1) {
    await JobListing.updateOne({ _id: jobs[i]._id }, { $set: patches[i] || patches[0] });
  }
  console.log(`✓ Enriched ${jobs.length} job listings (detyra / kerkesa / perfitime)`);
}

async function runEnrichment() {
  const users = await ensureTestUsers();
  console.log('✓ Test users ready (see CREDENTIALS below)');
  await enrichDirectoryListings();
  await enrichJobs();
  await seedReviews(users);
  await seedReservations();
}

const CREDENTIALS_TEXT = `
========== Llogarite test ==========
Fjalekalimi per te gjitha: ${DEMO_PASSWORD}

demo@kutagjej.al       — postues kryesor, i verifikuar (Pune + Profesioniste)
klient@kutagjej.al     — lene vleresime
elona@kutagjej.al      — lene vleresime
biznesi@kutagjej.al    — llogari biznesi

Hyrje: /user/auth
=====================================
`;

module.exports = { runEnrichment, ensureTestUsers, CREDENTIALS_TEXT };

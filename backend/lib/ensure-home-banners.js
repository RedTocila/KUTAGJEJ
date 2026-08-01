const HomeBanner = require('../models/HomeBanner');

const DEFAULT_BANNERS = [
  {
    title: 'Posto njoftimin tënd falas në sekonda',
    subtitle: '',
    imageUrl: '/KuTaGjejLogo.png',
    ctaLabel: 'Posto tani',
    ctaHref: '/user/dashboard/prona',
    order: 1,
    isActive: true,
  },
  {
    title: 'Gjej atë që kërkon, më shpejt',
    subtitle: '',
    imageUrl: '/KuTaGjejLogo.png',
    ctaLabel: 'Eksploro njoftimet',
    ctaHref: '/prona',
    order: 2,
    isActive: true,
  },
  {
    title: 'Prona në Tiranë, Durrës e gjithë Shqipërinë',
    subtitle: '',
    imageUrl: '/KuTaGjejLogo.png',
    ctaLabel: 'Shfleto pronat',
    ctaHref: '/prona',
    order: 3,
    isActive: true,
  },
  {
    title: 'Makina të reja dhe të përdorura',
    subtitle: '',
    imageUrl: '/KuTaGjejLogo.png',
    ctaLabel: 'Shfleto makinat',
    ctaHref: '/makina',
    order: 4,
    isActive: true,
  },
  {
    title: 'Oferta pune pranë teje',
    subtitle: '',
    imageUrl: '/KuTaGjejLogo.png',
    ctaLabel: 'Shfleto punët',
    ctaHref: '/pune',
    order: 5,
    isActive: true,
  },
  {
    title: 'Tregu online – bli e shit lehtë',
    subtitle: '',
    imageUrl: '/KuTaGjejLogo.png',
    ctaLabel: 'Shfleto tregun',
    ctaHref: '/tregu',
    order: 6,
    isActive: true,
  },
  {
    title: 'Zbulo biznese lokale pranë teje',
    subtitle: '',
    imageUrl: '/KuTaGjejLogo.png',
    ctaLabel: 'Shfleto bizneset',
    ctaHref: '/biznese',
    order: 7,
    isActive: true,
  },
];

async function ensureHomeBanners() {
  const existing = await HomeBanner.find().select('title').lean();
  const existingTitles = new Set(existing.map((b) => b.title));

  if (existing.length === 0) {
    await HomeBanner.insertMany(DEFAULT_BANNERS);
    return;
  }

  const missing = DEFAULT_BANNERS.filter((b) => !existingTitles.has(b.title));
  if (missing.length > 0) {
    await HomeBanner.insertMany(missing);
  }

  // Drop legacy subtitles so slides show headline only.
  await HomeBanner.updateMany({ subtitle: { $nin: [null, ''] } }, { $set: { subtitle: '' } });
}

module.exports = { ensureHomeBanners };

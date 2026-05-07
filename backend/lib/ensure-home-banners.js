const HomeBanner = require('../models/HomeBanner');

const DEFAULT_BANNERS = [
  {
    title: 'Posto njoftimin tënd falas në sekonda',
    subtitle: 'Prona, makina, punë dhe tregu - gjithçka në një platformë.',
    imageUrl: '/KuTaGjejLogo.png',
    ctaLabel: 'Posto tani',
    ctaHref: '/user/dashboard/prona',
    order: 1,
    isActive: true,
  },
  {
    title: 'Gjej atë që kërkon, më shpejt',
    subtitle: 'Shfleto mijëra njoftime të përditësuara nga gjithë Shqipëria.',
    imageUrl: '/KuTaGjejLogo.png',
    ctaLabel: 'Eksploro njoftimet',
    ctaHref: '/prona',
    order: 2,
    isActive: true,
  },
];

async function ensureHomeBanners() {
  const count = await HomeBanner.countDocuments();
  if (count > 0) return;
  await HomeBanner.insertMany(DEFAULT_BANNERS);
}

module.exports = { ensureHomeBanners };

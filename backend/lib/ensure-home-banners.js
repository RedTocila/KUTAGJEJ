const { getSupabaseAdmin } = require('./supabase');

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

function bannerToRow(b) {
  return {
    title: b.title,
    subtitle: b.subtitle || '',
    image_url: b.imageUrl,
    cta_label: b.ctaLabel,
    cta_href: b.ctaHref,
    order: b.order,
    is_active: b.isActive !== false,
  };
}

async function ensureHomeBanners() {
  const sb = getSupabaseAdmin();
  const { data: existing, error: findErr } = await sb.from('home_banners').select('title');
  if (findErr) throw findErr;

  const existingTitles = new Set((existing || []).map((b) => b.title));

  if (!existing || existing.length === 0) {
    const { error } = await sb.from('home_banners').insert(DEFAULT_BANNERS.map(bannerToRow));
    if (error) throw error;
    return;
  }

  const missing = DEFAULT_BANNERS.filter((b) => !existingTitles.has(b.title));
  if (missing.length > 0) {
    const { error } = await sb.from('home_banners').insert(missing.map(bannerToRow));
    if (error) throw error;
  }

  // Drop legacy subtitles so slides show headline only.
  const { error: clearErr } = await sb
    .from('home_banners')
    .update({ subtitle: '', updated_at: new Date().toISOString() })
    .not('subtitle', 'eq', '');
  if (clearErr) throw clearErr;
}

module.exports = { ensureHomeBanners };

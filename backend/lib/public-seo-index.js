'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { slugifyTitle } = require('./real-estate-permalink');
const { listingPermalinkFromSlugSource } = require('./listing-permalink');
const { activeJobCreatedAtFilter } = require('./public-listings/query-helpers');

const KIND_CONFIG = [
  {
    kind: 'real-estate',
    table: 'real_estate_listings',
    select: 'id,title,permalink_slug,updated_at,created_at,city_id,property_category,transaction_type,status',
  },
  {
    kind: 'car',
    table: 'car_listings',
    select: 'id,permalink_slug,updated_at,created_at,city_id,make,model,variant,status',
  },
  {
    kind: 'job',
    table: 'job_listings',
    select: 'id,title,permalink_slug,updated_at,created_at,city_id,industry,status',
  },
  {
    kind: 'marketplace',
    table: 'marketplace_listings',
    select: 'id,title,permalink_slug,updated_at,created_at,city_id,category,status',
  },
  {
    kind: 'businesses',
    table: 'directory_listings',
    select: 'id,title,permalink_slug,updated_at,created_at,city_id,category,vertical,status',
    vertical: 'businesses',
  },
  {
    kind: 'professionals',
    table: 'directory_listings',
    select: 'id,title,permalink_slug,updated_at,created_at,city_id,category,vertical,status',
    vertical: 'professionals',
  },
];

const REAL_ESTATE_CATEGORY_PATHS = {
  apartment: 'apartamente',
  villa: 'vila',
  'penthouse-duplex': 'penthouse',
  'part-of-villa': 'pjese-vile',
  'room-studio-attic': 'dhoma-studio',
  parking: 'parking',
  shop: 'dyqane',
  office: 'zyra',
  'industrial-shed': 'kapanone-industriale',
  'commercial-local': 'lokale-tregtare',
  warehouse: 'magazina',
  'business-space': 'ambiente-biznesi',
  'building-plot': 'truall',
  'agricultural-land': 'toke-bujqesore',
};

const TRANSACTION_PATHS = {
  rent: 'me-qera',
  sale: 'ne-shitje',
};

const VERTICAL_PATHS = {
  'real-estate': 'prona',
  car: 'makina',
  job: 'pune',
  marketplace: 'tregu',
  businesses: 'biznese',
  professionals: 'profesioniste',
};

function seoSlug(value) {
  return slugifyTitle(value).replace(/^-+|-+$/g, '');
}

function listingPath(kind, doc) {
  const base = VERTICAL_PATHS[kind];
  const slug = String(doc.permalink_slug || '').trim();
  const segment =
    slug ||
    (kind === 'real-estate'
      ? `${slugifyTitle(doc.title)}-${doc.id}.html`
      : listingPermalinkFromSlugSource(
          kind === 'car'
            ? [doc.make, doc.model, doc.variant].filter(Boolean).join(' ')
            : doc.title,
          doc.id,
        ));
  return `/${base}/${segment}`;
}

function cityPath(kind, citySlug) {
  return `/${VERTICAL_PATHS[kind]}/${citySlug}`;
}

function landingPaths(kind, doc, city) {
  const countryRoot = `/${VERTICAL_PATHS[kind]}`;
  const paths = [];
  const root = city?.slug ? cityPath(kind, city.slug) : null;
  if (root) paths.push(root);

  if (kind === 'real-estate') {
    const category = REAL_ESTATE_CATEGORY_PATHS[doc.property_category];
    if (!category) return paths;
    const categoryPath = `${countryRoot}/${category}`;
    paths.push(categoryPath);
    if (root) paths.push(`${root}/${category}`);
    const transaction = TRANSACTION_PATHS[doc.transaction_type];
    if (transaction) {
      paths.push(`${categoryPath}/${transaction}`);
      if (root) paths.push(`${root}/${category}/${transaction}`);
    }
    return paths;
  }

  const categorySource =
    kind === 'car'
      ? doc.make
      : kind === 'job'
        ? doc.industry
        : doc.category;
  if (categorySource) {
    const categoryPath = `${countryRoot}/${seoSlug(categorySource)}`;
    paths.push(categoryPath);
    if (root) paths.push(`${root}/${seoSlug(categorySource)}`);
  }
  return paths;
}

function maxDate(docs) {
  const values = docs
    .flatMap((doc) => [doc.updated_at, doc.created_at])
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  return values.length ? new Date(Math.max(...values)).toISOString() : new Date().toISOString();
}

function isActiveDoc(kind, doc) {
  if (doc?.status !== 'approved') return false;
  if (kind !== 'job') return true;
  const cutoff = activeJobCreatedAtFilter().gte.created_at;
  const createdAt = new Date(doc.created_at).getTime();
  return Number.isFinite(createdAt) && createdAt >= new Date(cutoff).getTime();
}

function landingLastModified(current, doc) {
  const next = maxDate([doc]);
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

async function fetchSeoDocs() {
  const sb = getSupabaseAdmin();
  const results = await Promise.all(
    KIND_CONFIG.map(async ({ table, select, vertical }) => {
      let query = sb.from(table).select(select).eq('status', 'approved');
      if (vertical) query = query.eq('vertical', vertical);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }),
  );

  const docs = [];
  KIND_CONFIG.forEach(({ kind }, index) => {
    for (const doc of results[index]) {
      if (isActiveDoc(kind, doc)) docs.push({ kind, doc });
    }
  });
  return docs;
}

async function buildPublicSeoIndex() {
  const sb = getSupabaseAdmin();
  const [{ data: cityRows, error: cityError }, docs] = await Promise.all([
    sb.from('real_estate_cities').select('id, name, slug, zones'),
    fetchSeoDocs(),
  ]);
  if (cityError) throw cityError;

  const cities = cityRows || [];
  const cityById = new Map(cities.map((city) => [String(city.id), city]));
  const landingMap = new Map();

  const listings = docs.map(({ kind, doc }) => {
    const city = cityById.get(String(doc.city_id));
    for (const path of landingPaths(kind, doc, city)) {
      const existing = landingMap.get(path);
      landingMap.set(path, {
        path,
        count: (existing?.count || 0) + 1,
        lastModified: landingLastModified(existing?.lastModified, doc),
      });
    }
    return {
      kind,
      id: String(doc.id),
      path: listingPath(kind, doc),
      lastModified: maxDate([doc]),
    };
  });

  return {
    cities: cities.map(({ id, name, slug }) => ({ id: String(id), name, slug })),
    listings,
    landings: [...landingMap.values()].filter((landing) => landing.count >= 3),
  };
}

module.exports = {
  buildPublicSeoIndex,
  seoSlug,
};

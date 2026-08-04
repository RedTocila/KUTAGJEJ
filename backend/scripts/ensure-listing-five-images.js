'use strict';

/**
 * Ensure every listing has exactly 5 gallery images (Unsplash stock).
 * Updates existing rows in all listing tables.
 *
 *   node scripts/ensure-listing-five-images.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');

const POOLS = {
  apt: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
  ],
  villa: [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cd0c?w=800&q=80',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80',
    'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800&q=80',
    'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80',
  ],
  shop: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
    'https://images.unsplash.com/photo-1441984904996-e0b6ba18b3a0?w=800&q=80',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
    'https://images.unsplash.com/photo-1555529902-5261145633bf?w=800&q=80',
  ],
  car: [
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80',
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80',
  ],
  job: [
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
    'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=800&q=80',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
  ],
  marketplace: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
    'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80',
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
  ],
  resto: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
    'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&q=80',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800&q=80',
    'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&q=80',
  ],
  bar: [
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80',
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=80',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
    'https://images.unsplash.com/photo-1543007630-9710e4b7efdd?w=800&q=80',
  ],
  pro: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80',
  ],
  medic: [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80',
    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80',
    'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=80',
    'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=800&q=80',
  ],
};

function fiveFrom(pool, offset = 0) {
  return Array.from({ length: 5 }, (_, i) => pool[(offset + i) % pool.length]);
}

function realEstatePool(category) {
  if (category === 'villa' || category === 'building-plot') return POOLS.villa;
  if (category === 'office') return POOLS.office;
  if (category === 'shop') return POOLS.shop;
  return POOLS.apt;
}

function directoryPool(row) {
  const title = String(row.title || '').toLowerCase();
  const cat = String(row.category || row.category_label || '').toLowerCase();
  if (row.vertical === 'professionals') {
    if (title.includes('mjek') || title.includes('medic') || cat.includes('health')) return POOLS.medic;
    return POOLS.pro;
  }
  if (title.includes('kafe') || title.includes('cafe') || cat.includes('cafe')) return POOLS.cafe;
  if (title.includes('bar') || cat.includes('bar')) return POOLS.bar;
  return POOLS.resto;
}

async function updateTable(sb, table, pickPool, extraSelect = '') {
  const select = `id, image_urls${extraSelect ? `, ${extraSelect}` : ''}`;
  const { data, error } = await sb.from(table).select(select);
  if (error) throw error;
  const rows = data || [];
  let updated = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const current = Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean) : [];
    if (current.length >= 5) continue;
    const pool = pickPool(row, i);
    const image_urls = fiveFrom(pool, i);
    const { error: upErr } = await sb.from(table).update({ image_urls }).eq('id', row.id);
    if (upErr) throw upErr;
    updated += 1;
  }
  console.log(`${table}: updated ${updated} / ${rows.length}`);
}

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('Supabase is not configured');
    process.exit(1);
  }
  const sb = getSupabaseAdmin();

  await updateTable(sb, 'real_estate_listings', (row) => realEstatePool(row.property_category), 'property_category');
  await updateTable(sb, 'car_listings', () => POOLS.car);
  await updateTable(sb, 'job_listings', () => POOLS.job);
  await updateTable(sb, 'marketplace_listings', () => POOLS.marketplace);
  await updateTable(
    sb,
    'directory_listings',
    (row) => directoryPool(row),
    'vertical, title, category',
  );

  console.log('Done — every listing now has 5 images (or already had ≥5).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

'use strict';

/**
 * Ensure all 61 Albanian municipalities exist (idempotent by slug).
 *
 *   node scripts/ensure-albania-cities.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { buildAlbaniaCities } = require('../lib/albania-cities');

async function main() {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured');
  const sb = getSupabaseAdmin();
  const desired = buildAlbaniaCities();

  const { data: existing, error: existingErr } = await sb.from('real_estate_cities').select('*');
  if (existingErr) throw existingErr;

  const bySlug = new Map((existing || []).map((c) => [String(c.slug || '').toLowerCase(), c]));
  const missing = desired.filter((c) => !bySlug.has(c.slug));

  if (!missing.length) {
    console.log(`All ${desired.length} cities already present.`);
    return;
  }

  // Insert in chunks to stay under payload limits
  const chunkSize = 25;
  const inserted = [];
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    const { data, error } = await sb.from('real_estate_cities').insert(chunk).select('*');
    if (error) throw error;
    inserted.push(...(data || []));
  }

  console.log(`Inserted ${inserted.length} cities:`, inserted.map((c) => c.name).join(', '));
  console.log(`Total municipalities now: ${(existing || []).length + inserted.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

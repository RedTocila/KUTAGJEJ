'use strict';

/**
 * Remove filler/demo listings created by seed-albania-listings.js
 * (50 per category) and seed-okazion-listings.js.
 *
 * Does NOT delete listings owned by real users.
 *
 * Usage (from backend/):
 *   node scripts/remove-seed-listings.js           # dry run
 *   node scripts/remove-seed-listings.js --apply   # actually delete
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');

const SEED_EMAILS = ['seed.individual@kutagjej.local', 'seed.business@kutagjej.local'];
const SEED_TAGS = ['[seed-albania]', '[seed-okazion]'];

const TABLES = [
  {
    table: 'real_estate_listings',
    kind: 'real-estate',
    columns: 'id, poster_id, title, description, property_category',
    label: (row) => row.property_category || '—',
  },
  {
    table: 'car_listings',
    kind: 'car',
    columns: 'id, poster_id, make, model, description, vehicle_type',
    label: (row) => row.vehicle_type || '—',
  },
  {
    table: 'job_listings',
    kind: 'job',
    columns: 'id, poster_id, title, description, industry',
    label: (row) => row.industry || '—',
  },
  {
    table: 'marketplace_listings',
    kind: 'marketplace',
    columns: 'id, poster_id, title, description, category',
    label: (row) => row.category || '—',
  },
  {
    table: 'directory_listings',
    kind: 'directory',
    columns: 'id, poster_id, title, description, vertical, category',
    label: (row) => `${row.vertical || 'directory'}/${row.category || '—'}`,
  },
];

const RELATED = ['saved_listings', 'listing_auto_refresh', 'listing_engagements', 'listing_metric_dedups'];

const apply = process.argv.includes('--apply');

function isSeedDescription(description) {
  const text = String(description || '');
  return SEED_TAGS.some((tag) => text.includes(tag));
}

function directoryKind(row) {
  return row.vertical === 'professionals' ? 'professionals' : 'businesses';
}

async function fetchAll(sb, table, columns) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; from < 20000; from += pageSize) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }
  return rows;
}

async function deleteInChunks(sb, table, column, ids) {
  const chunkSize = 100;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error, count } = await sb.from(table).delete({ count: 'exact' }).in(column, chunk);
    if (error) throw error;
    deleted += count || chunk.length;
  }
  return deleted;
}

async function main() {
  if (!isSupabaseConfigured()) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  }
  const sb = getSupabaseAdmin();

  const { data: seedProfiles, error: profileErr } = await sb
    .from('profiles')
    .select('id, email')
    .in('email', SEED_EMAILS);
  if (profileErr) throw profileErr;

  const seedIds = new Set((seedProfiles || []).map((p) => p.id));
  console.log(
    'Seed poster accounts:',
    (seedProfiles || []).map((p) => `${p.email} (${p.id})`).join(', ') || '(none found)',
  );

  const toDelete = [];
  for (const spec of TABLES) {
    const rows = await fetchAll(sb, spec.table, spec.columns);
    const matches = rows.filter(
      (row) => seedIds.has(row.poster_id) || isSeedDescription(row.description),
    );
    const byCat = new Map();
    for (const row of matches) {
      const listingKind = spec.table === 'directory_listings' ? directoryKind(row) : spec.kind;
      const cat = spec.label(row);
      byCat.set(cat, (byCat.get(cat) || 0) + 1);
      toDelete.push({
        table: spec.table,
        kind: listingKind,
        id: row.id,
        posterId: row.poster_id,
      });
    }
    console.log(`\n${spec.table}: ${matches.length} seed listing(s) of ${rows.length} total`);
    for (const [cat, n] of [...byCat.entries()].sort()) {
      console.log(`  ${cat}: ${n}`);
    }
  }

  console.log(`\nTotal seed listings to remove: ${toDelete.length}`);
  if (!toDelete.length) {
    console.log('Nothing to delete.');
    return;
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to delete these seed listings (user listings are left alone).');
    return;
  }

  const idsByKind = new Map();
  const idsByTable = new Map();
  for (const row of toDelete) {
    if (!idsByKind.has(row.kind)) idsByKind.set(row.kind, []);
    idsByKind.get(row.kind).push(row.id);
    if (!idsByTable.has(row.table)) idsByTable.set(row.table, []);
    idsByTable.get(row.table).push(row.id);
  }

  for (const [kind, ids] of idsByKind) {
    for (const related of RELATED) {
      const { error } = await sb.from(related).delete().eq('listing_kind', kind).in('listing_id', ids);
      if (error) throw error;
    }
    const { error: okazionErr } = await sb.from('okazion_listings').delete().eq('listing_kind', kind).in('listing_id', ids);
    if (okazionErr && !/okazion_listings/i.test(String(okazionErr.message || ''))) throw okazionErr;
  }

  for (const [table, ids] of idsByTable) {
    const n = await deleteInChunks(sb, table, 'id', ids);
    console.log(`Deleted ${n} from ${table}`);
  }

  console.log(`\nDone. Removed ${toDelete.length} seed listing(s). User listings were not touched.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

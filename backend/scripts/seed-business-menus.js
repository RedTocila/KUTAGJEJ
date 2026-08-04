'use strict';

/**
 * Fill every business listing with a sample menu (10 products).
 *
 *   node scripts/seed-business-menus.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { getSupabaseAdmin, isSupabaseConfigured } = require('../lib/supabase');
const { buildDemoBusinessMenu } = require('../lib/demo-business-menu');

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('Supabase is not configured.');
    process.exit(1);
  }

  const sb = getSupabaseAdmin();
  const { data: rows, error } = await sb
    .from('directory_listings')
    .select('id, title, category, menu_items')
    .eq('vertical', 'businesses');
  if (error) throw error;

  const listings = rows ?? [];
  console.log(`Found ${listings.length} business listing(s).`);

  let updated = 0;
  for (const row of listings) {
    const menu = buildDemoBusinessMenu(row.category || 'kafe');
    const { error: updErr } = await sb
      .from('directory_listings')
      .update({
        menu_categories: menu.menuCategories,
        menu_items: menu.menuItems,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (updErr) {
      console.error(`Failed ${row.title}:`, updErr.message);
      continue;
    }
    updated += 1;
    console.log(`✓ ${row.title} — ${menu.menuItems.length} products, ${menu.menuCategories.length} categories`);
  }

  console.log(`Done. Updated ${updated}/${listings.length} businesses.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

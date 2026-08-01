const { getSupabaseAdmin } = require('./supabase');

/**
 * BOOST CREDIT catalog. `credits` is the base BC; buyers also receive `bonusCredits`.
 * Synced on startup by labelSq so existing installs pick up the new tiers.
 */
const DEFAULT_CREDIT_PACKAGES = [
  { credits: 100, bonusCredits: 0, priceEur: 9, labelSq: 'Starter', badgeSq: '', sortOrder: 0 },
  { credits: 300, bonusCredits: 40, priceEur: 27, labelSq: 'Growth', badgeSq: '+40 BC', sortOrder: 1 },
  { credits: 800, bonusCredits: 200, priceEur: 75, labelSq: 'Pro', badgeSq: '+200 BC', sortOrder: 2 },
  { credits: 2000, bonusCredits: 500, priceEur: 180, labelSq: 'Elite', badgeSq: '+500 BC', sortOrder: 3 },
  { credits: 4000, bonusCredits: 900, priceEur: 360, labelSq: 'Competitor', badgeSq: '+900 BC', sortOrder: 4 },
  { credits: 8000, bonusCredits: 1500, priceEur: 750, labelSq: 'Dominator', badgeSq: '+1500 BC', sortOrder: 5 },
];

async function ensureCreditPackages() {
  const sb = getSupabaseAdmin();
  const legacyLabels = ['100 kredite', '250 kredite', '600 kredite', '1500 kredite'];
  const now = new Date().toISOString();

  for (const pkg of DEFAULT_CREDIT_PACKAGES) {
    const { data: existing, error: findErr } = await sb
      .from('credit_packages')
      .select('id')
      .eq('label_sq', pkg.labelSq)
      .maybeSingle();
    if (findErr) throw findErr;

    const row = {
      credits: pkg.credits,
      bonus_credits: pkg.bonusCredits,
      price_eur: pkg.priceEur,
      badge_sq: pkg.badgeSq,
      sort_order: pkg.sortOrder,
      active: true,
      updated_at: now,
    };

    if (existing) {
      const { error } = await sb.from('credit_packages').update(row).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('credit_packages').insert({
        ...row,
        label_sq: pkg.labelSq,
      });
      if (error) throw error;
    }
  }

  const { data: deactivated, error: deactivateErr } = await sb
    .from('credit_packages')
    .update({ active: false, updated_at: now })
    .in('label_sq', legacyLabels)
    .eq('active', true)
    .select('id');
  if (deactivateErr) throw deactivateErr;

  const deactivatedCount = deactivated?.length ?? 0;
  console.log(
    `✓ Synced ${DEFAULT_CREDIT_PACKAGES.length} BOOST CREDIT packages` +
      (deactivatedCount ? ` (hid ${deactivatedCount} legacy)` : ''),
  );
}

module.exports = { ensureCreditPackages, DEFAULT_CREDIT_PACKAGES };

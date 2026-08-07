const { getSupabaseAdmin } = require('./supabase');

/**
 * Canonical subscription packages (platform-wide, all categories).
 * Seeded / upserted for both agent and company audiences.
 */
const PACKAGE_TIERS = [
  {
    planCode: 'free',
    title: 'FREE',
    sortOrder: 0,
    price1Month: 0,
    maxListAllCategories: 1,
    maxJobListings: 10,
    maxCarListings: 5,
    maxApartmentListings: 10,
    maxProductListings: 5,
    maxPremiumListings: 0,
    maxOkazionListings: 0,
    boostCredits: 0,
    refreshEveryHours: 48,
    glowBadgeEnabled: false,
    dailyBoostAccess: false,
    content:
      '0/1 List in All Categories · 0/10 Job Listings · 0/5 Car Listings · 0/10 Apartment Listings · 0/5 Product Listings · Refresh same listing after 48 hours',
  },
  {
    planCode: 'starter',
    title: 'STARTER',
    sortOrder: 1,
    price1Month: 14.9,
    maxListAllCategories: 1,
    maxJobListings: 50,
    maxCarListings: 15,
    maxApartmentListings: 25,
    maxProductListings: 15,
    maxPremiumListings: 0,
    maxOkazionListings: 0,
    boostCredits: 150,
    refreshEveryHours: 24,
    glowBadgeEnabled: false,
    dailyBoostAccess: false,
    content:
      '0/1 List in All Categories · 0/15 Car · 0/25 Apartment · 0/15 Product · 0/50 Job · 150 Boost Coins · Refresh same listing after 24 hours',
  },
  {
    planCode: 'grow',
    title: 'GROW',
    sortOrder: 2,
    price1Month: 49.9,
    maxListAllCategories: 1,
    maxJobListings: 200,
    maxCarListings: 40,
    maxApartmentListings: 250,
    maxProductListings: 50,
    maxPremiumListings: 20,
    maxOkazionListings: 5,
    boostCredits: 1000,
    refreshEveryHours: 12,
    glowBadgeEnabled: true,
    dailyBoostAccess: false,
    content:
      '0/1 List in All Categories · 0/40 Cars · 0/250 Apartments · 0/50 Products · 0/200 Jobs · 0/20 Premium (30 days) · 0/5 OKAZION (5 days) · 1000 Boost Coins · Refresh same listing after 12 hours · Trust Badge',
  },
  {
    planCode: 'elite',
    title: 'ELITE',
    sortOrder: 3,
    price1Month: 129.9,
    maxListAllCategories: 1,
    maxJobListings: 500,
    maxCarListings: 150,
    maxApartmentListings: 1000,
    maxProductListings: 200,
    maxPremiumListings: 30,
    maxOkazionListings: 10,
    boostCredits: 2000,
    refreshEveryHours: 6,
    glowBadgeEnabled: true,
    dailyBoostAccess: false,
    content:
      '0/1 List in All Categories · 0/150 Cars · 0/1000 Apartments · 0/200 Products · 0/500 Jobs · 0/30 Premium (30 days) · 0/10 OKAZION (5 days) · 2000 Boost Coins · Refresh same listing after 6 hours · Trust Badge',
  },
];

const SUBSCRIBER_KINDS = [
  { kind: 'agent', roleName: 'Individual' },
  { kind: 'company', roleName: 'Biznes' },
];

function tierFields(tier) {
  return {
    title: tier.title,
    content: tier.content,
    sort_order: tier.sortOrder,
    listing_category_key: null,
    refresh_every_hours: tier.refreshEveryHours,
    glow_badge_enabled: tier.glowBadgeEnabled,
    boost_credits: tier.boostCredits,
    daily_boost_access: tier.dailyBoostAccess,
    max_list_all_categories: tier.maxListAllCategories,
    max_job_listings: tier.maxJobListings,
    max_car_listings: tier.maxCarListings,
    max_apartment_listings: tier.maxApartmentListings,
    max_product_listings: tier.maxProductListings,
    max_premium_listings: tier.maxPremiumListings,
    max_okazion_listings: tier.maxOkazionListings,
    price_1_month: tier.price1Month,
    price_3_months: null,
    price_6_months: null,
    price_12_months: null,
  };
}

async function ensureContractPackages() {
  const sb = getSupabaseAdmin();
  const roleByName = {};

  for (const { roleName } of SUBSCRIBER_KINDS) {
    const { data: role, error } = await sb.from('roles').select('id').eq('name', roleName).maybeSingle();
    if (error) throw error;
    if (role) roleByName[roleName] = role.id;
  }

  let upserted = 0;
  const now = new Date().toISOString();

  for (const { kind, roleName } of SUBSCRIBER_KINDS) {
    const roleId = roleByName[roleName];
    for (const tier of PACKAGE_TIERS) {
      const fields = {
        ...tierFields(tier),
        plan_code: tier.planCode,
        subscriber_kind: kind,
        role_ids: roleId ? [roleId] : [],
        updated_at: now,
      };

      const { data: existing, error: findErr } = await sb
        .from('contracts')
        .select('id')
        .eq('plan_code', tier.planCode)
        .eq('subscriber_kind', kind)
        .maybeSingle();
      if (findErr) throw findErr;

      if (existing) {
        let { error } = await sb.from('contracts').update(fields).eq('id', existing.id);
        if (error && /max_okazion_listings/i.test(String(error.message || ''))) {
          console.warn(
            '[okazion] contracts.max_okazion_listings missing — apply 20260805140000_okazion_listings.sql',
          );
          const { max_okazion_listings: _omit, ...rest } = fields;
          ({ error } = await sb.from('contracts').update(rest).eq('id', existing.id));
        }
        if (error) throw error;
        upserted += 1;
      } else {
        let { error } = await sb.from('contracts').insert({
          ...fields,
          created_at: now,
        });
        if (error && /max_okazion_listings/i.test(String(error.message || ''))) {
          console.warn(
            '[okazion] contracts.max_okazion_listings missing — apply 20260805140000_okazion_listings.sql',
          );
          const { max_okazion_listings: _omit, ...rest } = fields;
          ({ error } = await sb.from('contracts').insert({
            ...rest,
            created_at: now,
          }));
        }
        if (error) throw error;
        upserted += 1;
      }
    }
  }

  if (upserted > 0) {
    console.log(`✓ Ensured contract packages (${PACKAGE_TIERS.length} tiers × ${SUBSCRIBER_KINDS.length} audiences)`);
  }
}

module.exports = { ensureContractPackages, PACKAGE_TIERS };

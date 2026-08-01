const Contract = require('../models/Contract');
const Role = require('../models/Role');

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
    boostCredits: 0,
    refreshEveryHours: 48,
    glowBadgeEnabled: false,
    dailyBoostAccess: false,
    content:
      '0/1 List in All Categories · 0/10 Job Listings · 0/5 Car Listings · 0/10 Apartment Listings · 0/5 Product Listings · Refresh every 48 hours',
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
    boostCredits: 150,
    refreshEveryHours: 24,
    glowBadgeEnabled: true,
    dailyBoostAccess: false,
    content:
      '0/1 List in All Categories · 0/15 Car · 0/25 Apartment · 0/15 Product · 0/50 Job · 150 Boost Coins · Refresh every 24 hours · Trust Badge',
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
    boostCredits: 1000,
    refreshEveryHours: 12,
    glowBadgeEnabled: true,
    dailyBoostAccess: false,
    content:
      '0/1 List in All Categories · 0/40 Cars · 0/250 Apartments · 0/50 Products · 0/200 Jobs · 0/20 Premium · 1000 Boost Coins · Refresh every 12 hours · Trust Badge',
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
    boostCredits: 2000,
    refreshEveryHours: 6,
    glowBadgeEnabled: true,
    dailyBoostAccess: false,
    content:
      '0/1 List in All Categories · 0/150 Cars · 0/1000 Apartments · 0/200 Products · 0/500 Jobs · 0/30 Premium · 2000 Boost Coins · Refresh every 6 hours · Trust Badge',
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
    sortOrder: tier.sortOrder,
    listingCategoryKey: null,
    refreshEveryHours: tier.refreshEveryHours,
    glowBadgeEnabled: tier.glowBadgeEnabled,
    boostCredits: tier.boostCredits,
    dailyBoostAccess: tier.dailyBoostAccess,
    maxListAllCategories: tier.maxListAllCategories,
    maxJobListings: tier.maxJobListings,
    maxCarListings: tier.maxCarListings,
    maxApartmentListings: tier.maxApartmentListings,
    maxProductListings: tier.maxProductListings,
    maxPremiumListings: tier.maxPremiumListings,
    price1Month: tier.price1Month,
    price3Months: null,
    price6Months: null,
    price12Months: null,
  };
}

async function ensureContractPackages() {
  const roleByName = {};
  for (const { roleName } of SUBSCRIBER_KINDS) {
    const role = await Role.findOne({ name: roleName }).select('_id').lean();
    if (role) roleByName[roleName] = role._id;
  }

  let upserted = 0;
  for (const { kind, roleName } of SUBSCRIBER_KINDS) {
    const roleId = roleByName[roleName];
    for (const tier of PACKAGE_TIERS) {
      const fields = {
        ...tierFields(tier),
        planCode: tier.planCode,
        subscriberKind: kind,
        roleIds: roleId ? [roleId] : [],
        updatedAt: new Date(),
      };
      const result = await Contract.updateOne(
        { planCode: tier.planCode, subscriberKind: kind },
        {
          $set: fields,
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
      if (result.upsertedCount || result.modifiedCount) upserted += 1;
    }
  }

  if (upserted > 0) {
    console.log(`✓ Ensured contract packages (${PACKAGE_TIERS.length} tiers × ${SUBSCRIBER_KINDS.length} audiences)`);
  }
}

module.exports = { ensureContractPackages, PACKAGE_TIERS };

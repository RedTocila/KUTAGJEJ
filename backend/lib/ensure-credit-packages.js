const CreditPackage = require('../models/CreditPackage');

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
  const legacyLabels = ['100 kredite', '250 kredite', '600 kredite', '1500 kredite'];

  for (const pkg of DEFAULT_CREDIT_PACKAGES) {
    await CreditPackage.findOneAndUpdate(
      { labelSq: pkg.labelSq },
      {
        $set: {
          credits: pkg.credits,
          bonusCredits: pkg.bonusCredits,
          priceEur: pkg.priceEur,
          badgeSq: pkg.badgeSq,
          sortOrder: pkg.sortOrder,
          active: true,
        },
        $setOnInsert: { labelSq: pkg.labelSq },
      },
      { upsert: true },
    );
  }

  const deactivate = await CreditPackage.updateMany(
    { labelSq: { $in: legacyLabels }, active: true },
    { $set: { active: false } },
  );

  console.log(
    `✓ Synced ${DEFAULT_CREDIT_PACKAGES.length} BOOST CREDIT packages` +
      (deactivate.modifiedCount ? ` (hid ${deactivate.modifiedCount} legacy)` : ''),
  );
}

module.exports = { ensureCreditPackages, DEFAULT_CREDIT_PACKAGES };

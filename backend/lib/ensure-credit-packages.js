const CreditPackage = require('../models/CreditPackage');

/** Seeded once if the collection is empty, so the store isn't blank on first run. */
const DEFAULT_CREDIT_PACKAGES = [
  { credits: 100, priceEur: 5, labelSq: '100 kredite', badgeSq: '', sortOrder: 0 },
  { credits: 250, priceEur: 10, labelSq: '250 kredite', badgeSq: 'Popullore', sortOrder: 1 },
  { credits: 600, priceEur: 20, labelSq: '600 kredite', badgeSq: '', sortOrder: 2 },
  { credits: 1500, priceEur: 45, labelSq: '1500 kredite', badgeSq: 'Vlera më e mirë', sortOrder: 3 },
];

async function ensureCreditPackages() {
  const count = await CreditPackage.estimatedDocumentCount();
  if (count > 0) return;
  await CreditPackage.insertMany(
    DEFAULT_CREDIT_PACKAGES.map((p) => ({ ...p, active: true })),
  );
  console.log(`✓ Seeded ${DEFAULT_CREDIT_PACKAGES.length} credit packages`);
}

module.exports = { ensureCreditPackages, DEFAULT_CREDIT_PACKAGES };

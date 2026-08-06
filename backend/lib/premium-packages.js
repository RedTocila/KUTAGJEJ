'use strict';

/**
 * Premium listing add-on packs — buy with card or Boost Coins, then assign to a listing.
 */
const PREMIUM_PACKAGES = [
  {
    id: 'premium-15',
    days: 15,
    priceBc: 200,
    priceEur: 18,
    labelSq: '15 ditë Premium',
    labelEn: '15 Days Premium Listing',
  },
  {
    id: 'premium-30',
    days: 30,
    priceBc: 300,
    priceEur: 27,
    labelSq: '30 ditë Premium',
    labelEn: '30 Days Premium Listing',
  },
];

function listPremiumPackages() {
  return PREMIUM_PACKAGES.map((p) => ({ ...p }));
}

function getPremiumPackage(packageId) {
  const id = String(packageId || '').trim();
  return PREMIUM_PACKAGES.find((p) => p.id === id) || null;
}

module.exports = {
  PREMIUM_PACKAGES,
  listPremiumPackages,
  getPremiumPackage,
};

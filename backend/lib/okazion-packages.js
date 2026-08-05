'use strict';

/**
 * OKAZION listing packs — buy with card or Boost Coins, stack unused vouchers, assign later.
 * Each activation lasts 5 days on any approved listing category.
 */
const OKAZION_PACKAGES = [
  {
    id: 'okazion-5',
    days: 5,
    priceBc: 100,
    priceEur: 5,
    labelSq: '5 ditë OKAZION',
    labelEn: '5 Days OKAZION Listing',
  },
];

function listOkazionPackages() {
  return OKAZION_PACKAGES.map((p) => ({ ...p }));
}

function getOkazionPackage(packageId) {
  const id = String(packageId || '').trim();
  return OKAZION_PACKAGES.find((p) => p.id === id) || null;
}

module.exports = {
  OKAZION_PACKAGES,
  listOkazionPackages,
  getOkazionPackage,
};

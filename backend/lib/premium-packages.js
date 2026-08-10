'use strict';

/**
 * Premium listing packs — backed by `addon_packages` (DB) with in-memory cache.
 */
const {
  listPremiumPackages,
  getPremiumPackage,
  DEFAULT_ADDON_PACKAGES,
} = require('./addon-packages');

const PREMIUM_PACKAGES = DEFAULT_ADDON_PACKAGES.filter((p) => p.kind === 'premium');

module.exports = {
  PREMIUM_PACKAGES,
  listPremiumPackages,
  getPremiumPackage,
};

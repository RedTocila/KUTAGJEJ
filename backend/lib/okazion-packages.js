'use strict';

/**
 * OKAZION listing packs — backed by `addon_packages` (DB) with in-memory cache.
 */
const {
  listOkazionPackages,
  getOkazionPackage,
  DEFAULT_ADDON_PACKAGES,
} = require('./addon-packages');

const OKAZION_PACKAGES = DEFAULT_ADDON_PACKAGES.filter((p) => p.kind === 'okazion');

module.exports = {
  OKAZION_PACKAGES,
  listOkazionPackages,
  getOkazionPackage,
};

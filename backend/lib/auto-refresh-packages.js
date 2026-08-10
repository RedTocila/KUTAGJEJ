'use strict';

/**
 * Auto-refresh slot packs — backed by `addon_packages` (DB) with in-memory cache.
 */
const {
  listAutoRefreshPackages,
  getAutoRefreshPackage,
  refreshHoursForPlanCode,
  REFRESH_HOURS_BY_PLAN,
  DEFAULT_ADDON_PACKAGES,
} = require('./addon-packages');

const AUTO_REFRESH_PACKAGES = DEFAULT_ADDON_PACKAGES.filter((p) => p.kind === 'auto-refresh');

module.exports = {
  AUTO_REFRESH_PACKAGES,
  REFRESH_HOURS_BY_PLAN,
  listAutoRefreshPackages,
  getAutoRefreshPackage,
  refreshHoursForPlanCode,
};

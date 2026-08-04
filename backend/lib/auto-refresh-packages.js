'use strict';

/**
 * Hardcoded add-on catalog for listing auto-refresh slot packs.
 * Interval between refreshes comes from the buyer's active subscription plan.
 */
const AUTO_REFRESH_PACKAGES = [
  {
    id: 'auto-refresh-10',
    slots: 10,
    priceEur: 14.9,
    labelSq: '10 njoftime Auto-Refresh',
    labelEn: '10 Listings Auto-Refresh',
  },
  {
    id: 'auto-refresh-20',
    slots: 20,
    priceEur: 24.9,
    labelSq: '20 njoftime Auto-Refresh',
    labelEn: '20 Listings Auto-Refresh',
  },
];

/** Plan → hours between automatic refreshes (matches contract packages). */
const REFRESH_HOURS_BY_PLAN = {
  free: 48,
  starter: 24,
  grow: 12,
  elite: 6,
};

function listAutoRefreshPackages() {
  return AUTO_REFRESH_PACKAGES.map((p) => ({ ...p }));
}

function getAutoRefreshPackage(packageId) {
  const id = String(packageId || '').trim();
  return AUTO_REFRESH_PACKAGES.find((p) => p.id === id) || null;
}

function refreshHoursForPlanCode(planCode) {
  const key = String(planCode || 'free').toLowerCase();
  return REFRESH_HOURS_BY_PLAN[key] ?? REFRESH_HOURS_BY_PLAN.free;
}

module.exports = {
  AUTO_REFRESH_PACKAGES,
  REFRESH_HOURS_BY_PLAN,
  listAutoRefreshPackages,
  getAutoRefreshPackage,
  refreshHoursForPlanCode,
};

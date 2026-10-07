'use strict';

/**
 * Maps App Store / RevenueCat product IDs → KuTaGjej grants.
 * Keep in sync with App Store Connect + RevenueCat Product catalog.
 */

/** @typedef {'subscription' | 'credits' | 'premium' | 'okazion' | 'auto-refresh'} IapGrantKind */

/**
 * @typedef {object} IapProductSpec
 * @property {IapGrantKind} kind
 * @property {string} [planCode] subscription plan_code
 * @property {number} [months]
 * @property {number} [credits]
 * @property {string} [premiumPackageId]
 * @property {string} [okazionPackageId]
 * @property {number} [okazionQuantity]
 * @property {number} [autoRefreshSlots]
 * @property {number} [priceEur] catalog list price (audit)
 * @property {string} description
 */

/** @type {Record<string, IapProductSpec>} */
const PRODUCT_CATALOG = {
  'al.kutagjej.plan.starter.1m': {
    kind: 'subscription',
    planCode: 'starter',
    months: 1,
    priceEur: 14,
    description: 'Starter monthly (Apple IAP)',
  },
  'al.kutagjej.plan.grow.1m': {
    kind: 'subscription',
    planCode: 'grow',
    months: 1,
    priceEur: 59,
    description: 'Grow monthly (Apple IAP)',
  },
  'al.kutagjej.plan.elite.1m': {
    kind: 'subscription',
    planCode: 'elite',
    months: 1,
    priceEur: 149,
    description: 'Elite monthly (Apple IAP)',
  },
  'al.kutagjej.coins.starter': {
    kind: 'credits',
    credits: 100,
    priceEur: 9,
    description: 'Boost Coins Starter (Apple IAP)',
  },
  'al.kutagjej.coins.growth': {
    kind: 'credits',
    credits: 340,
    priceEur: 27,
    description: 'Boost Coins Growth (Apple IAP)',
  },
  'al.kutagjej.coins.pro': {
    kind: 'credits',
    credits: 1000,
    priceEur: 75,
    description: 'Boost Coins Pro (Apple IAP)',
  },
  'al.kutagjej.premium.15': {
    kind: 'premium',
    premiumPackageId: 'premium-15',
    priceEur: 18,
    description: 'Premium 15 days (Apple IAP)',
  },
  'al.kutagjej.premium.30': {
    kind: 'premium',
    premiumPackageId: 'premium-30',
    priceEur: 27,
    description: 'Premium 30 days (Apple IAP)',
  },
  'al.kutagjej.okazion.5': {
    kind: 'okazion',
    okazionPackageId: 'okazion-5',
    okazionQuantity: 1,
    priceEur: 19,
    description: 'Okazion 7 days (Apple IAP)',
  },
  'al.kutagjej.autorefresh.10': {
    kind: 'auto-refresh',
    autoRefreshSlots: 10,
    priceEur: 14,
    description: 'Auto-Refresh 10 (Apple IAP)',
  },
  'al.kutagjej.autorefresh.20': {
    kind: 'auto-refresh',
    autoRefreshSlots: 20,
    priceEur: 24,
    description: 'Auto-Refresh 20 (Apple IAP)',
  },
};

/** RevenueCat offering package identifier → App Store product ID */
const OFFERING_PACKAGE_TO_PRODUCT = {
  starter: 'al.kutagjej.plan.starter.1m',
  grow: 'al.kutagjej.plan.grow.1m',
  elite: 'al.kutagjej.plan.elite.1m',
};

/** Website credit package id → App Store product ID */
const CREDIT_PACKAGE_TO_PRODUCT = {
  Starter: 'al.kutagjej.coins.starter',
  Growth: 'al.kutagjej.coins.growth',
  Pro: 'al.kutagjej.coins.pro',
};

function getProductSpec(productId) {
  if (!productId) return null;
  return PRODUCT_CATALOG[String(productId)] || null;
}

module.exports = {
  PRODUCT_CATALOG,
  OFFERING_PACKAGE_TO_PRODUCT,
  CREDIT_PACKAGE_TO_PRODUCT,
  getProductSpec,
};

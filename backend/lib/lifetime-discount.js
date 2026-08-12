'use strict';

const { resolveReferralBadges } = require('./referrals');

const MAX_LIFETIME_PERCENT = 50;

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_LIFETIME_PERCENT, n);
}

/**
 * Sum of lifetime % from earned referral badges (Network Builder, Revenue Driver,
 * Trusted, Platform Dominator). Capped so a misconfigured program cannot zero out prices.
 */
async function resolveEarnedLifetimePercent(userId, userModel) {
  const badges = await resolveReferralBadges(userId, userModel);
  let total = 0;
  for (const badge of badges || []) {
    if (!badge?.earned) continue;
    total += clampPercent(badge.lifetimePercent);
  }
  return clampPercent(total);
}

function applyLifetimeDiscount(amountEur, percent) {
  const list = Number(amountEur);
  if (!Number.isFinite(list) || list <= 0) return 0;
  const p = clampPercent(percent);
  if (p <= 0) return Math.round(list * 100) / 100;
  const listMinor = Math.round(list * 100);
  const discountedMinor = Math.max(1, Math.round(listMinor * (1 - p / 100)));
  return discountedMinor / 100;
}

async function priceWithLifetimeDiscount(user, listEur) {
  const listPriceEur = Number(listEur);
  const lifetimePercent = user?.id
    ? await resolveEarnedLifetimePercent(user.id, user.constructor?.modelName)
    : 0;
  const amount = applyLifetimeDiscount(listPriceEur, lifetimePercent);
  return {
    listPriceEur,
    amount,
    amountMinor: Math.round(amount * 100),
    lifetimePercent,
  };
}

module.exports = {
  MAX_LIFETIME_PERCENT,
  clampPercent,
  resolveEarnedLifetimePercent,
  applyLifetimeDiscount,
  priceWithLifetimeDiscount,
};

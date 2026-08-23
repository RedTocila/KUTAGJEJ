'use strict';

/**
 * Daily AI Build caps by subscription plan were replaced by Boost Coin billing
 * (backend/lib/ai-usage.js). This module remains so existing require() paths
 * do not break.
 */

const { getAiUsageSnapshot } = require('./ai-usage');

async function getAiImportQuota(userId) {
  const snapshot = await getAiUsageSnapshot(userId);
  return {
    planCode: 'bc',
    unlimited: false,
    limit: null,
    used: 0,
    remaining: snapshot.balance,
    usedOn: null,
    balance: snapshot.balance,
  };
}

module.exports = {
  getAiImportQuota,
};

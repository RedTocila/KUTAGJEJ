const mongoose = require('mongoose');
const CreditPackage = require('../models/CreditPackage');

/** Total BC granted for a package (base + bonus). */
function totalCredits(doc) {
  return Number(doc.credits || 0) + Number(doc.bonusCredits || 0);
}

/** Shape returned to buyers (and the admin list uses the raw doc directly). */
function formatCreditPackage(doc) {
  return {
    id: String(doc._id),
    credits: doc.credits,
    bonusCredits: Number(doc.bonusCredits) || 0,
    priceEur: doc.priceEur,
    labelSq: doc.labelSq,
    badgeSq: doc.badgeSq || undefined,
  };
}

/** Active packages, sorted, for the public store. */
async function listActiveCreditPackages() {
  const docs = await CreditPackage.find({ active: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();
  return docs.map(formatCreditPackage);
}

/** A single active package by id, or null. Used when creating an order. */
async function getActiveCreditPackage(id) {
  const key = String(id || '').trim();
  if (!mongoose.Types.ObjectId.isValid(key)) return null;
  const doc = await CreditPackage.findOne({ _id: key, active: true }).lean();
  return doc || null;
}

module.exports = {
  formatCreditPackage,
  listActiveCreditPackages,
  getActiveCreditPackage,
  totalCredits,
};

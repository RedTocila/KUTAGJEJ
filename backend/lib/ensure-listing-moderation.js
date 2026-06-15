const { backfillListingStatuses } = require('./listing-moderation');

async function ensureListingModeration() {
  await backfillListingStatuses();

  const models = [
    'RealEstateListing',
    'CarListing',
    'JobListing',
    'MarketplaceListing',
    'DirectoryListing',
  ];
  for (const name of models) {
    const Model = require(`../models/${name}`);
    await Model.collection.createIndex({ status: 1, createdAt: -1 });
  }

  const AdminNotification = require('../models/AdminNotification');
  await AdminNotification.collection.createIndex({ readAt: 1, createdAt: -1 });
}

module.exports = { ensureListingModeration };

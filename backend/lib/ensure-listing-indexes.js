/**
 * Ensures MongoDB indexes for high-traffic listing queries.
 * Safe to run on every startup — createIndex is idempotent.
 */
async function ensureListingIndexes() {
  const models = [
    { name: 'RealEstateListing', compound: [{ posterId: 1, createdAt: -1 }] },
    { name: 'CarListing', compound: [{ posterId: 1, createdAt: -1 }, { createdAt: -1 }] },
    { name: 'JobListing', compound: [{ posterId: 1, createdAt: -1 }, { createdAt: -1 }] },
    { name: 'MarketplaceListing', compound: [{ posterId: 1, createdAt: -1 }, { createdAt: -1 }] },
    {
      name: 'DirectoryListing',
      compound: [
        { vertical: 1, createdAt: -1 },
        { posterId: 1, createdAt: -1 },
        { createdAt: -1 },
      ],
    },
  ];

  for (const { name, compound } of models) {
    const Model = require(`../models/${name}`);
    for (const keys of compound) {
      await Model.collection.createIndex(keys);
    }
  }
}

module.exports = { ensureListingIndexes };

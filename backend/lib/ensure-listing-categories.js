/**
 * Ensures the four fixed verticals exist with sensible Albanian defaults.
 * Only inserts missing docs; does not overwrite admin edits.
 */
async function ensureListingCategories() {
  const ListingCategory = require('../models/ListingCategory');

  const defaults = [
    {
      key: 'real-estate',
      title: 'Pasuri të paluajtshme',
      slug: 'pasuri-te-paluajtshme',
      listingTypes: [
        { slug: 'apartament', label: 'Apartament' },
        { slug: 'vila', label: 'Vila' },
        { slug: 'penthouse', label: 'Penthouse' },
      ],
    },
    {
      key: 'job-listings',
      title: 'Njoftime pune',
      slug: 'njoftime-pune',
      listingTypes: [
        { slug: 'full-time', label: 'Full-time' },
        { slug: 'part-time', label: 'Part-time' },
        { slug: 'praktike', label: 'Praktikë' },
      ],
    },
    {
      key: 'cars',
      title: 'Automjete',
      slug: 'automjete',
      listingTypes: [
        { slug: 'vetura', label: 'Vetura' },
        { slug: 'suv', label: 'SUV' },
        { slug: 'kamion', label: 'Kamion' },
      ],
    },
    {
      key: 'marketplace',
      title: 'Tregu',
      slug: 'tregu',
      listingTypes: [
        { slug: 'elektronike', label: 'Elektronikë' },
        { slug: 'mobilje', label: 'Mobilje' },
        { slug: 'veshje', label: 'Veshje' },
      ],
    },
  ];

  for (const d of defaults) {
    await ListingCategory.updateOne(
      { key: d.key },
      {
        $setOnInsert: {
          title: d.title,
          slug: d.slug,
          listingTypes: d.listingTypes,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }
}

module.exports = { ensureListingCategories };

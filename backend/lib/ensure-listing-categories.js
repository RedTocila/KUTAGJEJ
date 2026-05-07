/**
 * Ensures the four fixed verticals exist with sensible Albanian defaults.
 * Only inserts missing docs; does not overwrite admin edits.
 */
async function ensureListingCategories() {
  const ListingCategory = require('../models/ListingCategory');

  const defaults = [
    {
      key: 'real-estate',
      title: 'Prona',
      slug: 'prona',
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
      title: 'Makina',
      slug: 'makina',
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
    {
      key: 'businesses',
      title: 'Biznese',
      slug: 'biznese',
      listingTypes: [
        { slug: 'restorant', label: 'Restorant' },
        { slug: 'bar', label: 'Bar & pub' },
        { slug: 'kafe', label: 'Kafene' },
        { slug: 'brunch', label: 'Brunch & mëngjes' },
        { slug: 'piceri-fast-food', label: 'Piceri & fast food' },
        { slug: 'pasticeri', label: 'Pastiçeri & ëmbëlsira' },
      ],
    },
    {
      key: 'professionals',
      title: 'Profesionistë',
      slug: 'profesioniste',
      listingTypes: [
        { slug: 'konsulent', label: 'Konsulence' },
        { slug: 'freelance', label: 'Freelance' },
        { slug: 'sherbim', label: 'Shërbime profesionale' },
        { slug: 'kurse', label: 'Kurse & trajnim' },
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

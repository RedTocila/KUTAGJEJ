/**
 * Ensures the four fixed verticals exist with sensible Albanian defaults.
 * Only inserts missing docs; does not overwrite admin edits.
 */
const { getSupabaseAdmin } = require('./supabase');

async function ensureListingCategories() {
  const sb = getSupabaseAdmin();

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
    const { data: existing, error: findErr } = await sb
      .from('listing_categories')
      .select('id')
      .eq('key', d.key)
      .maybeSingle();
    if (findErr) throw findErr;
    if (existing) continue;

    const { error } = await sb.from('listing_categories').insert({
      key: d.key,
      title: d.title,
      slug: d.slug,
      listing_types: d.listingTypes,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
}

module.exports = { ensureListingCategories };

/** Venue & service categories for Biznese (not commercial real estate). */
const BUSINESS_CATEGORY_LABELS = {
  restorant: 'Restorant',
  bar: 'Bar & pub',
  kafe: 'Kafene',
  brunch: 'Brunch & mëngjes',
  'piceri-fast-food': 'Piceri & fast food',
  pasticeri: 'Pastiçeri & ëmbëlsira',
};

const PROFESSIONAL_CATEGORY_LABELS = {
  konsulent: 'Konsulence',
  freelance: 'Freelance',
  sherbim: 'Shërbime profesionale',
  kurse: 'Kurse & trajnim',
  'dizajn-it': 'Dizajn & IT',
  marketing: 'Marketing',
  mjekesi: 'Mjekësi',
  arsim: 'Arsim',
};

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 48;
/** Job listings are hidden from public browse after this many days. */
const JOB_LISTING_VISIBLE_DAYS = 15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

module.exports = {
  BUSINESS_CATEGORY_LABELS,
  PROFESSIONAL_CATEGORY_LABELS,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  JOB_LISTING_VISIBLE_DAYS,
  MS_PER_DAY,
};

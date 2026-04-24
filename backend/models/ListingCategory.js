const mongoose = require('mongoose');

const CATEGORY_KEYS = ['real-estate', 'job-listings', 'cars', 'marketplace'];

const listingTypeSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const listingCategorySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    enum: CATEGORY_KEYS,
  },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  listingTypes: { type: [listingTypeSchema], default: [] },
  /** Sub-types shown when the user selects "Apartment" on the real-estate listing form (admin-managed). */
  apartmentTypes: { type: [listingTypeSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

listingCategorySchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('ListingCategory', listingCategorySchema);
module.exports.CATEGORY_KEYS = CATEGORY_KEYS;

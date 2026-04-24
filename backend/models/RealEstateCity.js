const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
  },
  { _id: true },
);

const realEstateCitySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  zones: { type: [zoneSchema], default: [] },
  updatedAt: { type: Date, default: Date.now },
});

realEstateCitySchema.pre('save', function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('RealEstateCity', realEstateCitySchema);

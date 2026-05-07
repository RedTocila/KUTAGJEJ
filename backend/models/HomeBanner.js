const mongoose = require('mongoose');

const HomeBannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    subtitle: { type: String, default: '', trim: true, maxlength: 280 },
    imageUrl: { type: String, required: true, trim: true, maxlength: 600 },
    ctaLabel: { type: String, default: '', trim: true, maxlength: 60 },
    ctaHref: { type: String, default: '', trim: true, maxlength: 240 },
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.HomeBanner || mongoose.model('HomeBanner', HomeBannerSchema);

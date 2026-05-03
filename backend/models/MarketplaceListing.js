const mongoose = require('mongoose');

const marketplaceListingSchema = new mongoose.Schema(
  {
    posterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    posterModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },

    transactionType: {
      type: String,
      enum: ['shes'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    condition: { type: String, trim: true, default: null },

    price: { type: Number, default: null },
    currency: { type: String, enum: ['EUR', 'LEK', null], default: null },

    cityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    contactPhone: { type: String, trim: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('MarketplaceListing', marketplaceListingSchema);

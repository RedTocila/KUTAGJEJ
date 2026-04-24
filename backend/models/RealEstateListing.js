const mongoose = require('mongoose');

const realEstateListingSchema = new mongoose.Schema(
  {
    posterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    posterModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    propertyCategory: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    transactionType: { type: String, enum: ['rent', 'sale'], required: true },
    price: { type: Number, required: true },
    currency: { type: String, enum: ['EUR', 'LEK'], required: true },
    surfaceM2: { type: Number, required: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    zoneId: { type: mongoose.Schema.Types.ObjectId, required: true },
    condition: {
      type: String,
      enum: ['new', 'in-construction', 'renovated', 'good-condition'],
    },
    apartmentTypeSlug: { type: String, trim: true, lowercase: true },
    floor: { type: Number },
    totalFloors: { type: Number },
    parkingFloor: { type: Number },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    furnishing: {
      type: String,
      enum: ['furnished', 'unfurnished', 'partially-furnished', 'kitchen-only'],
    },
    yearBuilt: { type: Number },
  },
  { timestamps: true },
);

module.exports = mongoose.model('RealEstateListing', realEstateListingSchema);

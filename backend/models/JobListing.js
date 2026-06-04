const mongoose = require('mongoose');

const jobListingSchema = new mongoose.Schema(
  {
    posterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    posterModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    industry: { type: String, required: true, trim: true },

    /** References the shared RealEstateCity collection. */
    cityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    education: { type: String, required: true, trim: true },
    experience: { type: String, required: true, trim: true },
    jobType: { type: String, required: true, trim: true },
    workLocation: {
      type: String,
      enum: ['onsite', 'hybrid', 'remote'],
      required: true,
    },

    /** Optional salary — null means not disclosed. */
    salary: { type: Number, default: null },
    currency: { type: String, enum: ['EUR', 'LEK', null], default: null },

    contactPhone: { type: String, trim: true },
    /** Optional cover/company images. */
    imageUrls: [{ type: String, trim: true }],

    responsibilities: [{ type: String, trim: true }],
    requirements: [{ type: String, trim: true }],
    benefits: [
      {
        id: { type: String, required: true, trim: true },
        label: { type: String, required: true, trim: true },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model('JobListing', jobListingSchema);

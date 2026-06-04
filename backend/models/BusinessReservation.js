const mongoose = require('mongoose');

const businessReservationSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectoryListing', required: true, index: true },
    guestName: { type: String, required: true, trim: true },
    guestPhone: { type: String, required: true, trim: true },
    partySize: { type: Number, required: true, min: 1, max: 50 },
    reservationDate: { type: String, required: true, trim: true },
    timeSlot: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, default: null },
    userModel: { type: String, enum: ['IndividualUser', 'BusinessUser', null], default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('BusinessReservation', businessReservationSchema);

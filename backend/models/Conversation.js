const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    listingKind: {
      type: String,
      enum: ['real-estate', 'cars', 'jobs', 'marketplace', 'businesses', 'professionals'],
      required: true,
      index: true,
    },
    listingId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    listingTitle: { type: String, required: true, trim: true },
    listingImageUrl: { type: String, trim: true, default: null },
    posterId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    posterModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    inquirerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    inquirerModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], required: true },
    lastMessageText: { type: String, trim: true, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    posterUnreadCount: { type: Number, default: 0, min: 0 },
    inquirerUnreadCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

conversationSchema.index(
  { listingKind: 1, listingId: 1, inquirerId: 1, inquirerModel: 1 },
  { unique: true },
);
conversationSchema.index({ posterId: 1, posterModel: 1, lastMessageAt: -1 });
conversationSchema.index({ inquirerId: 1, inquirerModel: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);

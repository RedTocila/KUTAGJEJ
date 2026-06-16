const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  /** Albania tax ID (NIPT) — unique when set. */
  nipt: { type: String, trim: true, sparse: true, unique: true },
  businessName: { type: String, trim: true },
  businessOwner: { type: String, trim: true },
  businessCategory: { type: String, trim: true },
  /** Optional contact number (e.g. for listings). */
  phone: { type: String, trim: true, default: '' },
  role: { type: String, default: 'business-user' },
  isActive: { type: Boolean, default: true },
  lastActive: { type: Date, default: Date.now },
  jobsEmployerVerifiedAt: { type: Date, default: null },
  professionalsVerifiedAt: { type: Date, default: null },
  referralCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true, index: true },
  referredById: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  referredByModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], default: null },
  boostCredits: { type: Number, default: 0, min: 0 },
  referralTiersClaimed: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

businessUserSchema.pre('save', async function () {
  this.updatedAt = Date.now();
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

businessUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

businessUserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('BusinessUser', businessUserSchema);

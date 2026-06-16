const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const individualUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  /** Optional contact number (e.g. for listings). */
  phone: { type: String, trim: true, default: '' },
  role: { type: String, default: 'individual-user' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  lastActive: { type: Date, default: Date.now },
  /** Approved employer badge for Punë listings (`JobVerifiedBadge`). */
  jobsEmployerVerifiedAt: { type: Date, default: null },
  professionalsVerifiedAt: { type: Date, default: null },
  /** Unique code for inviting others (`?ref=CODE`). */
  referralCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true, index: true },
  referredById: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  referredByModel: { type: String, enum: ['IndividualUser', 'BusinessUser'], default: null },
  boostCredits: { type: Number, default: 0, min: 0 },
  /** Free-tier levels from ReferralProgram already rewarded (e.g. [1, 2]). */
  referralTiersClaimed: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

individualUserSchema.pre('save', async function () {
  this.updatedAt = Date.now();
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

individualUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

individualUserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('IndividualUser', individualUserSchema);

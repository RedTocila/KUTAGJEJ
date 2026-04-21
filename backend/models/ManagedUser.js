const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Staff users created by an Admin.
 * `roleId` references the Role catalog; `role` mirrors Role.name for JWT and legacy reads.
 */
const managedUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', default: null },
  /** Denormalized role label (kept in sync with Role.name for auth payloads). */
  role: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  lastLogin: { type: Date },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

managedUserSchema.pre('save', async function () {
  this.updatedAt = Date.now();
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

managedUserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

managedUserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('ManagedUser', managedUserSchema);

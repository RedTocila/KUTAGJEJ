const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  role: { type: String, default: 'admin' },
  lastLogin: { type: Date },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);

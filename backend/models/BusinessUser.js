const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const businessUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  role: { type: String, default: 'business-user' },
  isActive: { type: Boolean, default: true },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

businessUserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

businessUserSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
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

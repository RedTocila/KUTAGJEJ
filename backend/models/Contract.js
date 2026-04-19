const mongoose = require('mongoose');

/** Legal / business contract template linked to one or more catalog roles (managed users). */
const contractSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, trim: true, default: '' },
  roleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

contractSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Contract', contractSchema);

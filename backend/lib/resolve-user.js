const Admin = require('../models/Admin');
const BusinessUser = require('../models/BusinessUser');
const IndividualUser = require('../models/IndividualUser');
const ManagedUser = require('../models/ManagedUser');

const USER_MODELS = {
  Admin,
  BusinessUser,
  IndividualUser,
  ManagedUser,
};

const VALID_USER_TYPES = Object.keys(USER_MODELS);

/**
 * Resolve a user document from a decoded JWT payload.
 * Uses `userType` when present (new tokens); falls back to sequential lookup for legacy tokens.
 */
async function resolveUserFromToken(decoded) {
  if (!decoded?.id) return null;

  const userType = decoded.userType;
  if (userType && VALID_USER_TYPES.includes(userType)) {
    const user = await USER_MODELS[userType].findById(decoded.id);
    if (user) return user;
  }

  let user = await Admin.findById(decoded.id);
  if (!user) user = await BusinessUser.findById(decoded.id);
  if (!user) user = await IndividualUser.findById(decoded.id);
  if (!user) user = await ManagedUser.findById(decoded.id);
  return user || null;
}

function isUserInactive(user) {
  const model = user.constructor.modelName;
  return (model === 'ManagedUser' || model === 'IndividualUser') && user.isActive === false;
}

const LAST_ACTIVE_INTERVAL_MS = 5 * 60 * 1000;

/** Debounced lastActive write — at most once per 5 minutes per user. */
async function touchLastActive(user) {
  const last = user.lastActive ? new Date(user.lastActive).getTime() : 0;
  if (Date.now() - last < LAST_ACTIVE_INTERVAL_MS) return;

  const now = new Date();
  await user.constructor.updateOne({ _id: user._id }, { $set: { lastActive: now } });
  user.lastActive = now;
}

module.exports = {
  resolveUserFromToken,
  isUserInactive,
  touchLastActive,
  USER_MODELS,
};

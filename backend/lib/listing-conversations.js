const mongoose = require('mongoose');
const IndividualUser = require('../models/IndividualUser');
const BusinessUser = require('../models/BusinessUser');
const { getKindConfig, mergePublicFilter, listingTitle } = require('./listing-moderation');

const VALID_KINDS = new Set([
  'real-estate',
  'cars',
  'jobs',
  'marketplace',
  'businesses',
  'professionals',
]);

function portalUserRef(user) {
  const model = user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') return null;
  return { id: user._id, model };
}

function isSamePortalUser(a, b) {
  if (!a || !b) return false;
  return String(a.id) === String(b.id) && a.model === b.model;
}

function userParticipatesInConversation(conv, userRef) {
  if (!userRef) return false;
  if (isSamePortalUser({ id: conv.posterId, model: conv.posterModel }, userRef)) return true;
  if (isSamePortalUser({ id: conv.inquirerId, model: conv.inquirerModel }, userRef)) return true;
  return false;
}

function userRoleInConversation(conv, userRef) {
  if (isSamePortalUser({ id: conv.posterId, model: conv.posterModel }, userRef)) return 'poster';
  if (isSamePortalUser({ id: conv.inquirerId, model: conv.inquirerModel }, userRef)) return 'inquirer';
  return null;
}

async function loadListingForConversation(kind, listingId) {
  if (!VALID_KINDS.has(kind) || !mongoose.isValidObjectId(listingId)) return null;
  const cfg = getKindConfig(kind);
  if (!cfg) return null;
  const filter = mergePublicFilter({ _id: listingId, ...(cfg.extraFilter || {}) });
  const doc = await cfg.model.findOne(filter).lean();
  if (!doc) return null;
  const imageUrl = Array.isArray(doc.imageUrls) && doc.imageUrls[0] ? String(doc.imageUrls[0]) : null;
  return {
    id: String(doc._id),
    kind,
    title: listingTitle(kind, doc),
    imageUrl,
    posterId: doc.posterId,
    posterModel: doc.posterModel,
    contactPhone: doc.contactPhone?.trim?.() || doc.contactPhone || null,
  };
}

/**
 * Newest public listing for a poster — used to start a profile contact chat.
 * @returns {Promise<{ kind: string, listingId: string } | null>}
 */
async function findContactListingForPoster(posterId, posterModel) {
  if (!posterId || !mongoose.isValidObjectId(posterId)) return null;
  if (posterModel !== 'IndividualUser' && posterModel !== 'BusinessUser') return null;

  const kinds = ['real-estate', 'cars', 'jobs', 'marketplace', 'businesses', 'professionals'];
  let best = null;

  for (const kind of kinds) {
    const cfg = getKindConfig(kind);
    if (!cfg) continue;
    const filter = mergePublicFilter({
      posterId,
      posterModel,
      ...(cfg.extraFilter || {}),
    });
    const doc = await cfg.model.findOne(filter).sort({ createdAt: -1 }).select('_id createdAt').lean();
    if (!doc) continue;
    const createdAt = doc.createdAt ? new Date(doc.createdAt).getTime() : 0;
    if (!best || createdAt > best.createdAt) {
      best = { kind, listingId: String(doc._id), createdAt };
    }
  }

  return best ? { kind: best.kind, listingId: best.listingId } : null;
}

async function loadPortalUserDisplayName(userId, userModel) {
  if (!userId || !mongoose.isValidObjectId(userId)) return null;
  if (userModel === 'IndividualUser') {
    const u = await IndividualUser.findById(userId).select('firstName lastName').lean();
    if (!u) return null;
    return `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() || null;
  }
  if (userModel === 'BusinessUser') {
    const u = await BusinessUser.findById(userId)
      .select('firstName lastName businessName businessOwner')
      .lean();
    if (!u) return null;
    return (
      (u.businessName && String(u.businessName).trim()) ||
      (u.businessOwner && String(u.businessOwner).trim()) ||
      `${u.firstName || ''} ${u.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
      null
    );
  }
  return null;
}

async function loadPortalUserPhone(userId, userModel) {
  if (!userId || !mongoose.isValidObjectId(userId)) return null;
  if (userModel !== 'IndividualUser' && userModel !== 'BusinessUser') return null;
  const Model = userModel === 'BusinessUser' ? BusinessUser : IndividualUser;
  const u = await Model.findById(userId).select('phone').lean();
  const phone = u?.phone?.trim?.() || '';
  return phone || null;
}

module.exports = {
  VALID_KINDS,
  portalUserRef,
  isSamePortalUser,
  userParticipatesInConversation,
  userRoleInConversation,
  loadListingForConversation,
  findContactListingForPoster,
  loadPortalUserDisplayName,
  loadPortalUserPhone,
};

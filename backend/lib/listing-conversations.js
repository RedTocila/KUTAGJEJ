const { getSupabaseAdmin } = require('./supabase');
const { camelizeRow, getProfileById, modelNameFromAccount } = require('./profiles');
const { isUuid } = require('./public-listings/query-helpers');
const { getKindConfig, listingTitle } = require('./listing-moderation');

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
  return { id: user.id, model };
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

async function posterModelForId(posterId) {
  const profile = await getProfileById(posterId);
  return profile ? modelNameFromAccount(profile.accountType) : null;
}

async function loadListingForConversation(kind, listingId) {
  if (!VALID_KINDS.has(kind) || !isUuid(listingId)) return null;
  const cfg = getKindConfig(kind);
  if (!cfg) return null;

  let q = getSupabaseAdmin().from(cfg.table).select('*').eq('id', listingId).eq('status', 'approved');
  if (cfg.extraFilter) {
    for (const [col, val] of Object.entries(cfg.extraFilter)) q = q.eq(col, val);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const doc = camelizeRow(data);
  const imageUrl = Array.isArray(doc.imageUrls) && doc.imageUrls[0] ? String(doc.imageUrls[0]) : null;
  const posterModel = await posterModelForId(doc.posterId);
  return {
    id: doc.id,
    kind,
    title: listingTitle(kind, doc),
    imageUrl,
    posterId: doc.posterId,
    posterModel,
    contactPhone: doc.contactPhone?.trim?.() || doc.contactPhone || null,
  };
}

/**
 * Newest public listing for a poster — used to start a profile contact chat.
 * @returns {Promise<{ kind: string, listingId: string } | null>}
 */
async function findContactListingForPoster(posterId, posterModel) {
  if (!isUuid(posterId)) return null;
  if (posterModel !== 'IndividualUser' && posterModel !== 'BusinessUser') return null;

  const sb = getSupabaseAdmin();
  const kinds = ['real-estate', 'cars', 'jobs', 'marketplace', 'businesses', 'professionals'];
  let best = null;

  for (const kind of kinds) {
    const cfg = getKindConfig(kind);
    if (!cfg) continue;
    let q = sb.from(cfg.table).select('id, created_at').eq('poster_id', posterId).eq('status', 'approved');
    if (cfg.extraFilter) {
      for (const [col, val] of Object.entries(cfg.extraFilter)) q = q.eq(col, val);
    }
    const { data, error } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) continue;
    const createdAt = data.created_at ? new Date(data.created_at).getTime() : 0;
    if (!best || createdAt > best.createdAt) {
      best = { kind, listingId: data.id, createdAt };
    }
  }

  return best ? { kind: best.kind, listingId: best.listingId } : null;
}

async function loadPortalUserDisplayName(userId, _userModel) {
  if (!isUuid(userId)) return null;
  const profile = await getProfileById(userId);
  if (!profile) return null;
  if (profile.accountType === 'business') {
    return (
      (profile.businessName && String(profile.businessName).trim()) ||
      (profile.businessOwner && String(profile.businessOwner).trim()) ||
      `${profile.firstName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
      null
    );
  }
  return `${profile.firstName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim() || null;
}

async function loadPortalUserPhone(userId, _userModel) {
  if (!isUuid(userId)) return null;
  const profile = await getProfileById(userId);
  const phone = profile?.phone?.trim?.() || '';
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

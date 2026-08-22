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

/** Normalize API / metrics kinds (`car` → `cars`) to conversation listing kinds. */
function normalizeConversationListingKind(kind) {
  const k = String(kind || '').trim();
  if (k === 'car') return 'cars';
  if (k === 'job') return 'jobs';
  return k;
}

const LISTING_INQUIRY_MESSAGE_PREFIX = 'LISTING_INQUIRY';

function parseListingInquiryMessage(body) {
  const raw = String(body || '');
  if (!raw.trimStart().startsWith(LISTING_INQUIRY_MESSAGE_PREFIX)) return null;
  const rest = raw.trimStart().slice(LISTING_INQUIRY_MESSAGE_PREFIX.length).trimStart();
  const newline = rest.indexOf('\n');
  if (newline < 0) return null;
  try {
    const parsed = JSON.parse(rest.slice(0, newline).trim());
    if (!parsed || parsed.v !== 1 || !parsed.listingKind || !parsed.listingId || !parsed.title) {
      return null;
    }
    return {
      listingKind: String(parsed.listingKind),
      listingId: String(parsed.listingId),
      title: String(parsed.title),
      imageUrl: parsed.imageUrl ? String(parsed.imageUrl) : null,
    };
  } catch {
    return null;
  }
}

/**
 * Point an existing people-thread at the listing they are currently discussing.
 * Does not change last_message_at (inbox order stays tied to actual messages).
 */
async function applyListingContextToConversation(row, listingKind, listingId, listing) {
  if (!row?.id || !listing) return row;
  const nextImage = listing.imageUrl || '';
  const nextTitle = listing.title || '';
  if (
    String(row.listing_kind || '') === String(listingKind || '') &&
    String(row.listing_id || '') === String(listingId || '') &&
    String(row.listing_title || '') === String(nextTitle) &&
    String(row.listing_image_url || '') === String(nextImage)
  ) {
    return row;
  }
  const { data, error } = await getSupabaseAdmin()
    .from('conversations')
    .update({
      listing_kind: listingKind,
      listing_id: listingId,
      listing_title: nextTitle,
      listing_image_url: nextImage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .select('*')
    .single();
  if (error) throw error;
  return data || row;
}

/** Live listing from a LISTING_INQUIRY body, if it belongs to someone in this thread. */
async function listingContextFromInquiryBody(body, conv) {
  const parsed = parseListingInquiryMessage(body);
  if (!parsed) return null;
  const kind = normalizeConversationListingKind(parsed.listingKind);
  if (!VALID_KINDS.has(kind) || !isUuid(parsed.listingId)) return null;
  const listing = await loadListingForConversation(kind, parsed.listingId);
  if (!listing) return null;
  const posterId = String(listing.posterId);
  if (posterId !== String(conv.posterId) && posterId !== String(conv.inquirerId)) return null;
  return { kind, listingId: listing.id, listing };
}

/** Contact phone only — no poster profile fetch (thread header). */
async function loadListingContactPhone(kind, listingId) {
  if (!kind || !listingId) return null;
  if (!VALID_KINDS.has(kind) || !isUuid(listingId)) return null;
  const cfg = getKindConfig(kind);
  if (!cfg) return null;

  let q = getSupabaseAdmin()
    .from(cfg.table)
    .select('contact_phone')
    .eq('id', listingId)
    .eq('status', 'approved');
  if (cfg.extraFilter) {
    for (const [col, val] of Object.entries(cfg.extraFilter)) q = q.eq(col, val);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  const phone = data?.contact_phone != null ? String(data.contact_phone).trim() : '';
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
  normalizeConversationListingKind,
  loadPortalUserDisplayName,
  loadPortalUserPhone,
  loadListingContactPhone,
  applyListingContextToConversation,
  listingContextFromInquiryBody,
  parseListingInquiryMessage,
};

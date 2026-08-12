'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { getSupabaseAdmin } = require('../lib/supabase');
const { getProfileById, modelNameFromAccount, camelizeRow } = require('../lib/profiles');
const { isUuid } = require('../lib/public-listings/query-helpers');
const {
  VALID_KINDS,
  portalUserRef,
  isSamePortalUser,
  userParticipatesInConversation,
  userRoleInConversation,
  loadListingForConversation,
  normalizeConversationListingKind,
  loadListingContactPhone,
} = require('../lib/listing-conversations');
const { sanitizeImageUrls } = require('../lib/image-upload');
const { isOurStorageUrl } = require('../lib/storage-uploads');
const { isReservationMessageBody } = require('../lib/business-reservation-message');

const router = express.Router();

function formatMessageRow(m, senderModel, userRef) {
  return {
    id: String(m.id),
    conversationId: String(m.conversation_id),
    senderId: String(m.sender_id),
    senderModel,
    body: m.body || '',
    imageUrl: m.image_url || null,
    createdAt: m.created_at,
    isMine: isSamePortalUser({ id: m.sender_id, model: senderModel }, userRef),
  };
}

function previewMessageText(body, imageUrl) {
  const text = String(body || '').trim();
  if (text) return text;
  if (imageUrl) return '📷 Foto';
  return '';
}

function isUniqueViolation(err) {
  return err?.code === '23505' || err?.code === 23505;
}

/** Inbox list does not need full profile rows — models come from a batched account_type select. */
async function attachParticipantModels(rows) {
  const ids = new Set();
  for (const row of rows) {
    if (row.poster_id) ids.add(row.poster_id);
    if (row.inquirer_id) ids.add(row.inquirer_id);
  }
  const modelById = new Map();
  const idList = [...ids];
  if (idList.length) {
    const { data, error } = await getSupabaseAdmin()
      .from('profiles')
      .select('id, account_type')
      .in('id', idList);
    if (error) throw error;
    for (const row of data || []) {
      modelById.set(
        row.id,
        modelNameFromAccount(row.account_type) || 'IndividualUser',
      );
    }
  }
  return rows.map((row) => {
    const conv = camelizeRow(row);
    conv.id = row.id;
    conv._id = row.id;
    conv.posterUnreadCount = row.poster_unread_count ?? 0;
    conv.inquirerUnreadCount = row.inquirer_unread_count ?? 0;
    conv.posterModel = modelById.get(row.poster_id) || 'IndividualUser';
    conv.inquirerModel = modelById.get(row.inquirer_id) || 'IndividualUser';
    return conv;
  });
}

function formatConversation(conv, userRef, state = null, reservationIds = null) {
  const role = userRoleInConversation(conv, userRef);
  const unreadCount =
    role === 'poster'
      ? conv.posterUnreadCount ?? 0
      : role === 'inquirer'
        ? conv.inquirerUnreadCount ?? 0
        : 0;
  const otherId = role === 'poster' ? conv.inquirerId : conv.posterId;
  const otherModel = role === 'poster' ? conv.inquirerModel : conv.posterModel;
  const lastSenderId = conv.lastMessageSenderId ? String(conv.lastMessageSenderId) : '';
  return {
    id: String(conv.id || conv._id),
    listingKind: conv.listingKind || null,
    listingId: conv.listingId ? String(conv.listingId) : null,
    listingTitle: conv.listingTitle || '',
    listingImageUrl: conv.listingImageUrl || null,
    /** `poster` = owner opened chat (saver outreach / direct); `inquirer` = contacted from a listing. */
    startedBy: conv.startedBy === 'poster' ? 'poster' : 'inquirer',
    role,
    unreadCount,
    otherUnreadCount:
      role === 'poster'
        ? conv.inquirerUnreadCount ?? 0
        : role === 'inquirer'
          ? conv.posterUnreadCount ?? 0
          : 0,
    lastMessageText: conv.lastMessageText || '',
    lastMessageAt: conv.lastMessageAt,
    lastMessageIsMine: Boolean(lastSenderId && lastSenderId === String(userRef.id)),
    otherParticipantId: String(otherId),
    otherParticipantModel: otherModel,
    otherParticipantName: null,
    otherParticipantPhone: null,
    otherParticipantAvatarUrl: null,
    listingContactPhone: null,
    pinned: Boolean(state?.pinned),
    hasReservationMessage: reservationIds
      ? reservationIds.has(String(conv.id || conv._id))
      : isReservationMessageBody(conv.lastMessageText),
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
}

/** Latest message sender per conversation (fallback when last_message_sender_id is unset). */
async function loadLastMessageSenderIds(conversationIds) {
  const map = new Map();
  const ids = [...new Set((conversationIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return map;
  const { data, error } = await getSupabaseAdmin()
    .from('messages')
    .select('conversation_id, sender_id, created_at')
    .in('conversation_id', ids)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(ids.length * 4, 40), 400));
  if (error) throw error;
  for (const row of data || []) {
    const cid = String(row.conversation_id);
    if (map.has(cid)) continue;
    if (row.sender_id) map.set(cid, String(row.sender_id));
  }
  return map;
}

async function loadReservationConversationIds(conversationIds) {
  const set = new Set();
  const ids = [...new Set((conversationIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return set;
  const { data, error } = await getSupabaseAdmin()
    .from('messages')
    .select('conversation_id, body')
    .in('conversation_id', ids)
    .limit(Math.min(Math.max(ids.length * 8, 40), 800));
  if (error) throw error;
  for (const row of data || []) {
    if (isReservationMessageBody(row.body)) {
      set.add(String(row.conversation_id));
    }
  }
  return set;
}

async function formatConversationsForUser(convs, userRef, stateMap = new Map()) {
  const missingSenderIds = convs
    .filter((c) => !c.lastMessageSenderId && (c.lastMessageAt || c.lastMessageText))
    .map((c) => String(c.id));
  const conversationIds = convs.map((c) => String(c.id));
  const [senderMap, reservationIds] = await Promise.all([
    loadLastMessageSenderIds(missingSenderIds),
    loadReservationConversationIds(conversationIds),
  ]);
  return convs.map((c) => {
    const id = String(c.id);
    const enriched =
      !c.lastMessageSenderId && senderMap.has(id)
        ? { ...c, lastMessageSenderId: senderMap.get(id) }
        : c;
    return formatConversation(enriched, userRef, stateMap.get(id), reservationIds);
  });
}

async function formatConversationForUser(conv, userRef, state = null) {
  const [formatted] = await formatConversationsForUser(
    [conv],
    userRef,
    new Map([[String(conv.id), state]]),
  );
  return formatted;
}

async function loadUserStatesByConversationIds(userId, conversationIds) {
  const map = new Map();
  if (!conversationIds.length) return map;
  const { data, error } = await getSupabaseAdmin()
    .from('conversation_user_state')
    .select('conversation_id, pinned, pinned_at, hidden_at')
    .eq('user_id', userId)
    .in('conversation_id', conversationIds);
  if (error) throw error;
  for (const row of data || []) {
    map.set(String(row.conversation_id), row);
  }
  return map;
}

async function loadHiddenConversationIds(userId) {
  const { data, error } = await getSupabaseAdmin()
    .from('conversation_user_state')
    .select('conversation_id')
    .eq('user_id', userId)
    .not('hidden_at', 'is', null);
  if (error) throw error;
  return (data || []).map((row) => String(row.conversation_id));
}

async function upsertConversationUserState(conversationId, userId, patch) {
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: existing, error: findErr } = await sb
    .from('conversation_user_state')
    .select('conversation_id, pinned, pinned_at, hidden_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (findErr) throw findErr;

  const next = {
    conversation_id: conversationId,
    user_id: userId,
    pinned: existing?.pinned ?? false,
    pinned_at: existing?.pinned_at ?? null,
    hidden_at: existing?.hidden_at ?? null,
    updated_at: now,
    ...patch,
  };
  if (Object.prototype.hasOwnProperty.call(patch, 'pinned')) {
    next.pinned = Boolean(patch.pinned);
    next.pinned_at = next.pinned ? (existing?.pinned && existing?.pinned_at) || now : null;
  }

  if (existing) {
    const { data, error } = await sb
      .from('conversation_user_state')
      .update({
        pinned: next.pinned,
        pinned_at: next.pinned_at,
        hidden_at: next.hidden_at,
        updated_at: now,
      })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .select('conversation_id, pinned, pinned_at, hidden_at')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await sb
    .from('conversation_user_state')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      pinned: next.pinned,
      pinned_at: next.pinned_at,
      hidden_at: next.hidden_at,
      created_at: now,
      updated_at: now,
    })
    .select('conversation_id, pinned, pinned_at, hidden_at')
    .single();
  if (error) throw error;
  return data;
}

async function clearHiddenForConversation(conversationId) {
  const { error } = await getSupabaseAdmin()
    .from('conversation_user_state')
    .update({ hidden_at: null, updated_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .not('hidden_at', 'is', null);
  if (error) throw error;
}

function sortInboxItems(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    const at = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
    const bt = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
    return (Number.isNaN(bt) ? 0 : bt) - (Number.isNaN(at) ? 0 : at);
  });
}

async function attachOtherParticipantDetails(items, { includeListingPhones = true } = {}) {
  if (!items.length) return items;

  const profileIds = [
    ...new Set(
      items
        .map((item) => String(item.otherParticipantId || '').trim())
        .filter((id) => isUuid(id)),
    ),
  ];
  const profileById = new Map();
  if (profileIds.length) {
    const { data, error } = await getSupabaseAdmin()
      .from('profiles')
      .select('id, account_type, first_name, last_name, business_name, business_owner, phone, avatar_url')
      .in('id', profileIds);
    if (error) throw error;
    for (const row of data || []) {
      profileById.set(String(row.id), row);
    }
  }

  const displayNameFromProfile = (row) => {
    if (!row) return null;
    if (row.account_type === 'business') {
      return (
        (row.business_name && String(row.business_name).trim()) ||
        (row.business_owner && String(row.business_owner).trim()) ||
        `${row.first_name || ''} ${row.last_name || ''}`.replace(/\s+/g, ' ').trim() ||
        null
      );
    }
    return `${row.first_name || ''} ${row.last_name || ''}`.replace(/\s+/g, ' ').trim() || null;
  };

  const listingPhones = includeListingPhones
    ? await Promise.all(
        items.map((item) => loadListingContactPhone(item.listingKind, item.listingId)),
      )
    : items.map(() => null);

  return items.map((item, index) => {
    const profile = profileById.get(String(item.otherParticipantId));
    return {
      ...item,
      otherParticipantName: displayNameFromProfile(profile),
      otherParticipantPhone: (profile?.phone && String(profile.phone).trim()) || null,
      otherParticipantAvatarUrl: (profile?.avatar_url && String(profile.avatar_url).trim()) || null,
      listingContactPhone: listingPhones[index] || null,
    };
  });
}

async function findConversationForUser(id, userRef) {
  if (!isUuid(id)) return null;
  const { data, error } = await getSupabaseAdmin()
    .from('conversations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [conv] = await attachParticipantModels([data]);
  if (!userParticipatesInConversation(conv, userRef)) return null;
  return conv;
}

async function findExistingInquirerThread(listingKind, listingId, inquirerId) {
  const { data, error } = await getSupabaseAdmin()
    .from('conversations')
    .select('*')
    .eq('listing_kind', listingKind)
    .eq('listing_id', listingId)
    .eq('inquirer_id', inquirerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Any thread between two people — prefer the one that already has messages. */
async function findExistingConversationBetween(userIdA, userIdB) {
  if (!isUuid(userIdA) || !isUuid(userIdB)) return null;
  const { data, error } = await getSupabaseAdmin()
    .from('conversations')
    .select('*')
    .or(
      `and(poster_id.eq.${userIdA},inquirer_id.eq.${userIdB}),and(poster_id.eq.${userIdB},inquirer_id.eq.${userIdA})`,
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

function isSameListingThread(row, listingKind, listingId) {
  return (
    String(row?.listing_kind || '') === String(listingKind || '') &&
    String(row?.listing_id || '') === String(listingId || '')
  );
}

/** POST /api/conversations — start or return existing thread for a listing */
router.post('/', auth, requirePortalUser, async (req, res) => {
  try {
    const listingKind = String(req.body?.listingKind ?? '').trim();
    const listingId = String(req.body?.listingId ?? '').trim();
    if (!VALID_KINDS.has(listingKind)) {
      return res.status(400).json({ message: 'Lloji i njoftimit nuk është i vlefshëm.' });
    }
    if (!isUuid(listingId)) {
      return res.status(400).json({ message: 'Njoftimi nuk është i vlefshëm.' });
    }

    const userRef = portalUserRef(req.user);
    const listing = await loadListingForConversation(listingKind, listingId);
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    if (isSamePortalUser({ id: listing.posterId, model: listing.posterModel }, userRef)) {
      return res.status(400).json({ message: 'Nuk mund të dërgoni mesazh te njoftimi juaj.' });
    }

    const sb = getSupabaseAdmin();
    let row = await findExistingConversationBetween(userRef.id, listing.posterId);
    let created = false;

    if (!row) {
      const { data, error } = await sb
        .from('conversations')
        .insert({
          listing_kind: listingKind,
          listing_id: listingId,
          listing_title: listing.title,
          listing_image_url: listing.imageUrl || '',
          poster_id: listing.posterId,
          inquirer_id: userRef.id,
          started_by: 'inquirer',
        })
        .select('*')
        .single();
      if (error) {
        if (isUniqueViolation(error)) {
          row =
            (await findExistingInquirerThread(listingKind, listingId, userRef.id)) ||
            (await findExistingConversationBetween(userRef.id, listing.posterId));
        } else {
          throw error;
        }
      } else {
        row = data;
        created = true;
      }
    } else if (
      isSameListingThread(row, listingKind, listingId) &&
      (row.listing_title !== listing.title || row.listing_image_url !== (listing.imageUrl || ''))
    ) {
      const { data, error } = await sb
        .from('conversations')
        .update({
          listing_title: listing.title,
          listing_image_url: listing.imageUrl || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .select('*')
        .single();
      if (error) throw error;
      row = data;
    }

    if (!row) {
      return res.status(500).json({ message: 'Server error' });
    }

    const [conv] = await attachParticipantModels([row]);
    await upsertConversationUserState(conv.id, userRef.id, { hidden_at: null });
    const stateMap = await loadUserStatesByConversationIds(userRef.id, [conv.id]);
    const formatted = await formatConversationForUser(conv, userRef, stateMap.get(String(conv.id)));
    const [withName] = await attachOtherParticipantDetails([formatted]);
    res.status(created ? 201 : 200).json({ conversation: withName });
  } catch (err) {
    console.error('POST /conversations:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

async function resolveMemberPosterModel(memberId) {
  const profile = await getProfileById(memberId);
  if (!profile) return null;
  if (profile.accountType !== 'individual' && profile.accountType !== 'business') return null;
  return modelNameFromAccount(profile.accountType);
}

async function respondWithConversation(res, row, userRef, statusCode) {
  const [conv] = await attachParticipantModels([row]);
  await upsertConversationUserState(conv.id, userRef.id, { hidden_at: null });
  const stateMap = await loadUserStatesByConversationIds(userRef.id, [conv.id]);
  const formatted = await formatConversationForUser(conv, userRef, stateMap.get(String(conv.id)));
  const [withName] = await attachOtherParticipantDetails([formatted]);
  return res.status(statusCode).json({ conversation: withName });
}

async function findDirectConversationBetween(userIdA, userIdB) {
  const { data, error } = await getSupabaseAdmin()
    .from('conversations')
    .select('*')
    .is('listing_id', null)
    .or(
      `and(poster_id.eq.${userIdA},inquirer_id.eq.${userIdB}),and(poster_id.eq.${userIdB},inquirer_id.eq.${userIdA})`,
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function markConversationStartedByPoster(row) {
  if (!row?.id) return row;
  if (String(row.started_by || '') === 'poster') return row;
  const { data, error } = await getSupabaseAdmin()
    .from('conversations')
    .update({ started_by: 'poster', updated_at: new Date().toISOString() })
    .eq('id', row.id)
    .select('*')
    .single();
  if (error) throw error;
  return data || row;
}

/** POST /api/conversations/with-member/:memberId — open chat with a public profile member. */
router.post('/with-member/:memberId', auth, requirePortalUser, async (req, res) => {
  try {
    const memberId = String(req.params.memberId || '').trim();
    if (!isUuid(memberId)) {
      return res.status(404).json({ message: 'Profili nuk u gjet.' });
    }

    const userRef = portalUserRef(req.user);
    const posterModel = await resolveMemberPosterModel(memberId);
    if (!posterModel) return res.status(404).json({ message: 'Profili nuk u gjet.' });

    if (isSamePortalUser({ id: memberId, model: posterModel }, userRef)) {
      return res.status(400).json({ message: 'Nuk mund të dërgoni mesazh te profili juaj.' });
    }

    const listingKind = normalizeConversationListingKind(req.body?.listingKind ?? req.body?.listing_kind);
    const listingId = String(req.body?.listingId ?? req.body?.listing_id ?? '').trim();
    const hasListingContext = Boolean(listingKind && listingId);

    // Outreach about the caller's own listing (e.g. contact someone who saved it).
    if (hasListingContext) {
      if (!VALID_KINDS.has(listingKind) || !isUuid(listingId)) {
        return res.status(400).json({ message: 'Njoftimi nuk është i vlefshëm.' });
      }
      const listing = await loadListingForConversation(listingKind, listingId);
      if (!listing) {
        return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
      }
      if (!isSamePortalUser({ id: listing.posterId, model: listing.posterModel }, userRef)) {
        return res.status(403).json({ message: 'Nuk mund të nisni bisedën për këtë njoftim.' });
      }

      let row = await findExistingConversationBetween(userRef.id, memberId);
      let created = false;
      if (!row) {
        const { data, error } = await getSupabaseAdmin()
          .from('conversations')
          .insert({
            listing_kind: listingKind,
            listing_id: listingId,
            listing_title: listing.title,
            listing_image_url: listing.imageUrl || '',
            poster_id: listing.posterId,
            inquirer_id: memberId,
            started_by: 'poster',
          })
          .select('*')
          .single();
        if (error) {
          if (isUniqueViolation(error)) {
            row =
              (await findExistingInquirerThread(listingKind, listingId, memberId)) ||
              (await findExistingConversationBetween(userRef.id, memberId));
            if (row && isSameListingThread(row, listingKind, listingId)) {
              row = await markConversationStartedByPoster(row);
            }
          } else {
            throw error;
          }
        } else {
          row = data;
          created = true;
        }
      } else if (isSameListingThread(row, listingKind, listingId)) {
        row = await markConversationStartedByPoster(row);
      }
      if (!row) return res.status(500).json({ message: 'Server error' });
      return respondWithConversation(res, row, userRef, created ? 201 : 200);
    }

    const existingPair = await findExistingConversationBetween(userRef.id, memberId);
    if (existingPair) {
      return respondWithConversation(res, existingPair, userRef, 200);
    }

    // Profile / member contact — always a person thread (not tied to their listing).
    let row = await findDirectConversationBetween(userRef.id, memberId);
    let created = false;
    if (!row) {
      const { data, error } = await getSupabaseAdmin()
        .from('conversations')
        .insert({
          listing_kind: null,
          listing_id: null,
          listing_title: '',
          listing_image_url: '',
          poster_id: userRef.id,
          inquirer_id: memberId,
          started_by: 'poster',
        })
        .select('*')
        .single();
      if (error) {
        if (isUniqueViolation(error)) {
          row = await findDirectConversationBetween(userRef.id, memberId);
          if (row) row = await markConversationStartedByPoster(row);
        } else {
          throw error;
        }
      } else {
        row = data;
        created = true;
      }
    } else {
      row = await markConversationStartedByPoster(row);
    }
    if (!row) return res.status(500).json({ message: 'Server error' });
    return respondWithConversation(res, row, userRef, created ? 201 : 200);
  } catch (err) {
    console.error('POST /conversations/with-member/:memberId', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/conversations/unread-count — lightweight badge total */
router.get('/unread-count', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const hiddenIds = await loadHiddenConversationIds(userRef.id);
    let q = getSupabaseAdmin()
      .from('conversations')
      .select('id, poster_id, inquirer_id, poster_unread_count, inquirer_unread_count')
      .or(`poster_id.eq.${userRef.id},inquirer_id.eq.${userRef.id}`);
    if (hiddenIds.length) {
      q = q.not('id', 'in', `(${hiddenIds.join(',')})`);
    }
    const { data, error } = await q;
    if (error) throw error;

    let unreadCount = 0;
    for (const row of data || []) {
      if (String(row.poster_id) === String(userRef.id)) {
        unreadCount += Math.max(0, row.poster_unread_count || 0);
      } else if (String(row.inquirer_id) === String(userRef.id)) {
        unreadCount += Math.max(0, row.inquirer_unread_count || 0);
      }
    }
    res.json({ unreadCount });
  } catch (err) {
    console.error('GET /conversations/unread-count:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/conversations — inbox */
router.get('/', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10) || 30));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const hiddenIds = await loadHiddenConversationIds(userRef.id);
    // Empty contact shells (no messages yet) stay out of the inbox until someone sends.
    let q = getSupabaseAdmin()
      .from('conversations')
      .select('*')
      .or(`poster_id.eq.${userRef.id},inquirer_id.eq.${userRef.id}`)
      .not('last_message_at', 'is', null)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (hiddenIds.length) {
      q = q.not('id', 'in', `(${hiddenIds.join(',')})`);
    }
    const { data, error } = await q.range(from, to);
    if (error) throw error;

    const rows = data || [];
    const conversationIds = rows.map((row) => String(row.id));
    const [mapped, stateMap] = await Promise.all([
      attachParticipantModels(rows),
      loadUserStatesByConversationIds(userRef.id, conversationIds),
    ]);
    const formatted = await formatConversationsForUser(mapped, userRef, stateMap);
    const withNames = await attachOtherParticipantDetails(formatted, {
      includeListingPhones: false,
    });
    const total = withNames.length < limit && page === 1 ? withNames.length : from + withNames.length;
    res.json({
      conversations: sortInboxItems(withNames),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(Math.max(total, 1) / limit)),
    });
  } catch (err) {
    console.error('GET /conversations:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/conversations/hide — hide one or more chats for the current user */
router.post('/hide', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = [...new Set(rawIds.map((id) => String(id || '').trim()).filter((id) => isUuid(id)))];
    if (!ids.length) {
      return res.status(400).json({ message: 'Nuk u zgjodh asnjë bisedë.' });
    }
    if (ids.length > 50) {
      return res.status(400).json({ message: 'Shumë biseda të zgjedhura.' });
    }

    const hiddenAt = new Date().toISOString();
    const hidden = [];
    for (const id of ids) {
      const conv = await findConversationForUser(id, userRef);
      if (!conv) continue;
      if (!conv.lastMessageAt) {
        const { error: delErr } = await getSupabaseAdmin()
          .from('conversations')
          .delete()
          .eq('id', conv.id)
          .is('last_message_at', null);
        if (delErr) throw delErr;
        hidden.push(String(conv.id));
        continue;
      }
      await upsertConversationUserState(conv.id, userRef.id, { hidden_at: hiddenAt });
      hidden.push(String(conv.id));
    }

    res.json({ ok: true, ids: hidden });
  } catch (err) {
    console.error('POST /conversations/hide:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/conversations/:id/messages */
router.get('/:id/messages', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const conv = await findConversationForUser(req.params.id, userRef);
    if (!conv) return res.status(404).json({ message: 'Biseda nuk u gjet.' });

    const before = req.query.before ? new Date(String(req.query.before)) : null;
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));

    let q = getSupabaseAdmin()
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (before && !Number.isNaN(before.getTime())) {
      q = q.lt('created_at', before.toISOString());
    }
    const { data: rows, error } = await q;
    if (error) throw error;

    const messages = (rows || []).slice().reverse();
    const senderIds = [...new Set(messages.map((m) => m.sender_id).filter(Boolean))];
    const modelById = new Map();
    if (senderIds.length) {
      const { data: profiles, error: profileErr } = await getSupabaseAdmin()
        .from('profiles')
        .select('id, account_type')
        .in('id', senderIds);
      if (profileErr) throw profileErr;
      for (const row of profiles || []) {
        modelById.set(
          row.id,
          modelNameFromAccount(row.account_type) || 'IndividualUser',
        );
      }
    }

    const stateMap = await loadUserStatesByConversationIds(userRef.id, [conv.id]);
    const formatted = await formatConversationForUser(conv, userRef, stateMap.get(String(conv.id)));
    const [withName] = await attachOtherParticipantDetails([formatted]);

    res.json({
      messages: messages.map((m) => {
        const senderModel = modelById.get(m.sender_id) || 'IndividualUser';
        return formatMessageRow(m, senderModel, userRef);
      }),
      conversation: withName,
    });
  } catch (err) {
    console.error('GET /conversations/:id/messages:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/conversations/:id/pin — pin or unpin for current user */
router.patch('/:id/pin', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const conv = await findConversationForUser(req.params.id, userRef);
    if (!conv) return res.status(404).json({ message: 'Biseda nuk u gjet.' });

    const pinned =
      typeof req.body?.pinned === 'boolean'
        ? req.body.pinned
        : !(await loadUserStatesByConversationIds(userRef.id, [conv.id])).get(String(conv.id))?.pinned;

    const state = await upsertConversationUserState(conv.id, userRef.id, { pinned });
    const formatted = await formatConversationForUser(conv, userRef, state);
    const [withName] = await attachOtherParticipantDetails([formatted]);
    res.json({ conversation: withName });
  } catch (err) {
    console.error('PATCH /conversations/:id/pin:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** DELETE /api/conversations/:id — hide chat for current user (hard-delete if never messaged) */
router.delete('/:id', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const conv = await findConversationForUser(req.params.id, userRef);
    if (!conv) return res.status(404).json({ message: 'Biseda nuk u gjet.' });

    // Contact opened the composer but nobody sent — remove the empty shell entirely.
    if (!conv.lastMessageAt) {
      const { error: delErr } = await getSupabaseAdmin()
        .from('conversations')
        .delete()
        .eq('id', conv.id)
        .is('last_message_at', null);
      if (delErr) throw delErr;
      return res.json({ ok: true, id: String(conv.id), discarded: true });
    }

    await upsertConversationUserState(conv.id, userRef.id, {
      hidden_at: new Date().toISOString(),
    });
    res.json({ ok: true, id: String(conv.id) });
  } catch (err) {
    console.error('DELETE /conversations/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/conversations/:id/messages */
router.post('/:id/messages', auth, requirePortalUser, async (req, res) => {
  try {
    const body = String(req.body?.body ?? '').trim();
    const imageUrls = sanitizeImageUrls(
      req.body?.imageUrl != null ? [req.body.imageUrl] : req.body?.imageUrls,
      1,
    );
    const imageUrl = imageUrls[0] || '';
    if (imageUrl && !isOurStorageUrl(imageUrl)) {
      return res.status(400).json({ message: 'URL e fotos nuk është e vlefshme.' });
    }
    if (!body && !imageUrl) {
      return res.status(400).json({ message: 'Mesazhi nuk mund të jetë bosh.' });
    }
    if (body.length > 2000) return res.status(400).json({ message: 'Mesazhi është shumë i gjatë.' });

    const userRef = portalUserRef(req.user);
    const convId = String(req.params.id || '').trim();
    if (!isUuid(convId)) return res.status(404).json({ message: 'Biseda nuk u gjet.' });

    const sb = getSupabaseAdmin();
    const { data: raw, error: findErr } = await sb
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!raw) return res.status(404).json({ message: 'Biseda nuk u gjet.' });

    const [conv] = await attachParticipantModels([raw]);
    if (!userParticipatesInConversation(conv, userRef)) {
      return res.status(404).json({ message: 'Biseda nuk u gjet.' });
    }

    const { data: msg, error: msgErr } = await sb
      .from('messages')
      .insert({
        conversation_id: conv.id,
        sender_id: userRef.id,
        body,
        image_url: imageUrl,
      })
      .select('*')
      .single();
    if (msgErr) throw msgErr;

    const role = userRoleInConversation(conv, userRef);
    const patch = {
      last_message_text: previewMessageText(body, imageUrl),
      last_message_at: msg.created_at,
      last_message_sender_id: userRef.id,
      updated_at: new Date().toISOString(),
    };
    if (role === 'poster') {
      patch.inquirer_unread_count = (raw.inquirer_unread_count ?? 0) + 1;
    } else if (role === 'inquirer') {
      patch.poster_unread_count = (raw.poster_unread_count ?? 0) + 1;
    }
    let { error: updErr } = await sb.from('conversations').update(patch).eq('id', conv.id);
    // Column may be missing until migration/repair is applied.
    if (updErr && /last_message_sender_id/i.test(String(updErr.message || updErr))) {
      delete patch.last_message_sender_id;
      ({ error: updErr } = await sb.from('conversations').update(patch).eq('id', conv.id));
    }
    if (updErr) throw updErr;

    await clearHiddenForConversation(conv.id);

    try {
      const { notifyNewMessage, displayNameForUserId } = require('../lib/user-notifications');
      const recipientId = role === 'poster' ? conv.inquirerId : conv.posterId;
      if (recipientId) {
        const senderName = await displayNameForUserId(userRef.id);
        await notifyNewMessage({
          recipientId,
          conversationId: conv.id,
          senderId: userRef.id,
          senderName,
          listingTitle: conv.listingTitle || '',
          preview: previewMessageText(body, imageUrl),
        });
      }
    } catch (notifyErr) {
      console.warn('notifyNewMessage:', notifyErr?.message || notifyErr);
    }

    res.status(201).json({
      message: formatMessageRow(msg, userRef.model, userRef),
    });
  } catch (err) {
    console.error('POST /conversations/:id/messages:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/conversations/:id/read — mark messages as read for current user */
router.patch('/:id/read', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const convId = String(req.params.id || '').trim();
    if (!isUuid(convId)) return res.status(404).json({ message: 'Biseda nuk u gjet.' });

    const sb = getSupabaseAdmin();
    const { data: raw, error: findErr } = await sb
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!raw) return res.status(404).json({ message: 'Biseda nuk u gjet.' });

    const [conv] = await attachParticipantModels([raw]);
    if (!userParticipatesInConversation(conv, userRef)) {
      return res.status(404).json({ message: 'Biseda nuk u gjet.' });
    }

    const role = userRoleInConversation(conv, userRef);
    const patch = { updated_at: new Date().toISOString() };
    if (role === 'poster') patch.poster_unread_count = 0;
    else if (role === 'inquirer') patch.inquirer_unread_count = 0;

    const { error: updErr } = await sb.from('conversations').update(patch).eq('id', conv.id);
    if (updErr) throw updErr;

    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /conversations/:id/read:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

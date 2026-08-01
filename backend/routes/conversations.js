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
  findContactListingForPoster,
  loadPortalUserDisplayName,
  loadPortalUserPhone,
} = require('../lib/listing-conversations');

const router = express.Router();

function isUniqueViolation(err) {
  return err?.code === '23505' || err?.code === 23505;
}

async function attachParticipantModels(rows) {
  const ids = new Set();
  for (const row of rows) {
    if (row.poster_id) ids.add(row.poster_id);
    if (row.inquirer_id) ids.add(row.inquirer_id);
  }
  const modelById = new Map();
  await Promise.all(
    [...ids].map(async (id) => {
      const profile = await getProfileById(id);
      modelById.set(
        id,
        (profile && modelNameFromAccount(profile.accountType)) || 'IndividualUser',
      );
    }),
  );
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

function formatConversation(conv, userRef) {
  const role = userRoleInConversation(conv, userRef);
  const unreadCount =
    role === 'poster'
      ? conv.posterUnreadCount ?? 0
      : role === 'inquirer'
        ? conv.inquirerUnreadCount ?? 0
        : 0;
  const otherId = role === 'poster' ? conv.inquirerId : conv.posterId;
  const otherModel = role === 'poster' ? conv.inquirerModel : conv.posterModel;
  return {
    id: String(conv.id || conv._id),
    listingKind: conv.listingKind,
    listingId: String(conv.listingId),
    listingTitle: conv.listingTitle,
    listingImageUrl: conv.listingImageUrl || null,
    role,
    unreadCount,
    lastMessageText: conv.lastMessageText || '',
    lastMessageAt: conv.lastMessageAt,
    otherParticipantId: String(otherId),
    otherParticipantModel: otherModel,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
  };
}

async function attachOtherParticipantDetails(items) {
  return Promise.all(
    items.map(async (item) => {
      const [otherParticipantName, otherParticipantPhone, listing] = await Promise.all([
        loadPortalUserDisplayName(item.otherParticipantId, item.otherParticipantModel),
        loadPortalUserPhone(item.otherParticipantId, item.otherParticipantModel),
        loadListingForConversation(item.listingKind, item.listingId),
      ]);
      const listingContactPhone = listing?.contactPhone ? String(listing.contactPhone).trim() : null;
      return {
        ...item,
        otherParticipantName,
        otherParticipantPhone: otherParticipantPhone || null,
        listingContactPhone: listingContactPhone || null,
      };
    }),
  );
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
    let row = await findExistingInquirerThread(listingKind, listingId, userRef.id);
    let raceHit = false;

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
        })
        .select('*')
        .single();
      if (error) {
        if (isUniqueViolation(error)) {
          row = await findExistingInquirerThread(listingKind, listingId, userRef.id);
          raceHit = true;
        } else {
          throw error;
        }
      } else {
        row = data;
      }
    } else if (row.listing_title !== listing.title || row.listing_image_url !== (listing.imageUrl || '')) {
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
    const formatted = formatConversation(conv, userRef);
    const [withName] = await attachOtherParticipantDetails([formatted]);
    res.status(raceHit ? 200 : 201).json({ conversation: withName });
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

    const { data: existingRows, error: existingErr } = await getSupabaseAdmin()
      .from('conversations')
      .select('*')
      .or(
        `and(poster_id.eq.${memberId},inquirer_id.eq.${userRef.id}),and(poster_id.eq.${userRef.id},inquirer_id.eq.${memberId})`,
      )
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(1);
    if (existingErr) throw existingErr;

    if (existingRows?.length) {
      const [existing] = await attachParticipantModels(existingRows);
      const formatted = formatConversation(existing, userRef);
      const [withName] = await attachOtherParticipantDetails([formatted]);
      return res.status(200).json({ conversation: withName });
    }

    const contact = await findContactListingForPoster(memberId, posterModel);
    if (!contact) {
      return res.status(400).json({
        message: 'Ky anëtar nuk ka njoftime aktive për të nisur bisedën.',
      });
    }

    const listing = await loadListingForConversation(contact.kind, contact.listingId);
    if (!listing) {
      return res.status(400).json({
        message: 'Ky anëtar nuk ka njoftime aktive për të nisur bisedën.',
      });
    }

    let row = await findExistingInquirerThread(contact.kind, contact.listingId, userRef.id);
    if (!row) {
      const { data, error } = await getSupabaseAdmin()
        .from('conversations')
        .insert({
          listing_kind: contact.kind,
          listing_id: contact.listingId,
          listing_title: listing.title,
          listing_image_url: listing.imageUrl || '',
          poster_id: listing.posterId,
          inquirer_id: userRef.id,
        })
        .select('*')
        .single();
      if (error) {
        if (isUniqueViolation(error)) {
          row = await findExistingInquirerThread(contact.kind, contact.listingId, userRef.id);
        } else {
          throw error;
        }
      } else {
        row = data;
      }
    }

    if (!row) {
      return res.status(500).json({ message: 'Server error' });
    }

    const [conv] = await attachParticipantModels([row]);
    const formatted = formatConversation(conv, userRef);
    const [withName] = await attachOtherParticipantDetails([formatted]);
    return res.status(201).json({ conversation: withName });
  } catch (err) {
    console.error('POST /conversations/with-member/:memberId', err?.message || err);
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

    const { data, error, count } = await getSupabaseAdmin()
      .from('conversations')
      .select('*', { count: 'exact' })
      .or(`poster_id.eq.${userRef.id},inquirer_id.eq.${userRef.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(from, to);
    if (error) throw error;

    const total = count ?? 0;
    const mapped = await attachParticipantModels(data || []);
    const formatted = await attachOtherParticipantDetails(
      mapped.map((c) => formatConversation(c, userRef)),
    );
    res.json({
      conversations: formatted,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error('GET /conversations:', err?.message || err);
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
    await Promise.all(
      senderIds.map(async (id) => {
        const profile = await getProfileById(id);
        modelById.set(
          id,
          (profile && modelNameFromAccount(profile.accountType)) || 'IndividualUser',
        );
      }),
    );

    const formatted = formatConversation(conv, userRef);
    const [withName] = await attachOtherParticipantDetails([formatted]);

    res.json({
      messages: messages.map((m) => {
        const senderModel = modelById.get(m.sender_id) || 'IndividualUser';
        return {
          id: String(m.id),
          conversationId: String(m.conversation_id),
          senderId: String(m.sender_id),
          senderModel,
          body: m.body,
          createdAt: m.created_at,
          isMine: isSamePortalUser({ id: m.sender_id, model: senderModel }, userRef),
        };
      }),
      conversation: withName,
    });
  } catch (err) {
    console.error('GET /conversations/:id/messages:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/conversations/:id/messages */
router.post('/:id/messages', auth, requirePortalUser, async (req, res) => {
  try {
    const body = String(req.body?.body ?? '').trim();
    if (!body) return res.status(400).json({ message: 'Mesazhi nuk mund të jetë bosh.' });
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
      })
      .select('*')
      .single();
    if (msgErr) throw msgErr;

    const role = userRoleInConversation(conv, userRef);
    const patch = {
      last_message_text: body,
      last_message_at: msg.created_at,
      updated_at: new Date().toISOString(),
    };
    if (role === 'poster') {
      patch.inquirer_unread_count = (raw.inquirer_unread_count ?? 0) + 1;
    } else if (role === 'inquirer') {
      patch.poster_unread_count = (raw.poster_unread_count ?? 0) + 1;
    }
    const { error: updErr } = await sb.from('conversations').update(patch).eq('id', conv.id);
    if (updErr) throw updErr;

    res.status(201).json({
      message: {
        id: String(msg.id),
        conversationId: String(msg.conversation_id),
        senderId: String(msg.sender_id),
        senderModel: userRef.model,
        body: msg.body,
        createdAt: msg.created_at,
        isMine: true,
      },
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

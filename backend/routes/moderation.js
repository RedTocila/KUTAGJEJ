'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const rateLimit = require('../middleware/rate-limit');
const { getSupabaseAdmin } = require('../lib/supabase');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { VALID_KINDS, portalUserRef, loadListingForConversation } = require('../lib/listing-conversations');
const {
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  formatReport,
  loadProfilesById,
  notifyModeratorsOfReport,
} = require('../lib/content-reports');
const { isMissingTableError, loadBlockedUserIds, blockUser, unblockUser } = require('../lib/user-blocks');

const router = express.Router();

const reportLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });

const SETUP_PENDING_MESSAGE = 'Shërbimi i raportimit po konfigurohet. Provoni përsëri pas pak.';

async function loadConversationForParticipant(conversationId, userId) {
  if (!isUuid(conversationId)) return null;
  const { data, error } = await getSupabaseAdmin()
    .from('conversations')
    .select('id, poster_id, inquirer_id, listing_kind, listing_id, listing_title')
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const uid = String(userId);
  if (String(data.poster_id) !== uid && String(data.inquirer_id) !== uid) return null;
  return data;
}

function otherParticipantId(conv, userId) {
  return String(conv.poster_id) === String(userId) ? String(conv.inquirer_id) : String(conv.poster_id);
}

/** POST /api/moderation/reports — report a listing, a user, or a chat message. */
router.post('/reports', reportLimiter, auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const targetType = String(req.body?.targetType ?? '').trim();
    const reason = String(req.body?.reason ?? '').trim();
    const details = String(req.body?.details ?? '').trim().slice(0, 1000);

    if (!REPORT_TARGET_TYPES.has(targetType)) {
      return res.status(400).json({ message: 'Lloji i raportimit nuk është i vlefshëm.' });
    }
    if (!REPORT_REASONS.has(reason)) {
      return res.status(400).json({ message: 'Zgjidhni një arsye.' });
    }

    const row = {
      reporter_id: userRef.id,
      target_type: targetType,
      reason,
      details,
    };

    if (targetType === 'listing') {
      const listingKind = String(req.body?.listingKind ?? '').trim();
      const listingId = String(req.body?.listingId ?? '').trim();
      if (!VALID_KINDS.has(listingKind) || !isUuid(listingId)) {
        return res.status(400).json({ message: 'Njoftimi nuk është i vlefshëm.' });
      }
      const listing = await loadListingForConversation(listingKind, listingId);
      if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
      row.listing_kind = listingKind;
      row.listing_id = listingId;
      row.listing_title = String(listing.title || '').slice(0, 300);
      if (isUuid(listing.posterId)) row.reported_user_id = listing.posterId;
    } else if (targetType === 'user') {
      const conversationId = String(req.body?.conversationId ?? '').trim();
      let reportedUserId = String(req.body?.reportedUserId ?? '').trim();
      if (conversationId) {
        const conv = await loadConversationForParticipant(conversationId, userRef.id);
        if (!conv) return res.status(404).json({ message: 'Biseda nuk u gjet.' });
        row.conversation_id = conv.id;
        if (!reportedUserId) reportedUserId = otherParticipantId(conv, userRef.id);
      }
      if (!isUuid(reportedUserId)) {
        return res.status(400).json({ message: 'Përdoruesi nuk është i vlefshëm.' });
      }
      if (reportedUserId === String(userRef.id)) {
        return res.status(400).json({ message: 'Nuk mund të raportoni veten.' });
      }
      row.reported_user_id = reportedUserId;
    } else {
      const conversationId = String(req.body?.conversationId ?? '').trim();
      const messageId = String(req.body?.messageId ?? '').trim();
      if (!isUuid(messageId)) return res.status(400).json({ message: 'Mesazhi nuk është i vlefshëm.' });
      const conv = await loadConversationForParticipant(conversationId, userRef.id);
      if (!conv) return res.status(404).json({ message: 'Biseda nuk u gjet.' });
      const { data: msg, error: msgErr } = await getSupabaseAdmin()
        .from('messages')
        .select('id, conversation_id, sender_id, body, image_url')
        .eq('id', messageId)
        .eq('conversation_id', conv.id)
        .maybeSingle();
      if (msgErr) throw msgErr;
      if (!msg) return res.status(404).json({ message: 'Mesazhi nuk u gjet.' });
      if (String(msg.sender_id) === String(userRef.id)) {
        return res.status(400).json({ message: 'Nuk mund të raportoni mesazhin tuaj.' });
      }
      row.conversation_id = conv.id;
      row.message_id = msg.id;
      row.reported_user_id = msg.sender_id;
      row.message_excerpt = String(msg.body || (msg.image_url ? '[Foto]' : '')).slice(0, 500);
    }

    const { data, error } = await getSupabaseAdmin().from('content_reports').insert(row).select('*').single();
    if (error) {
      if (isMissingTableError(error)) return res.status(503).json({ message: SETUP_PENDING_MESSAGE });
      throw error;
    }

    const profiles = await loadProfilesById([data.reporter_id, data.reported_user_id]);
    const report = formatReport(data, profiles);
    void notifyModeratorsOfReport(report);

    res.status(201).json({ ok: true, id: report.id });
  } catch (err) {
    console.error('POST /moderation/reports:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/moderation/blocks — users the current user has blocked. */
router.get('/blocks', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const blockedUserIds = await loadBlockedUserIds(userRef.id);
    res.json({ blockedUserIds });
  } catch (err) {
    console.error('GET /moderation/blocks:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** POST /api/moderation/blocks — { userId } block a user (hides chats, stops messages both ways). */
router.post('/blocks', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const userId = String(req.body?.userId ?? '').trim();
    if (!isUuid(userId)) return res.status(400).json({ message: 'Përdoruesi nuk është i vlefshëm.' });
    if (userId === String(userRef.id)) {
      return res.status(400).json({ message: 'Nuk mund të bllokoni veten.' });
    }
    try {
      await blockUser(userRef.id, userId);
    } catch (error) {
      if (isMissingTableError(error)) return res.status(503).json({ message: SETUP_PENDING_MESSAGE });
      throw error;
    }
    res.json({ ok: true, userId, blocked: true });
  } catch (err) {
    console.error('POST /moderation/blocks:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** DELETE /api/moderation/blocks/:userId — unblock. */
router.delete('/blocks/:userId', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const userId = String(req.params.userId ?? '').trim();
    if (!isUuid(userId)) return res.status(400).json({ message: 'Përdoruesi nuk është i vlefshëm.' });
    try {
      await unblockUser(userRef.id, userId);
    } catch (error) {
      if (isMissingTableError(error)) return res.json({ ok: true, userId, blocked: false });
      throw error;
    }
    res.json({ ok: true, userId, blocked: false });
  } catch (err) {
    console.error('DELETE /moderation/blocks/:userId:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

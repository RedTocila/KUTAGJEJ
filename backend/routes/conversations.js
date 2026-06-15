const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const {
  VALID_KINDS,
  portalUserRef,
  isSamePortalUser,
  userParticipatesInConversation,
  userRoleInConversation,
  loadListingForConversation,
  loadPortalUserDisplayName,
} = require('../lib/listing-conversations');

const router = express.Router();

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
    id: String(conv._id),
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

async function attachOtherParticipantNames(items) {
  const names = await Promise.all(
    items.map((item) => loadPortalUserDisplayName(item.otherParticipantId, item.otherParticipantModel)),
  );
  return items.map((item, i) => ({
    ...item,
    otherParticipantName: names[i],
  }));
}

async function findConversationForUser(id, userRef) {
  if (!mongoose.isValidObjectId(id)) return null;
  const conv = await Conversation.findById(id).lean();
  if (!conv || !userParticipatesInConversation(conv, userRef)) return null;
  return conv;
}

/** POST /api/conversations — start or return existing thread for a listing */
router.post('/', auth, requirePortalUser, async (req, res) => {
  try {
    const listingKind = String(req.body?.listingKind ?? '').trim();
    const listingId = String(req.body?.listingId ?? '').trim();
    if (!VALID_KINDS.has(listingKind)) {
      return res.status(400).json({ message: 'Lloji i njoftimit nuk është i vlefshëm.' });
    }
    if (!mongoose.isValidObjectId(listingId)) {
      return res.status(400).json({ message: 'Njoftimi nuk është i vlefshëm.' });
    }

    const userRef = portalUserRef(req.user);
    const listing = await loadListingForConversation(listingKind, listingId);
    if (!listing) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });

    if (isSamePortalUser({ id: listing.posterId, model: listing.posterModel }, userRef)) {
      return res.status(400).json({ message: 'Nuk mund të dërgoni mesazh te njoftimi juaj.' });
    }

    let conv = await Conversation.findOne({
      listingKind,
      listingId,
      inquirerId: userRef.id,
      inquirerModel: userRef.model,
    });

    if (!conv) {
      conv = await Conversation.create({
        listingKind,
        listingId,
        listingTitle: listing.title,
        listingImageUrl: listing.imageUrl,
        posterId: listing.posterId,
        posterModel: listing.posterModel,
        inquirerId: userRef.id,
        inquirerModel: userRef.model,
      });
    } else if (conv.listingTitle !== listing.title || conv.listingImageUrl !== listing.imageUrl) {
      conv.listingTitle = listing.title;
      conv.listingImageUrl = listing.imageUrl;
      await conv.save();
    }

    const formatted = formatConversation(conv.toObject ? conv.toObject() : conv, userRef);
    const [withName] = await attachOtherParticipantNames([formatted]);
    res.status(201).json({ conversation: withName });
  } catch (err) {
    if (err?.code === 11000) {
      const userRef = portalUserRef(req.user);
      const conv = await Conversation.findOne({
        listingKind: String(req.body?.listingKind ?? '').trim(),
        listingId: String(req.body?.listingId ?? '').trim(),
        inquirerId: userRef.id,
        inquirerModel: userRef.model,
      }).lean();
      if (conv) {
        const formatted = formatConversation(conv, userRef);
        const [withName] = await attachOtherParticipantNames([formatted]);
        return res.status(200).json({ conversation: withName });
      }
    }
    console.error('POST /conversations:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/conversations — inbox */
router.get('/', auth, requirePortalUser, async (req, res) => {
  try {
    const userRef = portalUserRef(req.user);
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10) || 30));
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { posterId: userRef.id, posterModel: userRef.model },
        { inquirerId: userRef.id, inquirerModel: userRef.model },
      ],
    };

    const [rows, total] = await Promise.all([
      Conversation.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(limit).lean(),
      Conversation.countDocuments(filter),
    ]);

    const formatted = await attachOtherParticipantNames(rows.map((c) => formatConversation(c, userRef)));
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
    const filter = { conversationId: conv._id };
    if (before && !Number.isNaN(before.getTime())) {
      filter.createdAt = { $lt: before };
    }

    const rows = await Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    rows.reverse();

    const formatted = formatConversation(conv, userRef);
    const [withName] = await attachOtherParticipantNames([formatted]);

    res.json({
      messages: rows.map((m) => ({
        id: String(m._id),
        conversationId: String(m.conversationId),
        senderId: String(m.senderId),
        senderModel: m.senderModel,
        body: m.body,
        createdAt: m.createdAt,
        isMine: isSamePortalUser({ id: m.senderId, model: m.senderModel }, userRef),
      })),
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
    const conv = await Conversation.findById(req.params.id);
    if (!conv || !userParticipatesInConversation(conv, userRef)) {
      return res.status(404).json({ message: 'Biseda nuk u gjet.' });
    }

    const msg = await Message.create({
      conversationId: conv._id,
      senderId: userRef.id,
      senderModel: userRef.model,
      body,
    });

    const role = userRoleInConversation(conv, userRef);
    conv.lastMessageText = body;
    conv.lastMessageAt = msg.createdAt;
    if (role === 'poster') {
      conv.inquirerUnreadCount = (conv.inquirerUnreadCount ?? 0) + 1;
    } else if (role === 'inquirer') {
      conv.posterUnreadCount = (conv.posterUnreadCount ?? 0) + 1;
    }
    await conv.save();

    res.status(201).json({
      message: {
        id: String(msg._id),
        conversationId: String(msg.conversationId),
        senderId: String(msg.senderId),
        senderModel: msg.senderModel,
        body: msg.body,
        createdAt: msg.createdAt,
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
    const conv = await Conversation.findById(req.params.id);
    if (!conv || !userParticipatesInConversation(conv, userRef)) {
      return res.status(404).json({ message: 'Biseda nuk u gjet.' });
    }

    const role = userRoleInConversation(conv, userRef);
    if (role === 'poster') conv.posterUnreadCount = 0;
    else if (role === 'inquirer') conv.inquirerUnreadCount = 0;
    await conv.save();

    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /conversations/:id/read:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

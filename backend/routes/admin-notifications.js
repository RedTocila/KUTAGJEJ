const express = require('express');
const mongoose = require('mongoose');
const AdminNotification = require('../models/AdminNotification');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës.' });
  }
  next();
}

function formatNotification(doc) {
  return {
    id: String(doc._id),
    type: doc.type,
    refKind: doc.refKind || '',
    refId: doc.refId ? String(doc.refId) : null,
    title: doc.title,
    message: doc.message || '',
    readAt: doc.readAt ?? null,
    createdAt: doc.createdAt,
  };
}

/** GET /api/admin/notifications?unreadOnly=1&limit=20 */
router.get('/', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const unreadOnly = String(req.query.unreadOnly ?? '') === '1';
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const filter = unreadOnly ? { readAt: null } : {};
    const [notifications, unread] = await Promise.all([
      AdminNotification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      AdminNotification.countDocuments({ readAt: null }),
    ]);
    res.json({
      notifications: notifications.map(formatNotification),
      unread,
    });
  } catch (err) {
    console.error('GET /admin/notifications:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/admin/notifications/read-all */
router.patch('/read-all', authMiddleware, requirePlatformAdmin, async (_req, res) => {
  try {
    await AdminNotification.updateMany({ readAt: null }, { $set: { readAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /admin/notifications/read-all:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/admin/notifications/:id/read */
router.patch('/:id/read', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const doc = await AdminNotification.findByIdAndUpdate(
      id,
      { $set: { readAt: new Date() } },
      { new: true },
    ).lean();
    if (!doc) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    res.json({ notification: formatNotification(doc) });
  } catch (err) {
    console.error('PATCH /admin/notifications/:id/read:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

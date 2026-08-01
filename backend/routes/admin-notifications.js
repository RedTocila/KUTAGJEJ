'use strict';

const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const { isUuid } = require('../lib/public-listings/query-helpers');
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
    id: String(doc.id),
    type: doc.type,
    refKind: doc.ref_kind || '',
    refId: doc.ref_id ? String(doc.ref_id) : null,
    title: doc.title,
    message: doc.message || '',
    readAt: doc.read_at ?? null,
    createdAt: doc.created_at,
  };
}

/** GET /api/admin/notifications?unreadOnly=1&limit=20 */
router.get('/', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const unreadOnly = String(req.query.unreadOnly ?? '') === '1';
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const sb = getSupabaseAdmin();

    let listQ = sb.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(limit);
    if (unreadOnly) listQ = listQ.is('read_at', null);

    const [{ data: notifications, error }, { count: unread, error: unreadErr }] = await Promise.all([
      listQ,
      sb.from('admin_notifications').select('*', { count: 'exact', head: true }).is('read_at', null),
    ]);
    if (error) throw error;
    if (unreadErr) throw unreadErr;

    res.json({
      notifications: (notifications || []).map(formatNotification),
      unread: unread ?? 0,
    });
  } catch (err) {
    console.error('GET /admin/notifications:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/admin/notifications/read-all */
router.patch('/read-all', authMiddleware, requirePlatformAdmin, async (_req, res) => {
  try {
    const { error } = await getSupabaseAdmin()
      .from('admin_notifications')
      .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .is('read_at', null);
    if (error) throw error;
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
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const { data: doc, error } = await getSupabaseAdmin()
      .from('admin_notifications')
      .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!doc) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    res.json({ notification: formatNotification(doc) });
  } catch (err) {
    console.error('PATCH /admin/notifications/:id/read:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

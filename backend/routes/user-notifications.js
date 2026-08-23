'use strict';

const express = require('express');
const auth = require('../middleware/auth');
const requirePortalUser = require('../middleware/require-portal-user');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { getSupabaseAdmin } = require('../lib/supabase');
const {
  formatNotification,
  getPreferences,
  upsertPreferences,
  PREF_KEYS,
} = require('../lib/user-notifications');
const { posterHasTrustBadge } = require('../lib/public-listings/load-poster-brief');

/** Save / share / high-interest prefs — Grow / Elite only. */
const GROW_ELITE_PREF_KEYS = new Set(['listing_saved', 'listing_shared', 'listing_hot_lead']);

const router = express.Router();

function portalUserId(user) {
  return String(user?.id || user?._id || '').trim();
}

/** GET /api/user-notifications?unreadOnly=1&limit=20 */
router.get('/', auth, requirePortalUser, async (req, res) => {
  try {
    const userId = portalUserId(req.user);
    const unreadOnly = String(req.query.unreadOnly ?? '') === '1';
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const sb = getSupabaseAdmin();

    let listQ = sb
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .neq('type', 'ai_usage')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (unreadOnly) listQ = listQ.is('read_at', null);

    const [{ data: notifications, error }, { count: unread, error: unreadErr }] = await Promise.all([
      listQ,
      sb
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('type', 'ai_usage')
        .is('read_at', null),
    ]);
    if (error) {
      if (/relation .* does not exist|Could not find the table/i.test(String(error.message || ''))) {
        return res.json({ notifications: [], unread: 0 });
      }
      throw error;
    }
    if (unreadErr) {
      if (/relation .* does not exist|Could not find the table/i.test(String(unreadErr.message || ''))) {
        return res.json({ notifications: [], unread: 0 });
      }
      throw unreadErr;
    }

    res.json({
      notifications: (notifications || []).map(formatNotification),
      unread: unread ?? 0,
    });
  } catch (err) {
    console.error('GET /user-notifications:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** GET /api/user-notifications/preferences */
router.get('/preferences', auth, requirePortalUser, async (req, res) => {
  try {
    const preferences = await getPreferences(portalUserId(req.user));
    res.json({ preferences });
  } catch (err) {
    console.error('GET /user-notifications/preferences:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/user-notifications/preferences */
router.patch('/preferences', auth, requirePortalUser, async (req, res) => {
  try {
    const userId = portalUserId(req.user);
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const patch = {};
    for (const key of PREF_KEYS) {
      if (typeof body[key] === 'boolean') patch[key] = body[key];
    }
    if (!Object.keys(patch).length) {
      return res.status(400).json({ message: 'Nuk u dërgua asnjë preferencë e vlefshme.' });
    }

    const entitled = await posterHasTrustBadge(userId);
    if (!entitled) {
      const onlyGrowElite = Object.keys(patch).every((key) => GROW_ELITE_PREF_KEYS.has(key));
      for (const key of GROW_ELITE_PREF_KEYS) delete patch[key];
      if (!Object.keys(patch).length) {
        return res.status(403).json({
          code: 'PACKAGE_REQUIRED',
          message:
            onlyGrowElite
              ? 'Këto njoftime janë të disponueshme me paketën Grow ose Elite.'
              : 'Nuk u dërgua asnjë preferencë e vlefshme.',
        });
      }
    }

    const preferences = await upsertPreferences(userId, patch);
    res.json({ preferences });
  } catch (err) {
    console.error('PATCH /user-notifications/preferences:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/user-notifications/read-all */
router.patch('/read-all', auth, requirePortalUser, async (req, res) => {
  try {
    const userId = portalUserId(req.user);
    const now = new Date().toISOString();
    const { error } = await getSupabaseAdmin()
      .from('user_notifications')
      .update({ read_at: now, updated_at: now })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) {
      if (/relation .* does not exist|Could not find the table/i.test(String(error.message || ''))) {
        return res.json({ ok: true });
      }
      throw error;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('PATCH /user-notifications/read-all:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/user-notifications/:id/read */
router.patch('/:id/read', auth, requirePortalUser, async (req, res) => {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!isUuid(id)) {
      return res.status(400).json({ message: 'ID e pavlefshme.' });
    }
    const userId = portalUserId(req.user);
    const now = new Date().toISOString();
    const { data: doc, error } = await getSupabaseAdmin()
      .from('user_notifications')
      .update({ read_at: now, updated_at: now })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!doc) return res.status(404).json({ message: 'Njoftimi nuk u gjet.' });
    res.json({ notification: formatNotification(doc) });
  } catch (err) {
    console.error('PATCH /user-notifications/:id/read:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

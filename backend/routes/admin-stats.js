const express = require('express');
const { getSupabaseAdmin } = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës.' });
  }
  next();
}

const LISTING_KINDS = {
  'real-estate': { table: 'real_estate_listings' },
  cars: { table: 'car_listings' },
  jobs: { table: 'job_listings' },
  marketplace: { table: 'marketplace_listings' },
  businesses: { table: 'directory_listings', extraFilter: { vertical: 'businesses' } },
  professionals: { table: 'directory_listings', extraFilter: { vertical: 'professionals' } },
};

async function countListingsByStatus(sb) {
  const out = {};
  for (const [kind, cfg] of Object.entries(LISTING_KINDS)) {
    let query = sb.from(cfg.table).select('status');
    for (const [col, val] of Object.entries(cfg.extraFilter || {})) {
      query = query.eq(col, val);
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    out[kind] = {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
    };
  }
  return out;
}

/** GET /api/admin/stats — platform overview for the admin dashboard. */
router.get('/', authMiddleware, requirePlatformAdmin, async (_req, res) => {
  try {
    const sb = getSupabaseAdmin();

    const [byKind, usersResult, unreadResult] = await Promise.all([
      countListingsByStatus(sb),
      sb.from('profiles').select('account_type').in('account_type', ['managed', 'individual', 'business']),
      sb.from('admin_notifications').select('*', { count: 'exact', head: true }).is('read_at', null),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (unreadResult.error) throw unreadResult.error;

    const totals = { total: 0, pending: 0, approved: 0, rejected: 0 };
    for (const row of Object.values(byKind)) {
      totals.total += row.total;
      totals.pending += row.pending;
      totals.approved += row.approved;
      totals.rejected += row.rejected;
    }

    const userRows = usersResult.data || [];
    const managedUsers = userRows.filter((u) => u.account_type === 'managed').length;
    const individualUsers = userRows.filter((u) => u.account_type === 'individual').length;
    const businessUsers = userRows.filter((u) => u.account_type === 'business').length;

    res.json({
      listings: { byKind, totals },
      users: {
        managed: managedUsers,
        individual: individualUsers,
        business: businessUsers,
        total: managedUsers + individualUsers + businessUsers,
      },
      notifications: { unread: unreadResult.count ?? 0 },
    });
  } catch (err) {
    console.error('GET /admin/stats:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

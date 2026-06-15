const express = require('express');
const ManagedUser = require('../models/ManagedUser');
const BusinessUser = require('../models/BusinessUser');
const IndividualUser = require('../models/IndividualUser');
const AdminNotification = require('../models/AdminNotification');
const authMiddleware = require('../middleware/auth');
const { countListingsByStatus } = require('../lib/listing-moderation');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës.' });
  }
  next();
}

/** GET /api/admin/stats — platform overview for the admin dashboard. */
router.get('/', authMiddleware, requirePlatformAdmin, async (_req, res) => {
  try {
    const [byKind, managedUsers, individualUsers, businessUsers, unreadNotifications] = await Promise.all([
      countListingsByStatus(),
      ManagedUser.countDocuments(),
      IndividualUser.countDocuments(),
      BusinessUser.countDocuments(),
      AdminNotification.countDocuments({ readAt: null }),
    ]);

    const totals = { total: 0, pending: 0, approved: 0, rejected: 0 };
    for (const row of Object.values(byKind)) {
      totals.total += row.total;
      totals.pending += row.pending;
      totals.approved += row.approved;
      totals.rejected += row.rejected;
    }

    res.json({
      listings: { byKind, totals },
      users: {
        managed: managedUsers,
        individual: individualUsers,
        business: businessUsers,
        total: managedUsers + individualUsers + businessUsers,
      },
      notifications: { unread: unreadNotifications },
    });
  } catch (err) {
    console.error('GET /admin/stats:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

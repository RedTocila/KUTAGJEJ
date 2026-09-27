'use strict';

const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getSupabaseAdmin } = require('../lib/supabase');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { REPORT_STATUSES, formatReport, loadProfilesById } = require('../lib/content-reports');
const { isMissingTableError } = require('../lib/user-blocks');

const router = express.Router();

function requirePlatformAdmin(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët e platformës.' });
  }
  next();
}

/** GET /api/admin/reports?status=open&page=1&limit=30 */
router.get('/', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const statusRaw = String(req.query.status ?? 'open').trim();
    const status = statusRaw === 'all' ? null : REPORT_STATUSES.has(statusRaw) ? statusRaw : 'open';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const from = (page - 1) * limit;

    let q = getSupabaseAdmin()
      .from('content_reports')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const { data, error, count } = await q.range(from, from + limit - 1);
    if (error) {
      if (isMissingTableError(error)) {
        return res.json({ reports: [], total: 0, page, limit, setupPending: true });
      }
      throw error;
    }

    const rows = data || [];
    const profiles = await loadProfilesById(rows.flatMap((r) => [r.reporter_id, r.reported_user_id]));
    res.json({
      reports: rows.map((row) => formatReport(row, profiles)),
      total: count ?? rows.length,
      page,
      limit,
    });
  } catch (err) {
    console.error('GET /admin/reports:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PATCH /api/admin/reports/:id — { status: resolved|dismissed|open, adminNote } */
router.patch('/:id', authMiddleware, requirePlatformAdmin, async (req, res) => {
  try {
    const id = String(req.params.id ?? '').trim();
    if (!isUuid(id)) return res.status(404).json({ message: 'Raportimi nuk u gjet.' });
    const status = String(req.body?.status ?? '').trim();
    if (!REPORT_STATUSES.has(status)) {
      return res.status(400).json({ message: 'Statusi nuk është i vlefshëm.' });
    }
    const now = new Date().toISOString();
    const patch = {
      status,
      updated_at: now,
      resolved_at: status === 'open' ? null : now,
    };
    if (req.body?.adminNote != null) patch.admin_note = String(req.body.adminNote).trim().slice(0, 1000);

    const { data, error } = await getSupabaseAdmin()
      .from('content_reports')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Raportimi nuk u gjet.' });

    const profiles = await loadProfilesById([data.reporter_id, data.reported_user_id]);
    res.json({ report: formatReport(data, profiles) });
  } catch (err) {
    console.error('PATCH /admin/reports/:id:', err?.message || err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

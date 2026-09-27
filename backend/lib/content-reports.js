'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');
const { isResendConfigured, sendResendEmail } = require('./mail/resend');
const { getFrontendBaseUrl } = require('./site-url');

const REPORT_REASONS = new Set([
  'spam',
  'scam',
  'offensive',
  'harassment',
  'inappropriate',
  'prohibited',
  'wrong_category',
  'other',
]);

const REPORT_TARGET_TYPES = new Set(['listing', 'user', 'message']);
const REPORT_STATUSES = new Set(['open', 'resolved', 'dismissed']);

function profileDisplayName(row) {
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
}

async function loadProfilesById(ids) {
  const unique = [...new Set(ids.map((id) => String(id || '').trim()).filter(isUuid))];
  const map = new Map();
  if (!unique.length) return map;
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, email, account_type, first_name, last_name, business_name, business_owner')
    .in('id', unique);
  if (error) throw error;
  for (const row of data || []) map.set(String(row.id), row);
  return map;
}

function formatReport(row, profiles) {
  const reporter = profiles.get(String(row.reporter_id));
  const reported = row.reported_user_id ? profiles.get(String(row.reported_user_id)) : null;
  return {
    id: row.id,
    targetType: row.target_type,
    listingKind: row.listing_kind || null,
    listingId: row.listing_id || null,
    listingTitle: row.listing_title || '',
    reporterId: row.reporter_id,
    reporterName: profileDisplayName(reporter),
    reporterEmail: reporter?.email || null,
    reportedUserId: row.reported_user_id || null,
    reportedUserName: profileDisplayName(reported),
    reportedUserEmail: reported?.email || null,
    conversationId: row.conversation_id || null,
    messageId: row.message_id || null,
    messageExcerpt: row.message_excerpt || '',
    reason: row.reason,
    details: row.details || '',
    status: row.status,
    adminNote: row.admin_note || '',
    resolvedAt: row.resolved_at || null,
    createdAt: row.created_at,
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Best-effort alert to moderators; never blocks the report request. */
async function notifyModeratorsOfReport(report) {
  const to = String(process.env.MODERATION_ALERT_EMAIL || '').trim();
  if (!to || !isResendConfigured()) return;
  const adminUrl = `${getFrontendBaseUrl()}/dashboard/raportimet`;
  const html = `
    <p><strong>Raportim i ri në KuTaGjej</strong></p>
    <p>Lloji: ${escapeHtml(report.targetType)}<br/>
    Arsyeja: ${escapeHtml(report.reason)}<br/>
    ${report.listingTitle ? `Njoftimi: ${escapeHtml(report.listingTitle)}<br/>` : ''}
    ${report.details ? `Detaje: ${escapeHtml(report.details)}<br/>` : ''}
    ${report.messageExcerpt ? `Mesazhi: ${escapeHtml(report.messageExcerpt)}<br/>` : ''}</p>
    <p><a href="${adminUrl}">Hap raportimet</a></p>`;
  try {
    await sendResendEmail({
      to: to.split(',').map((s) => s.trim()).filter(Boolean),
      subject: `Raportim i ri (${report.targetType}) — KuTaGjej`,
      html,
    });
  } catch (err) {
    console.warn('notifyModeratorsOfReport:', err?.message || err);
  }
}

module.exports = {
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
  REPORT_STATUSES,
  loadProfilesById,
  formatReport,
  notifyModeratorsOfReport,
};

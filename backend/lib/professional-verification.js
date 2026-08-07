'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { getProfileById } = require('./profiles');
const {
  buildApplicantSnapshot,
  formatVerificationRequest,
} = require('./job-employer-verification');
const { createAdminNotification } = require('./listing-moderation');
const { isUuid } = require('./public-listings/query-helpers');

function isProfessionalVerified(userDoc) {
  // Account verification is shared across professionals + jobs listing badges.
  return Boolean(userDoc?.professionalsVerifiedAt || userDoc?.jobsEmployerVerifiedAt);
}

async function getApplicantVerificationStatus(user) {
  const portal = await getProfileById(user.id || user._id);
  if (!portal) return { verified: false, canRequest: false, latestRequest: null };

  const verified = isProfessionalVerified(portal);
  const { data: latest, error } = await getSupabaseAdmin()
    .from('professional_verification_requests')
    .select('*')
    .eq('applicant_id', portal.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  const pending = latest?.status === 'pending';
  return {
    verified,
    canRequest: !verified && !pending,
    latestRequest: latest ? formatVerificationRequest(latest) : null,
  };
}

async function submitVerificationRequest(user, message) {
  const portal = await getProfileById(user.id || user._id);
  if (!portal) return { ok: false, status: 404, message: 'User not found.' };

  if (isProfessionalVerified(portal)) {
    return { ok: false, status: 400, message: 'Llogaria juaj është tashmë e verifikuar.' };
  }

  const { data: pending, error: pendingErr } = await getSupabaseAdmin()
    .from('professional_verification_requests')
    .select('id')
    .eq('applicant_id', portal.id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  if (pendingErr) throw pendingErr;

  if (pending) {
    return { ok: false, status: 400, message: 'Keni tashmë një kërkesë në pritje.' };
  }

  const note = String(message ?? '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  const snap = buildApplicantSnapshot(portal, portal.constructor.modelName);
  const { data: doc, error } = await getSupabaseAdmin()
    .from('professional_verification_requests')
    .insert({
      applicant_id: portal.id,
      status: 'pending',
      message: note,
      applicant_snapshot: snap,
    })
    .select('*')
    .single();
  if (error) throw error;

  await createAdminNotification({
    type: 'professional_verification',
    refKind: 'professionals',
    refId: doc.id,
    title: 'Kërkesë verifikimi llogarie',
    message: `${snap.displayName || 'Përdorues'} dërgoi një kërkesë për verifikim llogarie.`,
  });

  return { ok: true, request: formatVerificationRequest(doc) };
}

async function reviewVerificationRequest(admin, requestId, decision, adminNote) {
  if (!isUuid(String(requestId || '').trim())) {
    return { ok: false, status: 404, message: 'Request not found.' };
  }

  const sb = getSupabaseAdmin();
  const { data: doc, error: findErr } = await sb
    .from('professional_verification_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!doc) return { ok: false, status: 404, message: 'Request not found.' };
  if (doc.status !== 'pending') {
    return { ok: false, status: 400, message: 'Kjo kërkesë është përpunuar tashmë.' };
  }

  const status = decision === 'approve' ? 'approved' : 'rejected';
  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await sb
    .from('professional_verification_requests')
    .update({
      status,
      reviewed_by: admin.id || admin._id,
      reviewed_at: now,
      admin_note: String(adminNote ?? '').trim().slice(0, 2000),
      updated_at: now,
    })
    .eq('id', requestId)
    .select('*')
    .single();
  if (updateErr) throw updateErr;

  if (status === 'approved') {
    // One account verification covers both listing contexts (professionals + jobs).
    const { error: profileErr } = await sb
      .from('profiles')
      .update({
        professionals_verified_at: now,
        jobs_employer_verified_at: now,
        updated_at: now,
      })
      .eq('id', doc.applicant_id);
    if (profileErr) throw profileErr;
  }

  return { ok: true, request: formatVerificationRequest(updated) };
}

module.exports = {
  isProfessionalVerified,
  formatVerificationRequest,
  getApplicantVerificationStatus,
  submitVerificationRequest,
  reviewVerificationRequest,
};

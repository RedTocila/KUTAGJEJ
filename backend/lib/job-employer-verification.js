'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { getProfileById, camelizeRow } = require('./profiles');
const { createAdminNotification } = require('./listing-moderation');
const { isUuid } = require('./public-listings/query-helpers');

function isJobsEmployerVerified(userDoc) {
  return Boolean(userDoc?.jobsEmployerVerifiedAt);
}

function buildApplicantSnapshot(userDoc, modelName) {
  const kind =
    modelName === 'BusinessUser' || userDoc?.accountType === 'business' ? 'business' : 'individual';

  if (kind === 'individual') {
    const displayName =
      `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.replace(/\s+/g, ' ').trim() || 'Përdorues';
    return {
      displayName,
      email: userDoc.email,
      phone: userDoc.phone?.trim() || '',
      accountKind: 'individual',
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      memberSince: userDoc.createdAt,
    };
  }

  const displayName =
    (userDoc.businessName && String(userDoc.businessName).trim()) ||
    (userDoc.businessOwner && String(userDoc.businessOwner).trim()) ||
    `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.replace(/\s+/g, ' ').trim() ||
    'Biznes';

  return {
    displayName,
    email: userDoc.email,
    phone: userDoc.phone?.trim() || '',
    accountKind: 'business',
    firstName: userDoc.firstName,
    lastName: userDoc.lastName,
    businessName: userDoc.businessName,
    businessOwner: userDoc.businessOwner,
    nipt: userDoc.nipt,
    businessCategory: userDoc.businessCategory,
    memberSince: userDoc.createdAt,
  };
}

function formatVerificationRequest(doc) {
  const row = doc.applicant_id ? camelizeRow(doc) : doc;
  return {
    id: String(row.id || doc.id),
    status: row.status,
    message: row.message ?? '',
    adminNote: row.adminNote ?? '',
    applicantSnapshot: row.applicantSnapshot,
    reviewedAt: row.reviewedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getApplicantVerificationStatus(user) {
  const portal = await getProfileById(user.id || user._id);
  if (!portal) return { verified: false, canRequest: false, latestRequest: null };

  const verified = isJobsEmployerVerified(portal);
  const { data: latest, error } = await getSupabaseAdmin()
    .from('job_employer_verification_requests')
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

  if (isJobsEmployerVerified(portal)) {
    return { ok: false, status: 400, message: 'Profili juaj është tashmë i verifikuar për Punë.' };
  }

  const { data: pending, error: pendingErr } = await getSupabaseAdmin()
    .from('job_employer_verification_requests')
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
    .from('job_employer_verification_requests')
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
    type: 'job_employer_verification',
    refKind: 'jobs',
    refId: doc.id,
    title: 'Kërkesë verifikimi punëdhënësi',
    message: `${snap.displayName || 'Përdorues'} dërgoi një kërkesë verifikimi për Punë.`,
  });

  return { ok: true, request: formatVerificationRequest(doc) };
}

async function reviewVerificationRequest(admin, requestId, decision, adminNote) {
  if (!isUuid(String(requestId || '').trim())) {
    return { ok: false, status: 404, message: 'Request not found.' };
  }

  const sb = getSupabaseAdmin();
  const { data: doc, error: findErr } = await sb
    .from('job_employer_verification_requests')
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
    .from('job_employer_verification_requests')
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
    const { error: profileErr } = await sb
      .from('profiles')
      .update({ jobs_employer_verified_at: now, updated_at: now })
      .eq('id', doc.applicant_id);
    if (profileErr) throw profileErr;
  }

  return { ok: true, request: formatVerificationRequest(updated) };
}

module.exports = {
  isJobsEmployerVerified,
  buildApplicantSnapshot,
  formatVerificationRequest,
  getApplicantVerificationStatus,
  submitVerificationRequest,
  reviewVerificationRequest,
};

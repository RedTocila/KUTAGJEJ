'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { getProfileById, camelizeRow } = require('./profiles');
const { createAdminNotification } = require('./listing-moderation');
const { isUuid } = require('./public-listings/query-helpers');
const { validateIdFrontImageUrl } = require('./id-document-ai');

function isJobsEmployerVerified(userDoc) {
  // Account verification is shared across listing contexts.
  return Boolean(userDoc?.jobsEmployerVerifiedAt || userDoc?.professionalsVerifiedAt);
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
  const snap = row.applicantSnapshot && typeof row.applicantSnapshot === 'object' ? row.applicantSnapshot : {};
  return {
    id: String(row.id || doc.id),
    status: row.status,
    message: row.message ?? '',
    adminNote: row.adminNote ?? '',
    idNumber: row.idNumber || '',
    idFrontImageUrl: row.idFrontImageUrl || '',
    nipt: row.nipt || snap.nipt || '',
    applicantSnapshot: row.applicantSnapshot,
    reviewedAt: row.reviewedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Validate ID number + front image (all accounts) and NIPT (business).
 * @returns {{ ok: true, idNumber: string, idFrontImageUrl: string, nipt: string, isBusiness: boolean } | { ok: false, status: number, message: string }}
 */
function normalizeVerificationDocuments(payload, portal) {
  const idNumber = String(payload?.idNumber ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  const idFrontImageUrl = String(payload?.idFrontImageUrl ?? '')
    .trim()
    .slice(0, 2000);
  const isBusiness =
    portal?.accountType === 'business' || portal?.constructor?.modelName === 'BusinessUser';
  const nipt = String(payload?.nipt ?? (isBusiness ? portal?.nipt : '') ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);

  if (!idNumber) {
    return { ok: false, status: 400, message: 'Numri i ID-së është i detyrueshëm.' };
  }
  if (!idFrontImageUrl) {
    return { ok: false, status: 400, message: 'Fotoja e përparme e ID-së është e detyrueshme.' };
  }
  if (!/^https?:\/\//i.test(idFrontImageUrl)) {
    return { ok: false, status: 400, message: 'Fotoja e ID-së nuk është e vlefshme.' };
  }
  if (isBusiness && !nipt) {
    return { ok: false, status: 400, message: 'NIPT është i detyrueshëm për llogaritë e biznesit.' };
  }

  return {
    ok: true,
    idNumber,
    idFrontImageUrl,
    nipt: isBusiness ? nipt : '',
    isBusiness,
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

async function submitVerificationRequest(user, payload = {}) {
  const portal = await getProfileById(user.id || user._id);
  if (!portal) return { ok: false, status: 404, message: 'User not found.' };

  if (isJobsEmployerVerified(portal)) {
    return { ok: false, status: 400, message: 'Llogaria juaj është tashmë e verifikuar.' };
  }

  const docs = normalizeVerificationDocuments(payload, portal);
  if (!docs.ok) return docs;

  const imageCheck = await validateIdFrontImageUrl(docs.idFrontImageUrl);
  if (!imageCheck.ok) return imageCheck;

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

  const note = String(payload?.message ?? '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  const snap = buildApplicantSnapshot(portal, portal.constructor.modelName);
  if (docs.isBusiness && docs.nipt) snap.nipt = docs.nipt;
  const { data: doc, error } = await getSupabaseAdmin()
    .from('job_employer_verification_requests')
    .insert({
      applicant_id: portal.id,
      status: 'pending',
      message: note,
      id_number: docs.idNumber,
      id_front_image_url: docs.idFrontImageUrl,
      nipt: docs.nipt,
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
    // One account verification covers both listing contexts (professionals + jobs).
    const { error: profileErr } = await sb
      .from('profiles')
      .update({
        jobs_employer_verified_at: now,
        professionals_verified_at: now,
        updated_at: now,
      })
      .eq('id', doc.applicant_id);
    if (profileErr) throw profileErr;
  }

  try {
    const { notifyVerificationResult } = require('./user-notifications');
    await notifyVerificationResult({
      userId: doc.applicant_id,
      approved: status === 'approved',
    });
  } catch (notifyErr) {
    console.warn('notifyVerificationResult:', notifyErr?.message || notifyErr);
  }

  return { ok: true, request: formatVerificationRequest(updated) };
}

module.exports = {
  isJobsEmployerVerified,
  buildApplicantSnapshot,
  formatVerificationRequest,
  normalizeVerificationDocuments,
  getApplicantVerificationStatus,
  submitVerificationRequest,
  reviewVerificationRequest,
};

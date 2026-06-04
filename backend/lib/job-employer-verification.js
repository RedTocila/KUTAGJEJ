const IndividualUser = require('../models/IndividualUser');
const BusinessUser = require('../models/BusinessUser');
const JobEmployerVerificationRequest = require('../models/JobEmployerVerificationRequest');

function isJobsEmployerVerified(userDoc) {
  return Boolean(userDoc?.jobsEmployerVerifiedAt);
}

async function loadPortalUser(modelName, userId) {
  if (modelName === 'IndividualUser') {
    return IndividualUser.findById(userId).lean();
  }
  if (modelName === 'BusinessUser') {
    return BusinessUser.findById(userId).lean();
  }
  return null;
}

function buildApplicantSnapshot(userDoc, modelName) {
  if (modelName === 'IndividualUser') {
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
  return {
    id: String(doc._id),
    status: doc.status,
    message: doc.message ?? '',
    adminNote: doc.adminNote ?? '',
    applicantSnapshot: doc.applicantSnapshot,
    reviewedAt: doc.reviewedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function getApplicantVerificationStatus(user) {
  const modelName = user.constructor.modelName;
  const portal = await loadPortalUser(modelName, user._id);
  if (!portal) return { verified: false, canRequest: false, latestRequest: null };

  const verified = isJobsEmployerVerified(portal);
  const latest = await JobEmployerVerificationRequest.findOne({
    applicantId: user._id,
    applicantModel: modelName,
  })
    .sort({ createdAt: -1 })
    .lean();

  const pending = latest?.status === 'pending';
  return {
    verified,
    canRequest: !verified && !pending,
    latestRequest: latest ? formatVerificationRequest(latest) : null,
  };
}

async function submitVerificationRequest(user, message) {
  const modelName = user.constructor.modelName;
  const portal = await loadPortalUser(modelName, user._id);
  if (!portal) return { ok: false, status: 404, message: 'User not found.' };

  if (isJobsEmployerVerified(portal)) {
    return { ok: false, status: 400, message: 'Profili juaj është tashmë i verifikuar për Punë.' };
  }

  const pending = await JobEmployerVerificationRequest.findOne({
    applicantId: user._id,
    applicantModel: modelName,
    status: 'pending',
  }).lean();

  if (pending) {
    return { ok: false, status: 400, message: 'Keni tashmë një kërkesë në pritje.' };
  }

  const note = String(message ?? '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  const doc = await JobEmployerVerificationRequest.create({
    applicantId: user._id,
    applicantModel: modelName,
    status: 'pending',
    message: note,
    applicantSnapshot: buildApplicantSnapshot(portal, modelName),
  });

  return { ok: true, request: formatVerificationRequest(doc) };
}

async function reviewVerificationRequest(admin, requestId, decision, adminNote) {
  const doc = await JobEmployerVerificationRequest.findById(requestId);
  if (!doc) return { ok: false, status: 404, message: 'Request not found.' };
  if (doc.status !== 'pending') {
    return { ok: false, status: 400, message: 'Kjo kërkesë është përpunuar tashmë.' };
  }

  const status = decision === 'approve' ? 'approved' : 'rejected';
  doc.status = status;
  doc.reviewedBy = admin._id;
  doc.reviewedAt = new Date();
  doc.adminNote = String(adminNote ?? '').trim().slice(0, 2000);
  await doc.save();

  if (status === 'approved') {
    const Model = doc.applicantModel === 'IndividualUser' ? IndividualUser : BusinessUser;
    await Model.findByIdAndUpdate(doc.applicantId, { jobsEmployerVerifiedAt: new Date() });
  }

  return { ok: true, request: formatVerificationRequest(doc) };
}

module.exports = {
  isJobsEmployerVerified,
  buildApplicantSnapshot,
  formatVerificationRequest,
  getApplicantVerificationStatus,
  submitVerificationRequest,
  reviewVerificationRequest,
};

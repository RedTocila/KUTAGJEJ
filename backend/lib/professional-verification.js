const IndividualUser = require('../models/IndividualUser');
const BusinessUser = require('../models/BusinessUser');
const ProfessionalVerificationRequest = require('../models/ProfessionalVerificationRequest');
const {
  buildApplicantSnapshot,
  formatVerificationRequest,
} = require('./job-employer-verification');

function isProfessionalVerified(userDoc) {
  return Boolean(userDoc?.professionalsVerifiedAt);
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

async function getApplicantVerificationStatus(user) {
  const modelName = user.constructor.modelName;
  const portal = await loadPortalUser(modelName, user._id);
  if (!portal) return { verified: false, canRequest: false, latestRequest: null };

  const verified = isProfessionalVerified(portal);
  const latest = await ProfessionalVerificationRequest.findOne({
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

  if (isProfessionalVerified(portal)) {
    return { ok: false, status: 400, message: 'Profili juaj është tashmë i verifikuar për Profesionistë.' };
  }

  const pending = await ProfessionalVerificationRequest.findOne({
    applicantId: user._id,
    applicantModel: modelName,
    status: 'pending',
  }).lean();

  if (pending) {
    return { ok: false, status: 400, message: 'Keni tashmë një kërkesë në pritje.' };
  }

  const note = String(message ?? '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  const doc = await ProfessionalVerificationRequest.create({
    applicantId: user._id,
    applicantModel: modelName,
    status: 'pending',
    message: note,
    applicantSnapshot: buildApplicantSnapshot(portal, modelName),
  });

  return { ok: true, request: formatVerificationRequest(doc) };
}

async function reviewVerificationRequest(admin, requestId, decision, adminNote) {
  const doc = await ProfessionalVerificationRequest.findById(requestId);
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
    await Model.findByIdAndUpdate(doc.applicantId, { professionalsVerifiedAt: new Date() });
  }

  return { ok: true, request: formatVerificationRequest(doc) };
}

module.exports = {
  isProfessionalVerified,
  formatVerificationRequest,
  getApplicantVerificationStatus,
  submitVerificationRequest,
  reviewVerificationRequest,
};

'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { getProfileById } = require('./profiles');
const { profileUpdateFromCamel } = require('./profile');
const { isUuid } = require('./public-listings/query-helpers');
const { updatePortalUserIdentity } = require('./portal-identity');

async function resolveBasedCity(raw) {
  if (raw === undefined) return { ok: true, skipped: true };
  const id = String(raw ?? '').trim();
  if (!id) return { ok: true, id: null, name: null };
  if (!isUuid(id)) return { ok: false, message: 'Qyteti i zgjedhur nuk është i vlefshëm.' };
  const { data, error } = await getSupabaseAdmin()
    .from('real_estate_cities')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, message: 'Qyteti i zgjedhur nuk u gjet.' };
  return { ok: true, id: data.id, name: data.name || '' };
}

function sanitizeAvatarUrl(raw) {
  const url = String(raw ?? '').trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) return null;
  return url.slice(0, 2000);
}

function portalDirectoryExtras(user, idNumber) {
  return {
    verified: Boolean(user.professionalsVerifiedAt || user.jobsEmployerVerifiedAt),
    verifiedAt: user.professionalsVerifiedAt || user.jobsEmployerVerifiedAt || null,
    phone: user.phone || '',
    businessOwner: user.businessOwner || null,
    businessCategory: user.businessCategory || null,
    basedCityId: user.basedCityId || null,
    basedCityName: user.basedCityName || '',
    avatarUrl: user.avatarUrl || '',
    idNumber: idNumber ?? null,
  };
}

function formatPortalDirectoryUser(user, idNumber) {
  const extras = portalDirectoryExtras(user, idNumber);
  const base =
    user.accountType === 'business'
      ? {
          accountKind: 'business',
          roleLabel: 'Biznes',
          businessName: user.businessName ?? null,
          nipt: user.nipt ?? null,
        }
      : {
          accountKind: 'individual',
          roleLabel: 'Individ',
          businessName: null,
          nipt: null,
        };

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roleId: null,
    role: user.accountType === 'business' ? 'business-user' : 'individual-user',
    roleDescription: '',
    isActive: user.isActive,
    createdBy: null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
    staffRoleName: null,
    manageable: false,
    ...base,
    ...extras,
  };
}

async function closePendingVerificationRequests(userId, { adminId = null, now, note = '' } = {}) {
  const sb = getSupabaseAdmin();
  const patch = {
    status: 'approved',
    reviewed_at: now,
    updated_at: now,
    admin_note: String(note || 'Verifikuar nga administratori.').slice(0, 2000),
  };
  if (adminId) patch.reviewed_by = adminId;

  for (const table of ['professional_verification_requests', 'job_employer_verification_requests']) {
    try {
      const { error } = await sb.from(table).update(patch).eq('applicant_id', userId).eq('status', 'pending');
      if (error) console.warn(`[grant-verification] ${table}:`, error.message);
    } catch (err) {
      console.warn(`[grant-verification] ${table}:`, err?.message || err);
    }
  }
}

async function grantPortalVerification(userId, { admin = null, reason = '' } = {}) {
  const profile = await getProfileById(userId);
  if (!profile) return { ok: false, status: 404, message: 'Përdoruesi nuk u gjet.' };
  if (profile.accountType !== 'individual' && profile.accountType !== 'business') {
    return { ok: false, status: 400, message: 'Vetëm përdoruesit e portalit mund të verifikohen.' };
  }

  const alreadyVerified = Boolean(profile.professionalsVerifiedAt || profile.jobsEmployerVerifiedAt);
  if (alreadyVerified) {
    return {
      ok: true,
      alreadyVerified: true,
      userId: profile.id,
      email: profile.email,
      verified: true,
      verifiedAt: profile.professionalsVerifiedAt || profile.jobsEmployerVerifiedAt,
    };
  }

  const now = new Date().toISOString();
  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      professionals_verified_at: now,
      jobs_employer_verified_at: now,
      updated_at: now,
    })
    .eq('id', profile.id);
  if (error) throw error;

  await closePendingVerificationRequests(profile.id, {
    adminId: admin?.id || admin?._id || null,
    now,
    note: reason,
  });

  try {
    const { notifyVerificationResult } = require('./user-notifications');
    await notifyVerificationResult({
      userId: profile.id,
      approved: true,
      adminNote: String(reason || '').trim(),
    });
  } catch (notifyErr) {
    console.warn('notifyVerificationResult:', notifyErr?.message || notifyErr);
  }

  return { ok: true, userId: profile.id, email: profile.email, verified: true, verifiedAt: now };
}

async function revokePortalVerification(userId) {
  const profile = await getProfileById(userId);
  if (!profile) return { ok: false, status: 404, message: 'Përdoruesi nuk u gjet.' };
  if (profile.accountType !== 'individual' && profile.accountType !== 'business') {
    return { ok: false, status: 400, message: 'Vetëm përdoruesit e portalit mund të verifikohen.' };
  }

  const wasVerified = Boolean(profile.professionalsVerifiedAt || profile.jobsEmployerVerifiedAt);
  if (!wasVerified) {
    return { ok: false, status: 400, message: 'Ky përdorues nuk është i verifikuar.' };
  }

  const now = new Date().toISOString();
  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      professionals_verified_at: null,
      jobs_employer_verified_at: null,
      updated_at: now,
    })
    .eq('id', profile.id);
  if (error) throw error;

  return { ok: true, userId: profile.id, email: profile.email, verified: false };
}

async function updatePortalUserByAdmin(userId, body = {}) {
  const profile = await getProfileById(userId);
  if (!profile) return { ok: false, status: 404, message: 'Përdoruesi nuk u gjet.' };
  if (profile.accountType !== 'individual' && profile.accountType !== 'business') {
    return { ok: false, status: 400, message: 'Vetëm llogaritë e portalit mund të përditësohen.' };
  }

  const isBusiness = profile.accountType === 'business';
  const patch = {};

  if (body.phone !== undefined) {
    patch.phone = String(body.phone ?? '').trim().slice(0, 40);
  }

  if (body.firstName !== undefined) {
    const firstName = String(body.firstName ?? '').trim().slice(0, 80);
    if (!firstName) return { ok: false, status: 400, message: 'Emri është i detyrueshëm.' };
    patch.firstName = firstName;
  }

  if (body.lastName !== undefined) {
    const lastName = String(body.lastName ?? '').trim().slice(0, 80);
    if (!lastName) return { ok: false, status: 400, message: 'Mbiemri është i detyrueshëm.' };
    patch.lastName = lastName;
  }

  if (body.isActive !== undefined) {
    patch.isActive = Boolean(body.isActive);
  }

  if (body.basedCityId !== undefined) {
    const based = await resolveBasedCity(body.basedCityId);
    if (!based.ok) return { ok: false, status: 400, message: based.message };
    if (!based.skipped) {
      patch.basedCityId = based.id;
      patch.basedCityName = based.name || '';
    }
  }

  if (body.avatarUrl !== undefined) {
    const avatarUrl = sanitizeAvatarUrl(body.avatarUrl);
    if (avatarUrl === null) {
      return { ok: false, status: 400, message: 'URL e fotos së profilit nuk është e vlefshme.' };
    }
    patch.avatarUrl = avatarUrl;
  }

  if (isBusiness) {
    if (body.businessName !== undefined) {
      const businessName = String(body.businessName ?? '').trim().slice(0, 120);
      if (!businessName) return { ok: false, status: 400, message: 'Emri i biznesit është i detyrueshëm.' };
      patch.businessName = businessName;
    }
    if (body.businessOwner !== undefined) {
      patch.businessOwner = String(body.businessOwner ?? '').trim().slice(0, 120);
    }
    if (body.businessCategory !== undefined) {
      patch.businessCategory = String(body.businessCategory ?? '').trim().slice(0, 80);
    }
  }

  if (body.email !== undefined) {
    const nextEmail = String(body.email ?? '').toLowerCase().trim();
    if (!nextEmail) return { ok: false, status: 400, message: 'Emaili nuk mund të jetë bosh.' };
    if (nextEmail !== profile.email) {
      const { data: taken } = await getSupabaseAdmin()
        .from('profiles')
        .select('id')
        .eq('email', nextEmail)
        .neq('id', profile.id)
        .maybeSingle();
      if (taken) return { ok: false, status: 400, message: 'Ky email është tashmë në përdorim.' };

      const { error: authError } = await getSupabaseAdmin().auth.admin.updateUserById(profile.id, {
        email: nextEmail,
      });
      if (authError) {
        if (/already.*registered|already.*exists/i.test(authError.message || '')) {
          return { ok: false, status: 400, message: 'Ky email është tashmë në përdorim.' };
        }
        throw authError;
      }
      patch.email = nextEmail;
    }
  }

  if (Object.keys(patch).length > 0) {
    const rowPatch = profileUpdateFromCamel(patch);
    const { error } = await getSupabaseAdmin().from('profiles').update(rowPatch).eq('id', profile.id);
    if (error) {
      if (error.code === '23505') {
        return { ok: false, status: 400, message: 'Ky NIPT ose email është tashmë i regjistruar.' };
      }
      throw error;
    }
  }

  if (body.nipt !== undefined || body.idNumber !== undefined) {
    const identity = await updatePortalUserIdentity(profile.id, {
      nipt: body.nipt,
      idNumber: body.idNumber,
    });
    if (!identity.ok) return identity;
  }

  const updated = await getProfileById(profile.id);
  return { ok: true, user: updated };
}

module.exports = {
  portalDirectoryExtras,
  formatPortalDirectoryUser,
  grantPortalVerification,
  revokePortalVerification,
  updatePortalUserByAdmin,
};

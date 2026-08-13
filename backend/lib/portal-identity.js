'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { getProfileById } = require('./profiles');

async function syncLatestVerificationNipt(applicantId, nextNipt) {
  const sb = getSupabaseAdmin();
  const { data: latestReq, error } = await sb
    .from('professional_verification_requests')
    .select('id, applicant_snapshot')
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!latestReq) return;

  const snap =
    latestReq.applicant_snapshot && typeof latestReq.applicant_snapshot === 'object'
      ? { ...latestReq.applicant_snapshot, nipt: nextNipt }
      : null;

  const { error: updateErr } = await sb
    .from('professional_verification_requests')
    .update({
      nipt: nextNipt,
      applicant_snapshot: snap,
      updated_at: new Date().toISOString(),
    })
    .eq('id', latestReq.id);
  if (updateErr) throw updateErr;
}

/**
 * Admin-only update for portal user NIPT (profiles) and ID number (latest verification request).
 */
async function updatePortalUserIdentity(userId, { nipt, idNumber } = {}) {
  const profile = await getProfileById(userId);
  if (!profile) return { ok: false, status: 404, message: 'Përdoruesi nuk u gjet.' };

  const accountType = profile.accountType;
  if (accountType !== 'individual' && accountType !== 'business') {
    return {
      ok: false,
      status: 400,
      message: 'Vetëm llogaritë e portalit (individ/biznes) mund të përditësohen.',
    };
  }

  const sb = getSupabaseAdmin();
  const result = { ok: true, email: profile.email, userId: profile.id, changes: {} };

  if (nipt !== undefined) {
    if (accountType !== 'business') {
      return { ok: false, status: 400, message: 'NIPT vlen vetëm për llogari biznesi.' };
    }
    const nextNipt = String(nipt ?? '').trim().slice(0, 40);
    if (!nextNipt) {
      return { ok: false, status: 400, message: 'NIPT nuk mund të jetë bosh.' };
    }
    const current = String(profile.nipt ?? '').trim();
    if (nextNipt !== current) {
      const { data: taken, error: takenErr } = await sb
        .from('profiles')
        .select('id')
        .eq('nipt', nextNipt)
        .neq('id', profile.id)
        .maybeSingle();
      if (takenErr) throw takenErr;
      if (taken) return { ok: false, status: 400, message: 'Ky NIPT është tashmë i regjistruar.' };

      profile.nipt = nextNipt;
      await profile.save();
      await syncLatestVerificationNipt(profile.id, nextNipt);
      result.changes.nipt = { before: current || null, after: nextNipt };
    }
  }

  if (idNumber !== undefined) {
    const nextId = String(idNumber ?? '').trim().slice(0, 40);
    if (!nextId) {
      return { ok: false, status: 400, message: 'Numri i ID-së nuk mund të jetë bosh.' };
    }

    const { data: latestReq, error: reqErr } = await sb
      .from('professional_verification_requests')
      .select('id, id_number')
      .eq('applicant_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!latestReq) {
      return {
        ok: false,
        status: 400,
        message: 'Përdoruesi nuk ka kërkesë verifikimi — ID mund të ndryshohet vetëm pas një kërkese.',
      };
    }

    const before = latestReq.id_number || '';
    if (nextId !== before) {
      const { error: updateErr } = await sb
        .from('professional_verification_requests')
        .update({ id_number: nextId, updated_at: new Date().toISOString() })
        .eq('id', latestReq.id);
      if (updateErr) throw updateErr;
      result.changes.idNumber = { before: before || null, after: nextId };
    }
  }

  if (Object.keys(result.changes).length === 0 && (nipt !== undefined || idNumber !== undefined)) {
    result.message = 'Asgjë nuk ndryshoi — vlerat ishin të njëjta.';
  }

  return result;
}

module.exports = { updatePortalUserIdentity };

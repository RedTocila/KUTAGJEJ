'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

const ANNOUNCE_COST = 3;
const TITLE_MAX = 80;
const SUBTITLE_MAX = 160;
const BANNER_URL_MAX = 2000;

function normalizeAnnouncementFields(body) {
  const title = String(body?.title ?? '').replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX);
  const subtitle = String(body?.subtitle ?? '').replace(/\s+/g, ' ').trim().slice(0, SUBTITLE_MAX) || null;
  const bannerUrl = String(body?.bannerUrl ?? '').trim().slice(0, BANNER_URL_MAX) || null;
  return { title, subtitle, bannerUrl };
}

/**
 * Create or update a business listing announcement.
 * - First publish or reAnnounce=true: charge 3 BC and bump listing to top (created_at).
 * - Edit existing without reAnnounce: free content update, no bump.
 */
async function upsertBusinessAnnouncement({ userId, listingId, title, subtitle, bannerUrl, reAnnounce }) {
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }
  if (!isUuid(String(listingId || ''))) {
    return { ok: false, status: 400, message: 'Njoftimi nuk është i vlefshëm.' };
  }

  const fields = normalizeAnnouncementFields({ title, subtitle, bannerUrl });
  if (!fields.title) {
    return { ok: false, status: 400, message: 'Titulli i njoftimit është i detyrueshëm.' };
  }

  const sb = getSupabaseAdmin();

  const { data: listing, error: listingErr } = await sb
    .from('directory_listings')
    .select(
      'id, poster_id, status, vertical, announcement_title, announcement_subtitle, announcement_banner_url, announcement_at',
    )
    .eq('id', listingId)
    .eq('vertical', 'businesses')
    .maybeSingle();
  if (listingErr) throw listingErr;
  if (!listing) {
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }
  if (String(listing.poster_id) !== String(userId)) {
    return { ok: false, status: 403, message: 'Nuk mund të ndryshoni këtë njoftim.' };
  }
  if (String(listing.status || '') !== 'approved') {
    return {
      ok: false,
      status: 400,
      message: 'Vetëm njoftimet e aprovuara mund të kenë shpallje.',
    };
  }

  const hadAnnouncement = Boolean(String(listing.announcement_title || '').trim());
  const shouldCharge = !hadAnnouncement || Boolean(reAnnounce);

  let boostCredits = null;
  let previousBalance = null;
  const now = new Date().toISOString();

  if (shouldCharge) {
    const { data: profile, error: profileErr } = await sb
      .from('profiles')
      .select('id, boost_credits')
      .eq('id', userId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) {
      return { ok: false, status: 401, message: 'Profili nuk u gjet.' };
    }

    previousBalance = Number(profile.boost_credits) || 0;
    if (previousBalance < ANNOUNCE_COST) {
      return {
        ok: false,
        status: 400,
        message: `Nuk keni mjaftueshëm Boost Coins. Duhet ${ANNOUNCE_COST} BC për shpallje.`,
      };
    }

    const { data: spent, error: spendErr } = await sb
      .from('profiles')
      .update({ boost_credits: previousBalance - ANNOUNCE_COST, updated_at: now })
      .eq('id', userId)
      .gte('boost_credits', ANNOUNCE_COST)
      .select('boost_credits')
      .maybeSingle();
    if (spendErr) throw spendErr;
    if (!spent) {
      return {
        ok: false,
        status: 400,
        message: `Nuk keni mjaftueshëm Boost Coins. Duhet ${ANNOUNCE_COST} BC për shpallje.`,
      };
    }
    boostCredits = Number(spent.boost_credits) || 0;
  } else {
    const { data: profile } = await sb.from('profiles').select('boost_credits').eq('id', userId).maybeSingle();
    boostCredits = Number(profile?.boost_credits) || 0;
  }

  const patch = {
    announcement_title: fields.title,
    announcement_subtitle: fields.subtitle,
    announcement_banner_url: fields.bannerUrl,
    updated_at: now,
  };
  if (shouldCharge) {
    patch.announcement_at = now;
    patch.created_at = now;
  }

  const { data: updated, error: updateErr } = await sb
    .from('directory_listings')
    .update(patch)
    .eq('id', listingId)
    .select(
      'id, announcement_title, announcement_subtitle, announcement_banner_url, announcement_at, created_at',
    )
    .maybeSingle();

  if (updateErr) {
    if (shouldCharge && previousBalance != null) {
      await sb
        .from('profiles')
        .update({ boost_credits: previousBalance, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
    throw updateErr;
  }
  if (!updated) {
    if (shouldCharge && previousBalance != null) {
      await sb
        .from('profiles')
        .update({ boost_credits: previousBalance, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }

  if (shouldCharge) {
    try {
      await sb.from('listing_auto_refresh').upsert(
        {
          user_id: userId,
          listing_kind: 'businesses',
          listing_id: listingId,
          last_refreshed_at: now,
          updated_at: now,
        },
        { onConflict: 'user_id,listing_kind,listing_id' },
      );
    } catch (refreshErr) {
      if (!String(refreshErr?.message || '').includes('listing_auto_refresh')) throw refreshErr;
    }
  }

  return {
    ok: true,
    charged: shouldCharge,
    cost: shouldCharge ? ANNOUNCE_COST : 0,
    boostCredits,
    refreshedAt: shouldCharge ? now : null,
    announcement: {
      title: updated.announcement_title || null,
      subtitle: updated.announcement_subtitle || null,
      bannerUrl: updated.announcement_banner_url || null,
      announcedAt: updated.announcement_at || null,
    },
  };
}

/**
 * Clear announcement fields without refunding Boost Coins.
 */
async function clearBusinessAnnouncement({ userId, listingId }) {
  if (!userId || !isUuid(String(userId))) {
    return { ok: false, status: 401, message: 'Auth required' };
  }
  if (!isUuid(String(listingId || ''))) {
    return { ok: false, status: 400, message: 'Njoftimi nuk është i vlefshëm.' };
  }

  const sb = getSupabaseAdmin();
  const { data: listing, error: listingErr } = await sb
    .from('directory_listings')
    .select('id, poster_id, vertical')
    .eq('id', listingId)
    .eq('vertical', 'businesses')
    .maybeSingle();
  if (listingErr) throw listingErr;
  if (!listing) {
    return { ok: false, status: 404, message: 'Njoftimi nuk u gjet.' };
  }
  if (String(listing.poster_id) !== String(userId)) {
    return { ok: false, status: 403, message: 'Nuk mund të ndryshoni këtë njoftim.' };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await sb
    .from('directory_listings')
    .update({
      announcement_title: null,
      announcement_subtitle: null,
      announcement_banner_url: null,
      announcement_at: null,
      updated_at: now,
    })
    .eq('id', listingId);
  if (updateErr) throw updateErr;

  return { ok: true };
}

module.exports = {
  ANNOUNCE_COST,
  upsertBusinessAnnouncement,
  clearBusinessAnnouncement,
  normalizeAnnouncementFields,
};

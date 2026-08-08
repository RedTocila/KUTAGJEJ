'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { isUuid } = require('./public-listings/query-helpers');

const PREF_KEYS = [
  'messages',
  'listing_saved',
  'listing_shared',
  'listing_hot_lead',
  'listing_status',
  'reviews',
  'reservations',
  'verification',
];

const TYPE_TO_PREF = {
  new_message: 'messages',
  listing_saved: 'listing_saved',
  listing_shared: 'listing_shared',
  listing_hot_lead: 'listing_hot_lead',
  listing_approved: 'listing_status',
  listing_rejected: 'listing_status',
  member_review: 'reviews',
  business_reservation: 'reservations',
  verification_approved: 'verification',
  verification_rejected: 'verification',
};

const DEFAULT_PREFS = Object.fromEntries(PREF_KEYS.map((k) => [k, true]));

const METRICS_KIND_TO_TABLE = {
  'real-estate': { table: 'real_estate_listings', titleCols: ['title'] },
  car: { table: 'car_listings', titleCols: ['make', 'model'] },
  job: { table: 'job_listings', titleCols: ['title'] },
  marketplace: { table: 'marketplace_listings', titleCols: ['title'] },
  businesses: { table: 'directory_listings', titleCols: ['title'], vertical: 'businesses' },
  professionals: { table: 'directory_listings', titleCols: ['title'], vertical: 'professionals' },
};

function formatPreferences(row) {
  const out = { ...DEFAULT_PREFS };
  if (!row) return out;
  for (const key of PREF_KEYS) {
    if (typeof row[key] === 'boolean') out[key] = row[key];
  }
  return out;
}

function formatNotification(doc) {
  return {
    id: String(doc.id),
    type: doc.type,
    title: doc.title || '',
    message: doc.message || '',
    refKind: doc.ref_kind || '',
    refId: doc.ref_id ? String(doc.ref_id) : null,
    actorId: doc.actor_id ? String(doc.actor_id) : null,
    actorName: doc.actor_name || null,
    href: doc.href || null,
    readAt: doc.read_at ?? null,
    createdAt: doc.created_at,
  };
}

async function getPreferences(userId) {
  const id = String(userId || '').trim();
  if (!isUuid(id)) return { ...DEFAULT_PREFS };
  const { data, error } = await getSupabaseAdmin()
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', id)
    .maybeSingle();
  if (error) {
    // Table may not exist until migration/repair is applied.
    if (/relation .* does not exist|Could not find the table/i.test(String(error.message || ''))) {
      return { ...DEFAULT_PREFS };
    }
    throw error;
  }
  return formatPreferences(data);
}

async function upsertPreferences(userId, patch) {
  const id = String(userId || '').trim();
  if (!isUuid(id)) throw new Error('Invalid user id');

  const next = { ...DEFAULT_PREFS };
  const current = await getPreferences(id);
  Object.assign(next, current);

  for (const key of PREF_KEYS) {
    if (typeof patch?.[key] === 'boolean') next[key] = patch[key];
  }

  const row = {
    user_id: id,
    ...next,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await getSupabaseAdmin()
    .from('user_notification_preferences')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return formatPreferences(data);
}

async function displayNameForUserId(userId) {
  const id = String(userId || '').trim();
  if (!isUuid(id)) return null;
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('account_type, first_name, last_name, business_name, business_owner')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (data.account_type === 'business') {
    return (
      (data.business_name && String(data.business_name).trim()) ||
      (data.business_owner && String(data.business_owner).trim()) ||
      `${data.first_name || ''} ${data.last_name || ''}`.replace(/\s+/g, ' ').trim() ||
      null
    );
  }
  return `${data.first_name || ''} ${data.last_name || ''}`.replace(/\s+/g, ' ').trim() || null;
}

async function loadListingOwnerBrief(metricsKind, listingId) {
  const cfg = METRICS_KIND_TO_TABLE[metricsKind];
  if (!cfg || !isUuid(listingId)) return null;
  let q = getSupabaseAdmin()
    .from(cfg.table)
    .select(['id', 'poster_id', ...cfg.titleCols].join(', '))
    .eq('id', listingId);
  if (cfg.vertical) q = q.eq('vertical', cfg.vertical);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data?.poster_id) return null;

  let title = '';
  if (metricsKind === 'car') {
    title = `${data.make || ''} ${data.model || ''}`.trim();
  } else {
    title = String(data.title || '').trim();
  }

  return {
    listingId: String(data.id),
    posterId: String(data.poster_id),
    title: title || 'Njoftimi',
  };
}

/**
 * Creates an in-app notification if the recipient has the related preference enabled.
 * Never throws to callers — failures are logged so product flows keep working.
 */
async function createUserNotification({
  userId,
  type,
  title,
  message,
  refKind = '',
  refId = null,
  actorId = null,
  actorName = null,
  href = null,
}) {
  try {
    const recipientId = String(userId || '').trim();
    if (!isUuid(recipientId) || !type || !title) return null;
    if (actorId && String(actorId) === recipientId) return null;

    const prefKey = TYPE_TO_PREF[type];
    if (prefKey) {
      const prefs = await getPreferences(recipientId);
      if (!prefs[prefKey]) return null;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('user_notifications')
      .insert({
        user_id: recipientId,
        type,
        title: String(title).slice(0, 200),
        message: String(message || '').slice(0, 1000),
        ref_kind: refKind || '',
        ref_id: refId && isUuid(String(refId)) ? String(refId) : null,
        actor_id: actorId && isUuid(String(actorId)) ? String(actorId) : null,
        actor_name: actorName ? String(actorName).slice(0, 120) : null,
        href: href ? String(href).slice(0, 500) : null,
      })
      .select('*')
      .single();
    if (error) {
      if (/relation .* does not exist|Could not find the table/i.test(String(error.message || ''))) {
        return null;
      }
      throw error;
    }
    return formatNotification(data);
  } catch (err) {
    console.warn('createUserNotification:', err?.message || err);
    return null;
  }
}

/** Public listing detail path from metrics kind (id fallback — permalink resolver accepts uuid). */
function listingPublicHrefFromMetrics(metricsKind, listingId) {
  const id = encodeURIComponent(String(listingId || '').trim());
  if (!id) return null;
  switch (String(metricsKind || '')) {
    case 'real-estate':
      return `/prona/${id}`;
    case 'car':
      return `/makina/${id}`;
    case 'job':
      return `/pune/${id}`;
    case 'marketplace':
      return `/tregu/${id}`;
    case 'businesses':
      return `/biznese/${id}`;
    case 'professionals':
      return `/profesioniste/${id}`;
    default:
      return null;
  }
}

async function notifyNewMessage({
  recipientId,
  conversationId,
  senderId,
  senderName,
  listingTitle,
  preview,
}) {
  const name = senderName || (await displayNameForUserId(senderId)) || 'Dikush';
  const listingBit = listingTitle ? ` për «${listingTitle}»` : '';
  const title = `Mesazh i ri nga ${name}`;
  const message = preview
    ? String(preview).slice(0, 180)
    : `${name} ju dërgoi një mesazh${listingBit}.`;
  const href = conversationId
    ? `/user/dashboard/mesazhet?c=${encodeURIComponent(conversationId)}`
    : '/user/dashboard/mesazhet';

  // Stack unread messages from the same sender into one notification.
  const recipient = String(recipientId || '').trim();
  const actor = senderId && isUuid(String(senderId)) ? String(senderId) : null;
  if (isUuid(recipient) && actor) {
    try {
      const { data: existingRows, error: selErr } = await getSupabaseAdmin()
        .from('user_notifications')
        .select('id')
        .eq('user_id', recipient)
        .eq('type', 'new_message')
        .eq('actor_id', actor)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(1);
      const existing = existingRows?.[0];
      if (!selErr && existing?.id) {
        const now = new Date().toISOString();
        const { data: updated, error: updErr } = await getSupabaseAdmin()
          .from('user_notifications')
          .update({
            title: String(title).slice(0, 200),
            message: String(message || '').slice(0, 1000),
            actor_name: String(name).slice(0, 120),
            ref_kind: 'conversation',
            ref_id: conversationId && isUuid(String(conversationId)) ? String(conversationId) : null,
            href: href ? String(href).slice(0, 500) : null,
            created_at: now,
            updated_at: now,
          })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (!updErr && updated) return formatNotification(updated);
      }
    } catch (err) {
      console.warn('notifyNewMessage stack:', err?.message || err);
    }
  }

  return createUserNotification({
    userId: recipientId,
    type: 'new_message',
    title,
    message,
    refKind: 'conversation',
    refId: conversationId,
    actorId: senderId,
    actorName: name,
    href,
  });
}

async function notifyListingSaved({ metricsKind, listingId, saverId }) {
  const brief = await loadListingOwnerBrief(metricsKind, listingId);
  if (!brief) return null;
  if (String(brief.posterId) === String(saverId)) return null;

  // Save-lead alerts are a Grow / Elite perk only.
  const { posterHasTrustBadge } = require('./public-listings/load-poster-brief');
  const entitled = await posterHasTrustBadge(brief.posterId);
  if (!entitled) return null;

  const saverName = (await displayNameForUserId(saverId)) || 'Dikush';
  const listingHref = listingPublicHrefFromMetrics(metricsKind, listingId);
  return createUserNotification({
    userId: brief.posterId,
    type: 'listing_saved',
    title: `${saverName} ruajti njoftimin tuaj`,
    message: `«${brief.title}» u shtua te të ruajturat.`,
    refKind: metricsKind,
    refId: listingId,
    actorId: saverId,
    actorName: saverName,
    href: listingHref,
  });
}

async function notifyListingShared({ metricsKind, listingId, sharerId }) {
  const brief = await loadListingOwnerBrief(metricsKind, listingId);
  if (!brief) return null;
  if (String(brief.posterId) === String(sharerId)) return null;

  // Share-lead alerts are a Grow / Elite perk only.
  const { posterHasTrustBadge } = require('./public-listings/load-poster-brief');
  const entitled = await posterHasTrustBadge(brief.posterId);
  if (!entitled) return null;

  const sharerName = (await displayNameForUserId(sharerId)) || 'Dikush';
  const listingHref = listingPublicHrefFromMetrics(metricsKind, listingId);
  return createUserNotification({
    userId: brief.posterId,
    type: 'listing_shared',
    title: `${sharerName} ndau njoftimin tuaj`,
    message: `«${brief.title}» u nda.`,
    refKind: metricsKind,
    refId: listingId,
    actorId: sharerId,
    actorName: sharerName,
    href: listingHref,
  });
}

/**
 * Hot-interest lead: engagement combo (dwell / photos / contact scroll / return visit).
 * Actor identity only when the visitor is signed in (contactable).
 */
async function notifyListingHotLead({ metricsKind, listingId, viewerId = null }) {
  const brief = await loadListingOwnerBrief(metricsKind, listingId);
  if (!brief) return null;
  if (viewerId && String(brief.posterId) === String(viewerId)) return null;

  // Hot-lead alerts are a Grow / Elite perk only.
  const { posterHasTrustBadge } = require('./public-listings/load-poster-brief');
  const entitled = await posterHasTrustBadge(brief.posterId);
  if (!entitled) return null;

  const actorId = viewerId && isUuid(String(viewerId)) ? String(viewerId) : null;
  const actorName = actorId ? (await displayNameForUserId(actorId)) || 'Dikush' : null;
  const listingHref = listingPublicHrefFromMetrics(metricsKind, listingId);

  return createUserNotification({
    userId: brief.posterId,
    type: 'listing_hot_lead',
    title: actorName ? `${actorName} tregoi interes të lartë` : 'Interes i lartë për njoftimin',
    message: actorName
      ? `${actorName} shikoi me kujdes «${brief.title}».`
      : `Dikush shikoi me kujdes «${brief.title}».`,
    refKind: metricsKind,
    refId: listingId,
    actorId,
    actorName,
    href: listingHref,
  });
}

async function notifyListingStatus({ posterId, listingKind, listingId, listingTitle, approved }) {
  const title = listingTitle || 'Njoftimi juaj';
  return createUserNotification({
    userId: posterId,
    type: approved ? 'listing_approved' : 'listing_rejected',
    title: approved ? 'Njoftimi u aprovua' : 'Njoftimi u refuzua',
    message: approved
      ? `«${title}» është publik tani.`
      : `«${title}» nuk u aprovua. Kontrolloni njoftimet e mia për detaje.`,
    refKind: listingKind,
    refId: listingId,
    href: '/user/dashboard/shpalljet-e-mia',
  });
}

async function notifyMemberReview({ memberId, reviewerId, rating }) {
  const reviewerName = (await displayNameForUserId(reviewerId)) || 'Dikush';
  return createUserNotification({
    userId: memberId,
    type: 'member_review',
    title: `${reviewerName} la një vlerësim`,
    message: `${reviewerName} ju vlerësoi me ${rating} ${rating === 1 ? 'yll' : 'yje'}.`,
    refKind: 'member',
    refId: memberId,
    actorId: reviewerId,
    actorName: reviewerName,
    href: `/anetares/${encodeURIComponent(memberId)}`,
  });
}

async function notifyBusinessReservation({ posterId, listingId, listingTitle, guestName, reservationDate, timeSlot }) {
  const guest = guestName || 'Dikush';
  const when = [reservationDate, timeSlot].filter(Boolean).join(' · ');
  return createUserNotification({
    userId: posterId,
    type: 'business_reservation',
    title: `Rezervim i ri nga ${guest}`,
    message: when
      ? `${guest} rezervoi te «${listingTitle || 'biznesi juaj'}» — ${when}.`
      : `${guest} bëri një rezervim te «${listingTitle || 'biznesi juaj'}».`,
    refKind: 'businesses',
    refId: listingId,
    actorName: guest,
    href: '/user/dashboard/biznese',
  });
}

async function notifyVerificationResult({ userId, approved }) {
  return createUserNotification({
    userId,
    type: approved ? 'verification_approved' : 'verification_rejected',
    title: approved ? 'Verifikimi u aprovua' : 'Verifikimi u refuzua',
    message: approved
      ? 'Llogaria juaj është e verifikuar. Shenja e besimit do të shfaqet te profili dhe njoftimet.'
      : 'Kërkesa për verifikim nuk u aprovua. Mund të provoni përsëri nga profili.',
    refKind: 'verification',
    refId: userId,
    href: '/user/dashboard/profili',
  });
}

module.exports = {
  PREF_KEYS,
  DEFAULT_PREFS,
  TYPE_TO_PREF,
  formatNotification,
  formatPreferences,
  getPreferences,
  upsertPreferences,
  displayNameForUserId,
  createUserNotification,
  notifyNewMessage,
  notifyListingSaved,
  notifyListingShared,
  notifyListingHotLead,
  notifyListingStatus,
  notifyMemberReview,
  notifyBusinessReservation,
  notifyVerificationResult,
};

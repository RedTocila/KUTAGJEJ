'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { addBoostCredits } = require('./apply-payment');
const { getProductSpec } = require('./revenuecat-products');

/**
 * Grant entitlements from a RevenueCat / App Store purchase.
 * Idempotent on `eventId` via `iap_processed_events`.
 *
 * @param {{
 *   eventId: string,
 *   eventType: string,
 *   appUserId: string,
 *   productId: string,
 *   transactionId?: string | null,
 *   price?: number | null,
 *   currency?: string | null,
 *   expirationAtMs?: number | null,
 * }} params
 */
async function grantRevenueCatPurchase(params) {
  const eventId = String(params.eventId || '').trim();
  const appUserId = String(params.appUserId || '').trim();
  const productId = String(params.productId || '').trim();
  const eventType = String(params.eventType || '').trim();

  if (!eventId || !appUserId || !productId) {
    return { ok: false, status: 400, message: 'Missing eventId, appUserId, or productId' };
  }

  const spec = getProductSpec(productId);
  if (!spec) {
    return { ok: false, status: 400, message: `Unknown product: ${productId}` };
  }

  const sb = getSupabaseAdmin();

  // Already processed — idempotent success.
  const { data: existing, error: exErr } = await sb
    .from('iap_processed_events')
    .select('event_id, payment_id')
    .eq('event_id', eventId)
    .maybeSingle();
  if (exErr) throw exErr;
  if (existing) {
    return { ok: true, duplicate: true, paymentId: existing.payment_id };
  }

  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, email, first_name, last_name, account_type, role')
    .eq('id', appUserId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!profile) {
    return { ok: false, status: 404, message: `No profile for app_user_id ${appUserId}` };
  }

  const amount =
    params.price != null && Number.isFinite(Number(params.price))
      ? Number(params.price)
      : Number(spec.priceEur) || 0;
  const currency = String(params.currency || 'EUR').toUpperCase() || 'EUR';

  const paymentInsert = {
    payer_id: profile.id,
    payer_email: profile.email || '',
    payer_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim(),
    type: spec.kind === 'auto-refresh' ? 'auto-refresh' : spec.kind,
    description: spec.description,
    amount_minor: Math.round(amount * 100),
    amount,
    currency,
    pok_env: 'apple_iap',
    pok_order_id: params.transactionId || null,
    pok_status: eventType,
    status: 'paid',
    granted: false,
    paid_at: new Date().toISOString(),
    metadata: {
      source: 'apple_iap',
      revenueCatEventId: eventId,
      revenueCatEventType: eventType,
      productId,
      storeTransactionId: params.transactionId || null,
    },
    updated_at: new Date().toISOString(),
  };

  const { data: payment, error: payErr } = await sb
    .from('payments')
    .insert(paymentInsert)
    .select('*')
    .single();
  if (payErr) throw payErr;

  try {
    if (spec.kind === 'subscription') {
      await grantAppleSubscription(profile, spec, payment, params.expirationAtMs);
    } else if (spec.kind === 'credits') {
      await addBoostCredits(profile.id, Number(spec.credits) || 0);
      payment.metadata.credits = Number(spec.credits) || 0;
    } else if (spec.kind === 'premium') {
      await grantApplePremium(profile.id, spec, payment.id);
    } else if (spec.kind === 'okazion') {
      await grantAppleOkazion(profile.id, spec, payment.id);
    } else if (spec.kind === 'auto-refresh') {
      await grantAppleAutoRefresh(profile.id, Number(spec.autoRefreshSlots) || 0);
    }

    const { error: markErr } = await sb
      .from('payments')
      .update({
        granted: true,
        metadata: payment.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);
    if (markErr) throw markErr;

    const { error: evErr } = await sb.from('iap_processed_events').insert({
      event_id: eventId,
      user_id: profile.id,
      product_id: productId,
      event_type: eventType,
      payment_id: payment.id,
    });
    // Unique race: another worker won — treat as success.
    if (evErr && !/duplicate|unique/i.test(String(evErr.message || ''))) throw evErr;

    return { ok: true, paymentId: payment.id, kind: spec.kind };
  } catch (err) {
    console.error('[iap] grant failed', eventId, err?.message || err);
    throw err;
  }
}

async function grantAppleSubscription(profile, spec, payment, expirationAtMs) {
  const sb = getSupabaseAdmin();
  const isBusiness =
    profile.account_type === 'business' || profile.role === 'business-user';
  const kind = isBusiness ? 'company' : 'agent';

  const { data: contract, error: cErr } = await sb
    .from('contracts')
    .select('*')
    .eq('plan_code', spec.planCode)
    .eq('subscriber_kind', kind)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!contract) {
    const err = new Error(`Elite/Grow/Starter contract missing for ${spec.planCode}/${kind}`);
    err.statusCode = 500;
    throw err;
  }

  const months = Number(spec.months) || 1;
  const now = new Date();
  let expiresAt;
  if (expirationAtMs && Number.isFinite(Number(expirationAtMs))) {
    expiresAt = new Date(Number(expirationAtMs));
  } else {
    expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);
  }

  const boost =
    contract && Number.isFinite(Number(contract.boost_credits))
      ? Number(contract.boost_credits)
      : 0;

  await sb
    .from('user_subscriptions')
    .update({ status: 'canceled', updated_at: now.toISOString() })
    .eq('user_id', profile.id)
    .eq('status', 'active');

  const insertRow = {
    user_id: profile.id,
    contract_id: contract.id,
    contract_title: contract.title || String(spec.planCode).toUpperCase(),
    listing_category_key: contract.listing_category_key ?? null,
    subscriber_kind: contract.subscriber_kind ?? kind,
    months,
    price_eur: Number(payment.amount) || Number(spec.priceEur) || 0,
    refresh_every_hours: contract.refresh_every_hours ?? null,
    glow_badge_enabled: Boolean(contract.glow_badge_enabled),
    boost_credits_granted: boost,
    daily_boost_access: Boolean(contract.daily_boost_access),
    plan_code: contract.plan_code,
    max_list_all_categories: Number(contract.max_list_all_categories) || 0,
    max_job_listings: Number(contract.max_job_listings) || 0,
    max_car_listings: Number(contract.max_car_listings) || 0,
    max_apartment_listings: Number(contract.max_apartment_listings) || 0,
    max_product_listings: Number(contract.max_product_listings) || 0,
    max_premium_listings: Number(contract.max_premium_listings) || 0,
    max_okazion_listings: Number(contract.max_okazion_listings) || 0,
    used_job_listings: 0,
    used_car_listings: 0,
    used_apartment_listings: 0,
    used_product_listings: 0,
    used_premium_listings: 0,
    used_okazion_listings: 0,
    starts_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    status: 'active',
    payment_id: payment.id,
  };

  let { data: sub, error: subErr } = await sb
    .from('user_subscriptions')
    .insert(insertRow)
    .select('id')
    .single();
  if (subErr && /used_.*_listings/i.test(String(subErr.message || ''))) {
    const {
      used_job_listings: _j,
      used_car_listings: _c,
      used_apartment_listings: _a,
      used_product_listings: _p,
      used_premium_listings: _pr,
      used_okazion_listings: _o,
      ...rest
    } = insertRow;
    ({ data: sub, error: subErr } = await sb.from('user_subscriptions').insert(rest).select('id').single());
  }
  if (subErr) throw subErr;

  payment.metadata.subscriptionId = sub.id;
  payment.metadata.contractId = contract.id;
  payment.metadata.planCode = contract.plan_code;

  if (boost > 0) {
    await addBoostCredits(profile.id, boost);
  }
}

async function grantApplePremium(userId, spec, paymentId) {
  const { createPremiumVoucher } = require('./premium-listing');
  const created = await createPremiumVoucher({
    userId,
    packageId: spec.premiumPackageId,
    source: 'card',
    paymentId,
    priceEur: spec.priceEur,
  });
  if (!created.ok) {
    const err = new Error(created.message || 'Premium voucher failed');
    err.statusCode = created.status || 400;
    throw err;
  }
}

async function grantAppleOkazion(userId, spec, paymentId) {
  const { createOkazionVoucher, clampQuantity } = require('./okazion-listing');
  const qty = clampQuantity(spec.okazionQuantity || 1);
  const created = await createOkazionVoucher({
    userId,
    packageId: spec.okazionPackageId,
    source: 'card',
    paymentId,
    priceEur: spec.priceEur,
  });
  if (!created.ok) {
    const err = new Error(created.message || 'Okazion voucher failed');
    err.statusCode = created.status || 400;
    throw err;
  }
  return qty;
}

async function grantAppleAutoRefresh(userId, slots) {
  if (slots <= 0) return;
  const sb = getSupabaseAdmin();
  const { data: profile, error } = await sb
    .from('profiles')
    .select('auto_refresh_slots')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return;
  const { error: updErr } = await sb
    .from('profiles')
    .update({
      auto_refresh_slots: (Number(profile.auto_refresh_slots) || 0) + slots,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (updErr) throw updErr;
}

/**
 * Mark the user's active paid subscription expired when Apple says so.
 */
async function expireAppleSubscription(appUserId, productId) {
  const spec = getProductSpec(productId);
  if (!spec || spec.kind !== 'subscription') {
    return { ok: true, skipped: true };
  }
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await sb
    .from('user_subscriptions')
    .update({ status: 'expired', updated_at: now })
    .eq('user_id', appUserId)
    .eq('plan_code', spec.planCode)
    .eq('status', 'active');
  if (error) throw error;
  return { ok: true };
}

module.exports = {
  grantRevenueCatPurchase,
  expireAppleSubscription,
};

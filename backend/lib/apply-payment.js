'use strict';

const crypto = require('crypto');
const { getSupabaseAdmin } = require('./supabase');
const { pokCaptureMatchesPayment } = require('./pok-client');

const CLAIM_STALE_SECONDS = 45;
const CLAIM_WAIT_ATTEMPTS = 8;
const CLAIM_WAIT_MS = 40;

function mapPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    payerId: row.payer_id,
    payerEmail: row.payer_email || '',
    payerName: row.payer_name || '',
    type: row.type,
    description: row.description || '',
    amountMinor: row.amount_minor,
    amount: row.amount != null ? Number(row.amount) : null,
    currency: row.currency || 'EUR',
    pokEnv: row.pok_env,
    pokOrderId: row.pok_order_id,
    pokStatus: row.pok_status,
    status: row.status,
    granted: Boolean(row.granted),
    metadata: row.metadata && typeof row.metadata === 'object' ? { ...row.metadata } : {},
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUniqueViolation(error) {
  const code = String(error?.code || '');
  const msg = String(error?.message || '');
  return code === '23505' || /duplicate key|unique constraint/i.test(msg);
}

function firstRpcRow(data) {
  if (!data) return null;
  return Array.isArray(data) ? data[0] || null : data;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPayment(sb, paymentId) {
  const { data: row, error } = await sb.from('payments').select('*').eq('id', paymentId).maybeSingle();
  if (error) throw error;
  if (!row) {
    const err = new Error('Pagesa nuk u gjet.');
    err.statusCode = 404;
    throw err;
  }
  return mapPayment(row);
}

async function claimPayment(sb, paymentId) {
  const token = crypto.randomBytes(16).toString('hex');
  const { data, error } = await sb.rpc('claim_payment_fulfillment', {
    p_payment_id: paymentId,
    p_token: token,
    p_stale_seconds: CLAIM_STALE_SECONDS,
  });
  if (error) throw error;
  const row = firstRpcRow(data);
  if (!row || row.fulfillment_claim !== token) return null;
  return { token, payment: mapPayment(row) };
}

async function releasePaymentClaim(sb, paymentId, token) {
  const { error } = await sb
    .from('payments')
    .update({
      fulfillment_claim: null,
      fulfillment_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('fulfillment_claim', token)
    .eq('granted', false);
  if (error) throw error;
}

/**
 * One profile counter per payment. The database function inserts the side-effect
 * row and updates the profile in a single transaction.
 */
async function applyProfileCounterOnce(sb, { userId, paymentId, effectKey, column, amount }) {
  const delta = Number(amount);
  if (!userId || !paymentId || !effectKey || !Number.isFinite(delta) || delta === 0) return false;
  const { data, error } = await sb.rpc('apply_profile_counter_once', {
    p_user_id: userId,
    p_payment_id: paymentId,
    p_effect_key: effectKey,
    p_column: column,
    p_amount: delta,
  });
  if (error) throw error;
  return Boolean(data);
}

/**
 * Confirm a payment against POK and, if the captured total matches, grant what was bought.
 * Safe when the webhook and the user verify request overlap: a database claim
 * lets only one worker grant, and each side effect is keyed by the payment id.
 *
 * `pokClient` is injected to avoid a hard dependency cycle and ease testing.
 * Returns the up-to-date Payment-shaped object.
 */
async function confirmAndApplyPayment(paymentId, pokClient) {
  const sb = getSupabaseAdmin();

  for (let attempt = 0; attempt < CLAIM_WAIT_ATTEMPTS; attempt += 1) {
    const outcome = await attemptConfirmPayment(sb, paymentId, pokClient);
    if (outcome.done) return outcome.payment;
    await delay(CLAIM_WAIT_MS);
  }

  return loadPayment(sb, paymentId);
}

async function attemptConfirmPayment(sb, paymentId, pokClient) {
  let payment = await loadPayment(sb, paymentId);

  if (payment.status === 'paid' && payment.granted) {
    return { done: true, payment };
  }
  if (!payment.pokOrderId) {
    const err = new Error('Kjo pagesë nuk ka porosi POK.');
    err.statusCode = 400;
    throw err;
  }

  const order = await pokClient.getSdkOrder(payment.pokOrderId);
  payment.pokStatus = order.status || payment.pokStatus;
  const match = pokCaptureMatchesPayment(payment, order);

  if (!match.ok && match.reason === 'status') {
    const { data: updated, error: updErr } = await sb
      .from('payments')
      .update({
        pok_status: payment.pokStatus || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .select('*')
      .single();
    if (updErr) throw updErr;
    return { done: true, payment: mapPayment(updated) };
  }

  if (!match.ok) {
    // Paid at the provider, but not for this order's amount or currency.
    // Do not grant and do not mark the row paid.
    console.error(
      `Payment ${payment.id}: refusing fulfillment (${match.reason})`,
      match.reason === 'amount'
        ? `capturedCents=${match.capturedCents} expectedCents=${match.expectedCents}`
        : `currency=${match.currency} expected=${match.expectedCurrency}`,
    );
    const metadata = { ...(payment.metadata || {}), fulfillmentBlocked: match.reason };
    const { data: updated, error: updErr } = await sb
      .from('payments')
      .update({
        pok_status: payment.pokStatus || '',
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .eq('granted', false)
      .select('*')
      .single();
    if (updErr) throw updErr;
    return { done: true, payment: mapPayment(updated) };
  }

  const claim = await claimPayment(sb, paymentId);
  if (!claim) {
    const current = await loadPayment(sb, paymentId);
    if (current.status === 'paid' && current.granted) return { done: true, payment: current };
    return { done: false };
  }

  payment = claim.payment;
  payment.pokStatus = order.status || payment.pokStatus;
  try {
    if (payment.type === 'subscription') {
      await grantSubscription(payment);
    } else if (payment.type === 'credits') {
      await grantCredits(payment);
    } else if (payment.type === 'auto-refresh') {
      await grantAutoRefreshSlots(payment);
    } else if (payment.type === 'premium') {
      await grantPremiumVoucher(payment);
    } else if (payment.type === 'okazion') {
      await grantOkazionVouchers(payment);
    }
    payment.granted = true;
    payment.status = 'paid';
    if (!payment.paidAt) payment.paidAt = new Date().toISOString();
    if (payment.metadata) delete payment.metadata.fulfillmentBlocked;

    const { data: saved, error: saveErr } = await sb
      .from('payments')
      .update({
        status: 'paid',
        paid_at: payment.paidAt,
        granted: true,
        pok_status: payment.pokStatus || '',
        metadata: payment.metadata || {},
        fulfillment_claim: null,
        fulfillment_claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)
      .eq('fulfillment_claim', claim.token)
      .select('*')
      .maybeSingle();
    if (saveErr) throw saveErr;
    if (!saved) {
      const err = new Error('Payment claim lost before fulfillment was saved.');
      err.statusCode = 409;
      throw err;
    }
    return { done: true, payment: mapPayment(saved) };
  } catch (err) {
    await releasePaymentClaim(sb, payment.id, claim.token).catch((releaseErr) => {
      console.error('release payment claim:', releaseErr?.message || releaseErr);
    });
    throw err;
  }
}

async function grantSubscription(payment) {
  const sb = getSupabaseAdmin();
  const { data: existing, error: existingErr } = await sb
    .from('user_subscriptions')
    .select('id, boost_credits_granted')
    .eq('payment_id', payment.id)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) {
    payment.metadata.subscriptionId = existing.id;
    const boostExisting = Number(existing.boost_credits_granted) || 0;
    if (boostExisting > 0) {
      await applyProfileCounterOnce(sb, {
        userId: payment.payerId,
        paymentId: payment.id,
        effectKey: 'boost_credits',
        column: 'boost_credits',
        amount: boostExisting,
      });
    }
    return;
  }

  const contractId = payment.metadata?.contractId || null;
  let contract = null;
  if (contractId) {
    const { data, error } = await sb.from('contracts').select('*').eq('id', contractId).maybeSingle();
    if (error) throw error;
    contract = data;
  }

  const months = Number(payment.metadata?.months) || 1;
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + months);

  const boost =
    contract && Number.isFinite(Number(contract.boost_credits))
      ? Number(contract.boost_credits)
      : 0;

  await sb
    .from('user_subscriptions')
    .update({ status: 'canceled', updated_at: now.toISOString() })
    .eq('user_id', payment.payerId)
    .eq('status', 'active');

  const insertRow = {
    user_id: payment.payerId,
    contract_id: contractId || (contract ? contract.id : null),
    contract_title: contract?.title || payment.metadata?.contractTitle || '',
    listing_category_key: contract?.listing_category_key ?? null,
    subscriber_kind: contract?.subscriber_kind ?? null,
    months,
    price_eur: payment.amount,
    refresh_every_hours: contract?.refresh_every_hours ?? null,
    glow_badge_enabled: Boolean(contract?.glow_badge_enabled),
    boost_credits_granted: boost,
    daily_boost_access: Boolean(contract?.daily_boost_access),
    plan_code: contract?.plan_code ?? null,
    max_list_all_categories: Number(contract?.max_list_all_categories) || 0,
    max_job_listings: Number(contract?.max_job_listings) || 0,
    max_car_listings: Number(contract?.max_car_listings) || 0,
    max_apartment_listings: Number(contract?.max_apartment_listings) || 0,
    max_product_listings: Number(contract?.max_product_listings) || 0,
    max_premium_listings: Number(contract?.max_premium_listings) || 0,
    max_okazion_listings: Number(contract?.max_okazion_listings) || 0,
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
  if (subErr && isUniqueViolation(subErr)) {
    const { data: won, error: wonErr } = await sb
      .from('user_subscriptions')
      .select('id')
      .eq('payment_id', payment.id)
      .maybeSingle();
    if (wonErr) throw wonErr;
    sub = won;
    subErr = null;
  }
  if (subErr) throw subErr;

  payment.metadata.subscriptionId = sub.id;

  if (boost > 0) {
    await applyProfileCounterOnce(sb, {
      userId: payment.payerId,
      paymentId: payment.id,
      effectKey: 'boost_credits',
      column: 'boost_credits',
      amount: boost,
    });
  }
}

async function grantCredits(payment) {
  const credits = Number(payment.metadata?.credits) || 0;
  if (credits > 0) {
    await applyProfileCounterOnce(getSupabaseAdmin(), {
      userId: payment.payerId,
      paymentId: payment.id,
      effectKey: 'boost_credits',
      column: 'boost_credits',
      amount: credits,
    });
  }
}

async function grantAutoRefreshSlots(payment) {
  const slots = Math.max(0, Math.floor(Number(payment.metadata?.autoRefreshSlots) || 0));
  if (slots <= 0 || !payment.payerId) return;
  await applyProfileCounterOnce(getSupabaseAdmin(), {
    userId: payment.payerId,
    paymentId: payment.id,
    effectKey: 'auto_refresh_slots',
    column: 'auto_refresh_slots',
    amount: slots,
  });
}

async function grantPremiumVoucher(payment) {
  const packageId = payment.metadata?.premiumPackageId;
  if (!packageId || !payment.payerId) return;
  const { createPremiumVoucher } = require('./premium-listing');
  const created = await createPremiumVoucher({
    userId: payment.payerId,
    packageId: String(packageId),
    source: 'card',
    paymentId: payment.id,
    priceEur: payment.amount,
    priceBc: Number(payment.metadata?.premiumPriceBc) || null,
  });
  if (!created.ok) {
    const err = new Error(created.message || 'Nuk u krijua voucher Premium.');
    err.statusCode = created.status || 400;
    throw err;
  }
  payment.metadata.premiumVoucherId = created.voucher.id;
}

async function grantOkazionVouchers(payment) {
  const packageId = payment.metadata?.okazionPackageId;
  if (!packageId || !payment.payerId) return;
  const { createOkazionVoucher, clampQuantity } = require('./okazion-listing');
  const qty = clampQuantity(payment.metadata?.okazionQuantity || 1);
  const unitEur =
    payment.metadata?.okazionUnitPriceEur != null
      ? Number(payment.metadata.okazionUnitPriceEur)
      : Number(payment.amount) / qty;
  const voucherIds = [];
  for (let i = 0; i < qty; i += 1) {
    const created = await createOkazionVoucher({
      userId: payment.payerId,
      packageId: String(packageId),
      source: 'card',
      paymentId: payment.id,
      priceEur: unitEur,
      priceBc: Number(payment.metadata?.okazionPriceBc) || null,
      grantOrdinal: i,
    });
    if (!created.ok) {
      const err = new Error(created.message || 'Nuk u krijua voucher Okazion.');
      err.statusCode = created.status || 400;
      throw err;
    }
    voucherIds.push(created.voucher.id);
  }
  payment.metadata.okazionVoucherId = voucherIds[0] || null;
  payment.metadata.okazionVoucherIds = voucherIds;
  payment.metadata.okazionQuantity = qty;
}

async function addBoostCredits(userId, amount) {
  if (!userId || !amount) return;
  const sb = getSupabaseAdmin();
  const { data: profile, error } = await sb
    .from('profiles')
    .select('boost_credits')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return;
  const { error: updErr } = await sb
    .from('profiles')
    .update({
      boost_credits: (Number(profile.boost_credits) || 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (updErr) throw updErr;
}

module.exports = {
  confirmAndApplyPayment,
  mapPayment,
  addBoostCredits,
  applyProfileCounterOnce,
  isUniqueViolation,
};

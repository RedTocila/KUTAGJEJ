'use strict';

const { getSupabaseAdmin } = require('./supabase');

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

/**
 * Confirm a payment against POK and, if it was captured, grant what was bought.
 * Idempotent: safe to call from the verify endpoint AND the webhook — perks are
 * only ever granted once (guarded by `payment.granted`).
 *
 * `pokClient` is injected to avoid a hard dependency cycle and ease testing.
 * Returns the up-to-date Payment-shaped object.
 */
async function confirmAndApplyPayment(paymentId, pokClient) {
  const sb = getSupabaseAdmin();
  const { data: row, error } = await sb.from('payments').select('*').eq('id', paymentId).maybeSingle();
  if (error) throw error;
  if (!row) {
    const err = new Error('Pagesa nuk u gjet.');
    err.statusCode = 404;
    throw err;
  }

  let payment = mapPayment(row);

  // Already finalized — return as-is (idempotent).
  if (payment.status === 'paid' && payment.granted) {
    return payment;
  }
  if (!payment.pokOrderId) {
    const err = new Error('Kjo pagesë nuk ka porosi POK.');
    err.statusCode = 400;
    throw err;
  }

  const order = await pokClient.getSdkOrder(payment.pokOrderId);
  payment.pokStatus = order.status || payment.pokStatus;

  if (!order.paid) {
    // Not captured (yet). Leave as pending so it can be retried / webhook can finalize.
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
    return mapPayment(updated);
  }

  // Defensive: make sure the captured amount matches what we asked for.
  if (order.amount != null && Number(order.amount) !== Number(payment.amount)) {
    console.warn(
      `Payment ${payment.id}: POK amount ${order.amount} != expected ${payment.amount}`,
    );
  }

  payment.status = 'paid';
  if (!payment.paidAt) payment.paidAt = new Date().toISOString();

  if (!payment.granted) {
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
  }

  const { data: saved, error: saveErr } = await sb
    .from('payments')
    .update({
      status: 'paid',
      paid_at: payment.paidAt,
      granted: payment.granted,
      pok_status: payment.pokStatus || '',
      metadata: payment.metadata || {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .select('*')
    .single();
  if (saveErr) throw saveErr;
  return mapPayment(saved);
}

async function grantSubscription(payment) {
  const sb = getSupabaseAdmin();
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

  const { data: sub, error: subErr } = await sb
    .from('user_subscriptions')
    .insert({
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
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'active',
      payment_id: payment.id,
    })
    .select('id')
    .single();
  if (subErr) throw subErr;

  payment.metadata.subscriptionId = sub.id;

  if (boost > 0) {
    await addBoostCredits(payment.payerId, boost);
  }
}

async function grantCredits(payment) {
  const credits = Number(payment.metadata?.credits) || 0;
  if (credits > 0) {
    await addBoostCredits(payment.payerId, credits);
  }
}

async function grantAutoRefreshSlots(payment) {
  const slots = Math.max(0, Math.floor(Number(payment.metadata?.autoRefreshSlots) || 0));
  if (slots <= 0 || !payment.payerId) return;
  const sb = getSupabaseAdmin();
  const { data: profile, error } = await sb
    .from('profiles')
    .select('auto_refresh_slots')
    .eq('id', payment.payerId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return;
  const { error: updErr } = await sb
    .from('profiles')
    .update({
      auto_refresh_slots: (Number(profile.auto_refresh_slots) || 0) + slots,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.payerId);
  if (updErr) throw updErr;
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
    });
    if (!created.ok) {
      const err = new Error(created.message || 'Nuk u krijua voucher OKAZION.');
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

module.exports = { confirmAndApplyPayment, mapPayment, addBoostCredits };

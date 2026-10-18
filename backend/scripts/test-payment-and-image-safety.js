'use strict';

const assert = require('assert');
const { Readable } = require('stream');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createMemorySupabase() {
  const db = {
    payments: [],
    profiles: [],
    user_subscriptions: [],
    premium_listing_vouchers: [],
    okazion_listing_vouchers: [],
    iap_processed_events: [],
    payment_side_effects: [],
    contracts: [],
  };
  const hooks = { failCounter: 0 };

  function matches(row, filters, contains) {
    if (filters.some(([col, val]) => row[col] !== val)) return false;
    if (!contains) return true;
    const obj = row[contains.col] || {};
    return Object.entries(contains.obj).every(([key, val]) => obj[key] === val);
  }

  function from(table) {
    const state = { op: 'select', filters: [], contains: null, patch: null, row: null, limit: null };
    const api = {
      select() {
        return api;
      },
      insert(row) {
        state.op = 'insert';
        state.row = Array.isArray(row) ? row[0] : row;
        return api;
      },
      update(patch) {
        state.op = 'update';
        state.patch = patch;
        return api;
      },
      delete() {
        state.op = 'delete';
        return api;
      },
      eq(col, val) {
        state.filters.push([col, val]);
        return api;
      },
      contains(col, obj) {
        state.contains = { col, obj };
        return api;
      },
      order() {
        return api;
      },
      limit(n) {
        state.limit = n;
        return api;
      },
      maybeSingle() {
        return Promise.resolve(exec('maybe'));
      },
      single() {
        return Promise.resolve(exec('one'));
      },
      then(ok, bad) {
        return Promise.resolve(exec('many')).then(ok, bad);
      },
    };

    function uniqueViolation() {
      return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
    }

    function exec(mode) {
      const rows = db[table];
      if (!rows) return { data: null, error: { message: `unknown table ${table}` } };

      if (state.op === 'insert') {
        const row = {
          id: state.row.id || require('crypto').randomUUID(),
          created_at: new Date().toISOString(),
          ...clone(state.row),
        };
        if (
          table === 'payments' &&
          row.metadata?.revenueCatEventId &&
          rows.some((existing) => existing.metadata?.revenueCatEventId === row.metadata.revenueCatEventId)
        ) {
          return uniqueViolation();
        }
        if (
          table === 'user_subscriptions' &&
          row.payment_id &&
          rows.some((existing) => existing.payment_id === row.payment_id)
        ) {
          return uniqueViolation();
        }
        if (
          table === 'premium_listing_vouchers' &&
          row.payment_id &&
          rows.some((existing) => existing.payment_id === row.payment_id)
        ) {
          return uniqueViolation();
        }
        if (
          table === 'okazion_listing_vouchers' &&
          row.payment_id != null &&
          row.grant_ordinal != null &&
          rows.some(
            (existing) =>
              existing.payment_id === row.payment_id && existing.grant_ordinal === row.grant_ordinal,
          )
        ) {
          return uniqueViolation();
        }
        if (table === 'iap_processed_events' && rows.some((existing) => existing.event_id === row.event_id)) {
          return uniqueViolation();
        }
        rows.push(row);
        return { data: mode === 'many' ? [clone(row)] : clone(row), error: null };
      }

      const matched = rows.filter((row) => matches(row, state.filters, state.contains));
      if (state.op === 'delete') {
        for (const row of [...matched]) rows.splice(rows.indexOf(row), 1);
        return { data: null, error: null };
      }
      if (state.op === 'update') {
        for (const row of matched) Object.assign(row, clone(state.patch));
      }
      const data = state.limit != null ? matched.slice(0, state.limit) : matched;
      if (mode === 'many') return { data: data.map(clone), error: null };
      if (!data.length) {
        return mode === 'one'
          ? { data: null, error: { code: 'PGRST116', message: 'no rows' } }
          : { data: null, error: null };
      }
      return { data: clone(data[0]), error: null };
    }

    return api;
  }

  function rpc(name, args) {
    try {
      if (name === 'claim_payment_fulfillment') {
        const row = db.payments.find((payment) => payment.id === args.p_payment_id);
        if (!row || row.granted) return Promise.resolve({ data: [], error: null });
        const claimedAt = row.fulfillment_claimed_at ? new Date(row.fulfillment_claimed_at).getTime() : 0;
        const staleMs = Math.max(Number(args.p_stale_seconds) || 45, 1) * 1000;
        const free = !row.fulfillment_claim || !claimedAt || Date.now() - claimedAt >= staleMs;
        if (!free) return Promise.resolve({ data: [], error: null });
        row.fulfillment_claim = args.p_token;
        row.fulfillment_claimed_at = new Date().toISOString();
        return Promise.resolve({ data: [clone(row)], error: null });
      }

      if (name === 'apply_profile_counter_once') {
        if (hooks.failCounter > 0) {
          hooks.failCounter -= 1;
          throw new Error('counter failed');
        }
        const key = `${args.p_payment_id}:${args.p_effect_key}`;
        if (db.payment_side_effects.some((effect) => `${effect.payment_id}:${effect.effect_key}` === key)) {
          return Promise.resolve({ data: false, error: null });
        }
        const profile = db.profiles.find((item) => item.id === args.p_user_id);
        if (!profile) return Promise.resolve({ data: false, error: null });
        db.payment_side_effects.push({ payment_id: args.p_payment_id, effect_key: args.p_effect_key });
        const amount = Number(args.p_amount);
        if (args.p_column === 'boost_credits') {
          profile.boost_credits = Math.round(((Number(profile.boost_credits) || 0) + amount) * 10) / 10;
        } else if (args.p_column === 'auto_refresh_slots') {
          profile.auto_refresh_slots = (Number(profile.auto_refresh_slots) || 0) + Math.trunc(amount);
        } else {
          throw new Error('unsupported profile counter');
        }
        return Promise.resolve({ data: true, error: null });
      }

      if (name === 'claim_iap_event') {
        let existing = db.iap_processed_events.find((event) => event.event_id === args.p_event_id);
        if (!existing) {
          existing = {
            event_id: args.p_event_id,
            user_id: args.p_user_id,
            product_id: args.p_product_id,
            event_type: args.p_event_type,
            status: 'processing',
            claimed_at: new Date().toISOString(),
            claim_token: args.p_token,
            payment_id: null,
          };
          db.iap_processed_events.push(existing);
          return Promise.resolve({
            data: [{ claimed: true, event_id: args.p_event_id, payment_id: null, status: 'processing' }],
            error: null,
          });
        }
        if (existing.status === 'done') {
          return Promise.resolve({
            data: [{ claimed: false, event_id: existing.event_id, payment_id: existing.payment_id, status: 'done' }],
            error: null,
          });
        }
        const claimedAt = existing.claimed_at ? new Date(existing.claimed_at).getTime() : 0;
        const staleMs = Math.max(Number(args.p_stale_seconds) || 45, 1) * 1000;
        if (existing.status === 'processing' && (!claimedAt || Date.now() - claimedAt >= staleMs)) {
          existing.claim_token = args.p_token;
          existing.claimed_at = new Date().toISOString();
          return Promise.resolve({
            data: [{ claimed: true, event_id: existing.event_id, payment_id: existing.payment_id, status: 'processing' }],
            error: null,
          });
        }
        return Promise.resolve({
          data: [{ claimed: false, event_id: existing.event_id, payment_id: existing.payment_id, status: existing.status }],
          error: null,
        });
      }

      return Promise.resolve({ data: null, error: { message: `unknown rpc ${name}` } });
    } catch (error) {
      return Promise.resolve({ data: null, error });
    }
  }

  return {
    db,
    hooks,
    client: { from, rpc },
    reset() {
      for (const key of Object.keys(db)) db[key].length = 0;
      hooks.failCounter = 0;
    },
  };
}

const memory = createMemorySupabase();
const supabasePath = require.resolve('../lib/supabase');
require.cache[supabasePath] = {
  id: supabasePath,
  filename: supabasePath,
  loaded: true,
  exports: {
    getSupabaseAdmin() {
      return memory.client;
    },
    isSupabaseConfigured() {
      return true;
    },
    createAuthPasswordClient() {
      return memory.client;
    },
    findAuthUserByEmail: async () => null,
  },
};

const { confirmAndApplyPayment } = require('../lib/apply-payment');
const { grantRevenueCatPurchase } = require('../lib/revenuecat-grants');
const { pokCaptureMatchesPayment } = require('../lib/pok-client');
const { fetchRemoteImageBuffer, isBlockedIp, isSafeRemoteImageUrl } = require('../lib/storage-uploads');
const imageProxy = require('../routes/public-image-proxy');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PAYMENT_ID = '22222222-2222-4222-8222-222222222222';

function seedPayment(overrides = {}) {
  memory.reset();
  memory.db.profiles.push({ id: USER_ID, boost_credits: 0, auto_refresh_slots: 0, email: 'a@example.com' });
  memory.db.payments.push({
    id: PAYMENT_ID,
    payer_id: USER_ID,
    payer_email: 'a@example.com',
    type: 'credits',
    description: 'coins',
    amount_minor: 1000,
    amount: 10,
    currency: 'EUR',
    pok_order_id: 'order-1',
    pok_status: '',
    status: 'pending',
    granted: false,
    metadata: { credits: 25 },
    fulfillment_claim: null,
    fulfillment_claimed_at: null,
    ...overrides,
  });
}

function order(overrides = {}) {
  return {
    status: 'CAPTURED',
    currency: 'EUR',
    amount: 10,
    capturedAmount: 10,
    paid: true,
    raw: { status: 'CAPTURED', currencyCode: 'EUR', amount: 10, capturedAmount: 10 },
    ...overrides,
  };
}

function publicLookup() {
  return [{ address: '8.8.8.8', family: 4 }];
}

function imageStream(chunks, headers = {}, statusCode = 200) {
  let index = 0;
  let destroyed = false;
  const stream = new Readable({
    highWaterMark: 16,
    read() {
      if (destroyed) return;
      if (index >= chunks.length) {
        this.push(null);
        return;
      }
      const chunk = chunks[index];
      index += 1;
      // Deliver one chunk at a time, the way a socket does, so the size check can
      // cancel the download before the rest of the body is read.
      process.nextTick(() => {
        if (destroyed) return;
        this.push(chunk);
      });
    },
  });
  stream.statusCode = statusCode;
  stream.headers = { 'content-type': 'image/jpeg', ...headers };
  const originalDestroy = stream.destroy.bind(stream);
  stream.destroy = (err) => {
    destroyed = true;
    return originalDestroy(err);
  };
  stream.pulled = () => index;
  stream.wasDestroyed = () => destroyed;
  return stream;
}

async function invokeProxy(url) {
  const res = {
    statusCode: 200,
    body: null,
    settled: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.settled = true;
      return this;
    },
    setHeader() {},
    send(body) {
      this.body = body;
      this.settled = true;
      return this;
    },
  };
  await new Promise((resolve, reject) => {
    let done = false;
    const finish = (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve();
    };
    const timer = setTimeout(() => finish(new Error(`proxy timed out for ${url}`)), 1000);
    const check = () => {
      if (done) return;
      if (res.settled) {
        finish();
        return;
      }
      setTimeout(check, 5);
    };
    imageProxy.handle({ method: 'GET', url: '/', query: { url }, headers: {} }, res, (err) => {
      if (err) finish(err);
    });
    check();
  });
  return res;
}

async function testAmountMatching() {
  const payment = { amount: 10.1, amountMinor: 1010, currency: 'EUR' };
  assert.strictEqual(
    pokCaptureMatchesPayment(payment, { status: 'CAPTURED', currency: 'EUR', capturedAmount: 10.1, amount: 10.1 }).ok,
    true,
  );
  assert.strictEqual(
    pokCaptureMatchesPayment(payment, { status: 'PAID', currencyCode: 'EUR', capturedAmount: 10.1, amount: 99 }).ok,
    true,
  );
  assert.strictEqual(
    pokCaptureMatchesPayment(payment, { status: 'CAPTURED', currency: 'EUR', capturedAmount: 10.08, amount: 10.1 }).ok,
    false,
  );

  const fortyFive = { amount: 45, amountMinor: 4500, currency: 'EUR' };
  assert.strictEqual(
    pokCaptureMatchesPayment(fortyFive, { status: 'COMPLETED', currency: 'eur', capturedAmount: 45, amount: 45 }).ok,
    true,
  );
  assert.strictEqual(
    pokCaptureMatchesPayment(fortyFive, { status: 'CAPTURED', currency: 'EUR', capturedAmount: 4500, amount: 4500 }).ok,
    true,
  );
  assert.strictEqual(
    pokCaptureMatchesPayment(fortyFive, { status: 'CAPTURED', currency: 'EUR', capturedAmount: 10, amount: 45 }).ok,
    false,
  );
  assert.strictEqual(
    pokCaptureMatchesPayment(fortyFive, { status: 'CAPTURED', currency: 'EUR', capturedAmount: 0, amount: 45 }).ok,
    false,
  );
  assert.strictEqual(
    pokCaptureMatchesPayment(fortyFive, { status: 'CAPTURED', currency: 'USD', capturedAmount: 45, amount: 45 }).ok,
    false,
  );
  assert.strictEqual(
    pokCaptureMatchesPayment(fortyFive, { status: 'PENDING', currency: 'EUR', capturedAmount: 45, amount: 45 }).ok,
    false,
  );
  assert.strictEqual(
    pokCaptureMatchesPayment(fortyFive, { status: 'CAPTURED', capturedAmount: 45, amount: 45 }).ok,
    false,
  );
}

async function testUnderpaidDoesNotGrant() {
  const cases = [
    order({ capturedAmount: 1, amount: 10, raw: { status: 'CAPTURED', currencyCode: 'EUR', capturedAmount: 1, amount: 10 } }),
    order({ currency: 'USD', raw: { status: 'CAPTURED', currencyCode: 'USD', capturedAmount: 10, amount: 10 } }),
    order({
      status: 'PENDING',
      paid: false,
      raw: { status: 'PENDING', currencyCode: 'EUR', capturedAmount: 10, amount: 10 },
    }),
    order({
      capturedAmount: 0,
      amount: 45,
      raw: { status: 'CAPTURED', currencyCode: 'EUR', capturedAmount: 0, amount: 45 },
    }),
  ];

  for (const providerOrder of cases) {
    seedPayment(providerOrder.amount === 45 ? { amount: 45, amount_minor: 4500, metadata: { credits: 25 } } : {});
    const payment = await confirmAndApplyPayment(PAYMENT_ID, {
      async getSdkOrder() {
        return providerOrder;
      },
    });
    assert.strictEqual(payment.granted, false);
    assert.strictEqual(payment.status, 'pending');
    assert.strictEqual(memory.db.profiles[0].boost_credits, 0);
    assert.strictEqual(memory.db.payment_side_effects.length, 0);
    assert.strictEqual(memory.db.payments[0].fulfillment_claim, null);
  }
}

async function testConcurrentPokGrantsOnce() {
  seedPayment();
  const client = {
    async getSdkOrder() {
      return order();
    },
  };
  const [first, second] = await Promise.all([
    confirmAndApplyPayment(PAYMENT_ID, client),
    confirmAndApplyPayment(PAYMENT_ID, client),
  ]);
  assert.strictEqual(first.granted, true);
  assert.strictEqual(second.granted, true);
  assert.strictEqual(first.status, 'paid');
  assert.strictEqual(memory.db.profiles[0].boost_credits, 25);
  assert.strictEqual(memory.db.payment_side_effects.length, 1);
  const again = await confirmAndApplyPayment(PAYMENT_ID, client);
  assert.strictEqual(again.granted, true);
  assert.strictEqual(memory.db.profiles[0].boost_credits, 25);
}

async function testPokRetryAfterPartialFailure() {
  seedPayment();
  memory.hooks.failCounter = 1;
  const client = {
    async getSdkOrder() {
      return order();
    },
  };
  await assert.rejects(() => confirmAndApplyPayment(PAYMENT_ID, client));
  assert.strictEqual(memory.db.payments[0].granted, false);
  assert.strictEqual(memory.db.payments[0].fulfillment_claim, null);
  assert.strictEqual(memory.db.profiles[0].boost_credits, 0);

  const payment = await confirmAndApplyPayment(PAYMENT_ID, client);
  assert.strictEqual(payment.granted, true);
  assert.strictEqual(memory.db.profiles[0].boost_credits, 25);
  assert.strictEqual(memory.db.payment_side_effects.length, 1);
}

async function testConcurrentRevenueCat() {
  memory.reset();
  memory.db.profiles.push({
    id: USER_ID,
    email: 'a@example.com',
    first_name: 'A',
    last_name: 'B',
    boost_credits: 0,
    auto_refresh_slots: 0,
  });
  const params = {
    eventId: 'evt-concurrent',
    eventType: 'NON_RENEWING_PURCHASE',
    appUserId: USER_ID,
    productId: 'al.kutagjej.coins.starter',
    transactionId: 'tx-1',
    price: 9,
    currency: 'EUR',
  };
  const [first, second] = await Promise.all([grantRevenueCatPurchase(params), grantRevenueCatPurchase(params)]);
  const results = [first, second];
  assert.strictEqual(results.filter((result) => result.ok && !result.duplicate).length, 1);
  assert.strictEqual(results.filter((result) => !result.ok && result.status === 409).length, 1);
  assert.strictEqual(memory.db.payments.length, 1);
  assert.strictEqual(memory.db.profiles[0].boost_credits, 100);
  assert.strictEqual(memory.db.payment_side_effects.length, 1);

  const replay = await grantRevenueCatPurchase(params);
  assert.strictEqual(replay.duplicate, true);
  assert.strictEqual(memory.db.payments.length, 1);
  assert.strictEqual(memory.db.profiles[0].boost_credits, 100);
}

async function testRevenueCatRetryAfterPartialFailure() {
  memory.reset();
  memory.db.profiles.push({
    id: USER_ID,
    email: 'a@example.com',
    first_name: 'A',
    last_name: 'B',
    boost_credits: 0,
  });
  memory.hooks.failCounter = 1;
  const params = {
    eventId: 'evt-retry',
    eventType: 'NON_RENEWING_PURCHASE',
    appUserId: USER_ID,
    productId: 'al.kutagjej.coins.starter',
    price: 9,
    currency: 'EUR',
  };
  await assert.rejects(() => grantRevenueCatPurchase(params));
  assert.strictEqual(memory.db.payments.length, 1);
  assert.strictEqual(memory.db.payments[0].granted, false);
  assert.strictEqual(memory.db.iap_processed_events.length, 0);
  assert.strictEqual(memory.db.profiles[0].boost_credits, 0);

  const granted = await grantRevenueCatPurchase(params);
  assert.strictEqual(granted.ok, true);
  assert.strictEqual(memory.db.payments.length, 1);
  assert.strictEqual(memory.db.payments[0].granted, true);
  assert.strictEqual(memory.db.profiles[0].boost_credits, 100);
  assert.strictEqual(memory.db.payment_side_effects.length, 1);
  assert.strictEqual(memory.db.iap_processed_events[0].status, 'done');
}

async function testBlockedImageTargets() {
  for (const ip of [
    '127.0.0.1',
    '10.1.2.3',
    '192.168.0.5',
    '172.16.0.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '224.0.0.1',
    '255.255.255.255',
    '::1',
    'fe80::1',
    'fc00::1',
    'fd12::1',
    'ff02::1',
    '2001:db8::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
  ]) {
    assert.strictEqual(isBlockedIp(ip), true, ip);
  }
  assert.strictEqual(isBlockedIp('8.8.8.8'), false);
  assert.strictEqual(isBlockedIp('1.1.1.1'), false);

  const targets = [
    'http://127.0.0.1/secret',
    'http://10.1.2.3/a.jpg',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/a.jpg',
    'http://[fe80::1]/a.jpg',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://2130706433/a.jpg',
  ];
  for (const target of targets) {
    const requested = [];
    await assert.rejects(
      () =>
        fetchRemoteImageBuffer('https://cdn.example/photo.jpg', {
          lookup: publicLookup,
          request: async (url) => {
            requested.push(url.hostname);
            return imageStream([Buffer.from('nope')], { location: target }, 302);
          },
        }),
      (err) => err && err.code === 'UNSAFE_URL',
    );
    assert.deepStrictEqual(requested, ['cdn.example']);
  }

  const direct = [];
  await assert.rejects(
    () =>
      fetchRemoteImageBuffer('https://127.0.0.1/secret', {
        request: async (url) => {
          direct.push(url.hostname);
          return imageStream([Buffer.from('x')]);
        },
      }),
    (err) => err && err.code === 'UNSAFE_URL',
  );
  assert.deepStrictEqual(direct, []);
  assert.strictEqual(await isSafeRemoteImageUrl('http://192.168.1.20/a.jpg'), false);
  assert.strictEqual(await isSafeRemoteImageUrl('https://cdn.example/a.jpg', publicLookup), true);
}

async function testStreamLimitAndPublicImage() {
  const oversized = imageStream([Buffer.alloc(100)], { 'content-length': String(9 * 1024 * 1024) });
  const rejected = await fetchRemoteImageBuffer('https://cdn.example/big.jpg', {
    maxBytes: 8 * 1024 * 1024,
    lookup: publicLookup,
    request: async () => oversized,
  });
  assert.strictEqual(rejected, null);
  assert.strictEqual(oversized.pulled(), 0);
  assert.strictEqual(oversized.wasDestroyed(), true);

  const chunks = [Buffer.alloc(40, 1), Buffer.alloc(40, 2), Buffer.alloc(40, 3)];
  const streamed = imageStream(chunks, {});
  delete streamed.headers['content-length'];
  const stopped = await fetchRemoteImageBuffer('https://cdn.example/stream.jpg', {
    maxBytes: 50,
    lookup: publicLookup,
    request: async () => streamed,
  });
  assert.strictEqual(stopped, null);
  assert.strictEqual(streamed.pulled(), 2);
  assert.strictEqual(streamed.wasDestroyed(), true);

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const ok = await fetchRemoteImageBuffer('https://cdn.example/ok.jpg', {
    lookup: publicLookup,
    request: async () => imageStream([jpeg], { 'content-type': 'image/jpeg', 'content-length': String(jpeg.length) }),
  });
  assert.ok(ok);
  assert.strictEqual(ok.mime, 'image/jpeg');
  assert.deepStrictEqual(ok.buffer, jpeg);

  const followed = [];
  const redirected = await fetchRemoteImageBuffer('https://cdn.example/start.jpg', {
    lookup: publicLookup,
    request: async (url) => {
      followed.push(url.hostname);
      if (url.hostname === 'cdn.example') {
        return imageStream([], { location: 'https://images.example/ok.jpg' }, 302);
      }
      return imageStream([jpeg]);
    },
  });
  assert.deepStrictEqual(followed, ['cdn.example', 'images.example']);
  assert.deepStrictEqual(redirected.buffer, jpeg);

  const started = Date.now();
  const timedOut = await fetchRemoteImageBuffer('https://cdn.example/slow.jpg', {
    timeoutMs: 30,
    lookup: publicLookup,
    request: (_url, { signal }) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(imageStream([jpeg])), 5000);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }),
  });
  assert.strictEqual(timedOut, null);
  assert.ok(Date.now() - started < 1000);

  let lookups = 0;
  let requests = 0;
  await assert.rejects(
    () =>
      fetchRemoteImageBuffer('https://cdn.example/rebind.jpg', {
        lookup: async () => {
          lookups += 1;
          return [{ address: lookups === 1 ? '8.8.8.8' : '169.254.169.254', family: 4 }];
        },
        request: async () => {
          requests += 1;
          return imageStream([jpeg]);
        },
      }),
    (err) => err && err.code === 'UNSAFE_URL',
  );
  assert.strictEqual(requests, 0);
  assert.ok(lookups >= 2);

  const loopback = await invokeProxy('https://127.0.0.1/secret');
  assert.strictEqual(loopback.statusCode, 400);
  const plainHttp = await invokeProxy('http://127.0.0.1/secret');
  assert.strictEqual(plainHttp.statusCode, 400);
  const metadata = await invokeProxy('https://169.254.169.254/latest/meta-data');
  assert.strictEqual(metadata.statusCode, 400);
}

function memoryRows(tables) {
  return {
    from(table) {
      const rows = tables[table] || [];
      return {
        select() {
          return this;
        },
        eq(column, value) {
          return Promise.resolve({
            data: rows.filter((row) => row[column] === value),
            error: null,
          });
        },
      };
    },
  };
}

async function testAccountOwnedStorage() {
  const {
    classifyStorageUrl,
    collectOwnedStorageTargets,
    deleteOwnedStorageTargets,
  } = require('../lib/account-owned-storage');

  assert.strictEqual(classifyStorageUrl('https://cdn.example/photo.jpg'), null);
  assert.deepStrictEqual(
    classifyStorageUrl('https://proj.supabase.co/storage/v1/object/public/uploads/listings/a.jpg'),
    { provider: 'supabase', bucket: 'uploads', path: 'listings/a.jpg' },
  );
  assert.deepStrictEqual(
    classifyStorageUrl('https://abc.public.blob.vercel-storage.com/listings/b.jpg?download=1'),
    { provider: 'vercel-blob', url: 'https://abc.public.blob.vercel-storage.com/listings/b.jpg' },
  );

  const userId = 'user-1';
  const otherId = 'user-2';
  const sb = memoryRows({
    profiles: [
      { id: userId, avatar_url: 'https://proj.supabase.co/storage/v1/object/public/uploads/avatars/me.jpg' },
      { id: otherId, avatar_url: 'https://proj.supabase.co/storage/v1/object/public/uploads/avatars/other.jpg' },
    ],
    real_estate_listings: [
      {
        poster_id: userId,
        image_urls: ['https://abc.public.blob.vercel-storage.com/listings/mine.jpg', 'https://instagram.example/x.jpg'],
      },
    ],
    car_listings: [],
    job_listings: [],
    marketplace_listings: [],
    directory_listings: [
      {
        poster_id: userId,
        image_urls: [],
        announcement_banner_url: null,
        menu_items: [{ imageUrl: 'https://proj.supabase.co/storage/v1/object/public/uploads/menu/dish.jpg' }],
        portfolio_items: [],
      },
    ],
    messages: [
      { sender_id: userId, image_url: 'https://proj.supabase.co/storage/v1/object/public/uploads/messages/m.jpg' },
      { sender_id: otherId, image_url: 'https://proj.supabase.co/storage/v1/object/public/uploads/messages/theirs.jpg' },
    ],
    conversations: [
      { poster_id: userId, listing_image_url: 'https://proj.supabase.co/storage/v1/object/public/uploads/listings/cover.jpg' },
      { poster_id: otherId, listing_image_url: 'https://proj.supabase.co/storage/v1/object/public/uploads/listings/not-mine.jpg' },
    ],
    professional_verification_requests: [
      {
        applicant_id: userId,
        id_front_image_url: 'https://proj.supabase.co/storage/v1/object/public/uploads/ids/front.jpg',
        applicant_snapshot: {},
      },
    ],
    job_employer_verification_requests: [],
  });

  const targets = await collectOwnedStorageTargets(sb, userId);
  const paths = targets.filter((target) => target.provider === 'supabase').map((target) => target.path).sort();
  assert.deepStrictEqual(paths, [
    'avatars/me.jpg',
    'ids/front.jpg',
    'listings/cover.jpg',
    'menu/dish.jpg',
    'messages/m.jpg',
  ]);
  assert.deepStrictEqual(
    targets.filter((target) => target.provider === 'vercel-blob').map((target) => target.url),
    ['https://abc.public.blob.vercel-storage.com/listings/mine.jpg'],
  );

  const removed = [];
  const blobs = [];
  const ok = await deleteOwnedStorageTargets(targets, {
    storage: {
      from(bucket) {
        assert.strictEqual(bucket, 'uploads');
        return {
          remove(chunk) {
            removed.push(...chunk);
            return Promise.resolve({ error: null });
          },
        };
      },
    },
    deleteBlobs(urls) {
      blobs.push(...urls);
      return Promise.resolve();
    },
  });
  assert.strictEqual(ok.ok, true);
  assert.deepStrictEqual(removed.sort(), paths);
  assert.deepStrictEqual(blobs, ['https://abc.public.blob.vercel-storage.com/listings/mine.jpg']);

  const failed = await deleteOwnedStorageTargets(
    [{ provider: 'vercel-blob', url: 'https://abc.public.blob.vercel-storage.com/listings/mine.jpg' }],
    {
      storage: { from: () => ({ remove: async () => ({ error: null }) }) },
      deleteBlobs: async () => {
        throw new Error('blob down');
      },
    },
  );
  assert.strictEqual(failed.ok, false);
  assert.ok(failed.failures.some((message) => /blob down/.test(message)));
}

async function main() {
  await testAmountMatching();
  await testUnderpaidDoesNotGrant();
  await testConcurrentPokGrantsOnce();
  await testPokRetryAfterPartialFailure();
  await testConcurrentRevenueCat();
  await testRevenueCatRetryAfterPartialFailure();
  await testBlockedImageTargets();
  await testStreamLimitAndPublicImage();
  await testAccountOwnedStorage();
  console.error('payment and image safety tests ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

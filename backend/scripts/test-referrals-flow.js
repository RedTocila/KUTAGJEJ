/**
 * Smoke test: referral code allocation + signup attribution (requires running API + Mongo).
 * Run: node scripts/test-referrals-flow.js
 *
 * Uses env TEST_REFERRER_EMAIL / TEST_REFERRER_PASSWORD or creates ephemeral users.
 */
require('dotenv').config();
const BASE = (process.env.API_BASE || 'http://localhost:5000').replace(/\/$/, '');

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const suffix = Date.now().toString(36);
  const referrerEmail = `ref-test-a-${suffix}@example.com`;
  const referredEmail = `ref-test-b-${suffix}@example.com`;
  const password = 'test123456';

  console.log('1. Register referrer …');
  let r = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userType: 'individual',
      firstName: 'Referrer',
      lastName: 'Test',
      email: referrerEmail,
      password,
      phone: '+355691111111',
    }),
  });
  assert(r.status === 201, `Referrer register failed: ${r.status} ${JSON.stringify(r.data)}`);
  const referrerToken = r.data.token;
  assert(referrerToken, 'No token for referrer');
  assert(r.data.admin?.referralCode, 'Referrer missing referralCode');

  console.log('2. Fetch referrer stats …');
  r = await api('/api/referrals/me', {
    headers: { Authorization: `Bearer ${referrerToken}` },
  });
  assert(r.status === 200, `GET /referrals/me failed: ${r.status}`);
  const code = r.data.referral?.code;
  assert(code, 'No referral code in /referrals/me');
  console.log(`   Code: ${code}, link: ${r.data.referral?.link}`);

  console.log('3. Register referred user with code …');
  r = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userType: 'individual',
      firstName: 'Referred',
      lastName: 'Test',
      email: referredEmail,
      password,
      phone: '+355692222222',
      referralCode: code,
    }),
  });
  assert(r.status === 201, `Referred register failed: ${r.status} ${JSON.stringify(r.data)}`);
  assert(r.data.admin?.referredById, 'Referred user missing referredById');

  console.log('4. Verify referrer got credit + count …');
  r = await api('/api/referrals/me', {
    headers: { Authorization: `Bearer ${referrerToken}` },
  });
  assert(r.status === 200, 'Second /referrals/me failed');
  assert(r.data.referral?.referralCount === 1, `Expected 1 referral, got ${r.data.referral?.referralCount}`);
  assert(r.data.referral?.boostCredits >= 5, `Expected >=5 BC, got ${r.data.referral?.boostCredits}`);
  assert(r.data.referral?.referredUsers?.length === 1, 'Expected 1 referred user in list');

  console.log('OK — referral flow works end-to-end.');
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});

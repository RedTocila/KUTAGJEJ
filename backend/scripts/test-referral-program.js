/**
 * Smoke test: referral program config API (not user referral tracking).
 * Run: node scripts/test-referral-program.js
 */
const BASE = (process.env.API_BASE || 'http://localhost:5000').replace(/\/$/, '');

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('Testing GET /api/referral-program …');
  const { status, data } = await get('/api/referral-program');
  assert(status === 200, `Expected 200, got ${status}`);
  const p = data.program;
  assert(p && typeof p === 'object', 'Missing program object');
  assert(typeof p.pageTitle === 'string' && p.pageTitle.length > 0, 'pageTitle missing');
  assert(Array.isArray(p.freeTiers) && p.freeTiers.length > 0, 'freeTiers empty');
  assert(Array.isArray(p.paidTiers) && p.paidTiers.length > 0, 'paidTiers empty');
  assert(p.networkBuilderBadge?.label, 'networkBuilderBadge missing');
  assert(p.loginStreak?.daysRequired >= 1, 'loginStreak invalid');

  for (const t of p.freeTiers) {
    assert(typeof t.referralsRequired === 'number', 'free tier referralsRequired invalid');
    assert(typeof t.boostCredits === 'number', 'free tier boostCredits invalid');
  }

  console.log('OK — referral program config loads correctly.');
  console.log(`  Title: ${p.pageTitle}`);
  console.log(`  Free tiers: ${p.freeTiers.length}, Paid tiers: ${p.paidTiers.length}`);
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});

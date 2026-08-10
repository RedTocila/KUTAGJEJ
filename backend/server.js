require('dotenv').config();

const express = require('express');
const { isSupabaseConfigured, getSupabaseAdmin } = require('./lib/supabase');
const { ensureListingCategories } = require('./lib/ensure-listing-categories');
const { ensureCoreRoles } = require('./lib/core-roles');
const { ensureReferralProgram } = require('./lib/ensure-referral-program');
const { ensureCreditPackages } = require('./lib/ensure-credit-packages');
const { ensureContractPackages } = require('./lib/ensure-contract-packages');
const { ensureHomeBanners } = require('./lib/ensure-home-banners');
const { ensureAutoRefreshSchema } = require('./lib/ensure-auto-refresh-schema');
const { ensurePremiumListingSchema } = require('./lib/ensure-premium-listing-schema');
const { ensureOkazionListingSchema } = require('./lib/ensure-okazion-listing-schema');
const { ensureBumpedAtSchema } = require('./lib/ensure-bumped-at-schema');
const { ensureMemberReviewsSchema } = require('./lib/ensure-member-reviews-schema');
const { backfillMissingReferralCodes } = require('./lib/referrals');
const { backfillOrphanProfiles } = require('./lib/profiles');
const { processDueAutoRefreshes } = require('./lib/listing-auto-refresh');

const app = express();
const corsMiddleware = require('./middleware/cors');
const helmet = require('helmet');

/** How often the local process scans for due Auto-Refresh listings. */
const AUTO_REFRESH_TICK_MS = Math.max(
  60_000,
  Number(process.env.AUTO_REFRESH_TICK_MS) || 5 * 60 * 1000,
);

let autoRefreshTimer = null;
let autoRefreshRunning = false;

async function runAutoRefreshTick() {
  if (autoRefreshRunning) return;
  autoRefreshRunning = true;
  try {
    const result = await processDueAutoRefreshes();
    if (result.refreshed > 0 || result.failed > 0) {
      console.log(
        `[auto-refresh] scanned=${result.scanned} refreshed=${result.refreshed} skipped=${result.skipped} failed=${result.failed}`,
      );
    }
  } catch (err) {
    console.error('[auto-refresh] tick failed:', err?.message || err);
  } finally {
    autoRefreshRunning = false;
  }
}

function startAutoRefreshScheduler() {
  if (autoRefreshTimer) return;
  // Delay first tick so boot/migrations settle.
  const bootDelay = setTimeout(() => {
    void runAutoRefreshTick();
    autoRefreshTimer = setInterval(() => {
      void runAutoRefreshTick();
    }, AUTO_REFRESH_TICK_MS);
    if (typeof autoRefreshTimer.unref === 'function') autoRefreshTimer.unref();
  }, 15_000);
  if (typeof bootDelay.unref === 'function') bootDelay.unref();
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(corsMiddleware);
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

let bootPromise = null;

async function bootstrap() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see backend/.env.example).',
    );
  }
  getSupabaseAdmin();
  console.log('Connected to Supabase');
  await ensureListingCategories();
  await ensureCoreRoles();
  await ensureReferralProgram();
  await ensureCreditPackages();
  await ensureContractPackages();
  await ensureHomeBanners();
  await ensureAutoRefreshSchema();
  await ensurePremiumListingSchema();
  await ensureOkazionListingSchema();
  await ensureBumpedAtSchema();
  await ensureMemberReviewsSchema();
  const restored = await backfillOrphanProfiles();
  if (restored > 0) console.log(`✓ Restored ${restored} orphan profile(s) from auth`);
  await backfillMissingReferralCodes();
}

function ensureBooted() {
  if (!bootPromise) {
    bootPromise = bootstrap().catch((err) => {
      bootPromise = null;
      throw err;
    });
  }
  return bootPromise;
}

/** On Vercel, boot before handling traffic so a missing env surfaces as 503 JSON. */
app.use(async (req, res, next) => {
  if (
    req.path === '/' ||
    req.path === '/api/health' ||
    req.path.endsWith('/health') ||
    req.path === '/api/public/image-proxy'
  ) {
    return next();
  }
  try {
    await ensureBooted();
    next();
  } catch (err) {
    console.error('bootstrap:', err?.message || err);
    res.status(503).json({ ok: false, message: err?.message || 'API not ready' });
  }
});

app.get('/', async (_req, res) => {
  res.json({
    ok: true,
    name: 'KuTaGjej API',
    version: '2',
    db: 'supabase',
    supabase: isSupabaseConfigured() ? 'configured' : 'missing_env',
  });
});

app.get('/api/health', async (_req, res) => {
  const configured = isSupabaseConfigured();
  const body = {
    ok: configured,
    supabase: configured ? 'configured' : 'missing_env',
  };
  if (configured) {
    try {
      await ensureBooted();
      const { count, error } = await getSupabaseAdmin()
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('account_type', 'admin');
      if (!error) body.adminCount = count ?? 0;
      else body.dbError = error.message;
    } catch (err) {
      body.ok = false;
      body.bootError = err?.message || String(err);
    }
  }
  res.status(body.ok ? 200 : 503).json(body);
});

app.use('/api/admin/stats', require('./routes/admin-stats'));
app.use('/api/admin/listings', require('./routes/admin-listings'));
app.use('/api/admin/notifications', require('./routes/admin-notifications'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin/roles', require('./routes/admin-roles'));
app.use('/api/admin/users', require('./routes/admin-users'));
app.use('/api/admin/categories', require('./routes/admin-categories'));
app.use('/api/admin/contracts', require('./routes/admin-contracts'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/admin/payments', require('./routes/admin-payments'));
app.use('/api/admin/credit-packages', require('./routes/admin-credit-packages'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin/referral-program', require('./routes/admin-referral-program'));
app.use('/api/admin/home-banners', require('./routes/admin-home-banners'));
app.use('/api/referral-program', require('./routes/referral-program'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/admin/referrals', require('./routes/admin-referrals'));
app.use('/api/uploads', require('./routes/uploads'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/real-estate/locations', require('./routes/real-estate-locations'));
app.use('/api/admin/real-estate/locations', require('./routes/admin-real-estate-locations'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/listings/owner', require('./routes/listing-owner-delete'));
app.use('/api/listings/refresh', require('./routes/listing-refresh'));
app.use('/api/listings/announcement', require('./routes/listing-announcement'));
app.use('/api/listings/convert-quota', require('./routes/listing-quota-convert'));
app.use('/api/listings/category-quota', require('./routes/listing-category-quota'));
app.use('/api/listings/cars', require('./routes/car-listings'));
app.use('/api/listings/jobs', require('./routes/job-listings'));
app.use('/api/listings/marketplace', require('./routes/marketplace-listings'));
app.use('/api/listings/directory', require('./routes/directory-listings'));
app.use('/api/business-reviews', require('./routes/business-listing-reviews'));
app.use('/api/business-reservations', require('./routes/business-reservations'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/user-notifications', require('./routes/user-notifications'));
app.use('/api/professional-reviews', require('./routes/professional-listing-reviews'));
app.use('/api/member-reviews', require('./routes/member-reviews'));
app.use('/api/professional-verification', require('./routes/professional-verification'));
app.use('/api/admin/professional-verification', require('./routes/admin-professional-verification'));
app.use('/api/public/listings', require('./routes/public-listings'));
app.use('/api/public/ai-search', require('./routes/ai-search'));
app.use('/api/ai', require('./routes/ai-import'));
app.use('/api/public/members', require('./routes/public-members'));
app.use('/api/listing-metrics', require('./routes/listing-metrics'));
app.use('/api/job-employer-verification', require('./routes/job-employer-verification'));
app.use('/api/admin/job-employer-verification', require('./routes/admin-job-employer-verification'));
app.use('/api/public/home-banners', require('./routes/public-home-banners'));
app.use('/api/public/image-proxy', require('./routes/public-image-proxy'));

const startServer = async () => {
  try {
    await ensureBooted();
    const PORT = Number(process.env.PORT) || 5001;
    app.listen(PORT, () => {
      console.log(`KuTaGjej API listening on http://localhost:${PORT}`);
      startAutoRefreshScheduler();
      console.log(`[auto-refresh] scheduler started (every ${Math.round(AUTO_REFRESH_TICK_MS / 1000)}s)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

module.exports = app;

// Local / non-Vercel: listen. On Vercel the platform mounts the exported app.
if (!process.env.VERCEL) {
  startServer();
} else {
  ensureBooted().catch((err) => {
    console.error('Vercel bootstrap warning:', err?.message || err);
  });
}

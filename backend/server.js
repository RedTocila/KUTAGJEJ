require('dotenv').config();

const express = require('express');
const { isSupabaseConfigured, getSupabaseAdmin } = require('./lib/supabase');
const { ensureListingCategories } = require('./lib/ensure-listing-categories');
const { ensureCoreRoles } = require('./lib/core-roles');
const { ensureReferralProgram } = require('./lib/ensure-referral-program');
const { ensureCreditPackages } = require('./lib/ensure-credit-packages');
const { ensureContractPackages } = require('./lib/ensure-contract-packages');
const { ensureHomeBanners } = require('./lib/ensure-home-banners');
const { backfillMissingReferralCodes } = require('./lib/referrals');

const app = express();
const corsMiddleware = require('./middleware/cors');
const helmet = require('helmet');

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const bootstrap = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see backend/.env.example).',
    );
  }
  // Touch client once so misconfig fails fast.
  getSupabaseAdmin();
  console.log('Connected to Supabase');
  await ensureListingCategories();
  await ensureCoreRoles();
  await ensureReferralProgram();
  await ensureCreditPackages();
  await ensureContractPackages();
  await ensureHomeBanners();
  await backfillMissingReferralCodes();
};

app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'KuTaGjej API', version: '2', db: 'supabase' });
});

app.get('/api/health', async (_req, res) => {
  const configured = isSupabaseConfigured();
  const body = {
    ok: configured,
    supabase: configured ? 'configured' : 'missing_env',
  };
  if (configured) {
    try {
      const { count, error } = await getSupabaseAdmin()
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('account_type', 'admin');
      if (!error) body.adminCount = count ?? 0;
    } catch {
      /* ignore */
    }
  }
  res.status(configured ? 200 : 503).json(body);
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
app.use('/api/listings/cars', require('./routes/car-listings'));
app.use('/api/listings/jobs', require('./routes/job-listings'));
app.use('/api/listings/marketplace', require('./routes/marketplace-listings'));
app.use('/api/listings/directory', require('./routes/directory-listings'));
app.use('/api/business-reviews', require('./routes/business-listing-reviews'));
app.use('/api/business-reservations', require('./routes/business-reservations'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/professional-reviews', require('./routes/professional-listing-reviews'));
app.use('/api/professional-verification', require('./routes/professional-verification'));
app.use('/api/admin/professional-verification', require('./routes/admin-professional-verification'));
app.use('/api/public/listings', require('./routes/public-listings'));
app.use('/api/public/members', require('./routes/public-members'));
app.use('/api/listing-metrics', require('./routes/listing-metrics'));
app.use('/api/job-employer-verification', require('./routes/job-employer-verification'));
app.use('/api/admin/job-employer-verification', require('./routes/admin-job-employer-verification'));
app.use('/api/public/home-banners', require('./routes/public-home-banners'));

const startServer = async () => {
  try {
    await bootstrap();
    const PORT = Number(process.env.PORT) || 5001;
    app.listen(PORT, () => {
      console.log(`KuTaGjej API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

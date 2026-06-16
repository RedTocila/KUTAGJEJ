require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const { getMongoUri } = require('./lib/get-mongo-uri');
const { ensureListingCategories } = require('./lib/ensure-listing-categories');
const { ensureCoreRoles } = require('./lib/core-roles');
const { ensureReferralProgram } = require('./lib/ensure-referral-program');
const { ensureHomeBanners } = require('./lib/ensure-home-banners');
const { ensureListingIndexes } = require('./lib/ensure-listing-indexes');
const { ensureListingModeration } = require('./lib/ensure-listing-moderation');
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

/** Load models once so Mongoose registers schemas before routes run. */
function registerModels() {
  require('./models/Admin');
  require('./models/BusinessUser');
  require('./models/IndividualUser');
  require('./models/Role');
  require('./models/ManagedUser');
  require('./models/ListingCategory');
  require('./models/Contract');
  require('./models/ReferralProgram');
  require('./models/RealEstateCity');
  require('./models/RealEstateListing');
  require('./models/CarListing');
  require('./models/JobListing');
  require('./models/MarketplaceListing');
  require('./models/DirectoryListing');
  require('./models/HomeBanner');
  require('./models/ListingEngagement');
  require('./models/SavedListing');
  require('./models/ListingMetricDedup');
  require('./models/JobEmployerVerificationRequest');
  require('./models/BusinessListingReview');
  require('./models/BusinessReservation');
  require('./models/ProfessionalListingReview');
  require('./models/ProfessionalVerificationRequest');
  require('./models/AdminNotification');
  require('./models/ReferralSignup');
  require('./models/Conversation');
  require('./models/Message');
}

const connectDB = async () => {
  const uri = getMongoUri();
  if (!uri) {
    throw new Error(
      'Set MONGODB_URI, or set MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST (see backend/.env.example).',
    );
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15_000,
    });
    console.log('Connected to MongoDB');
    registerModels();
    await ensureListingCategories();
    await ensureCoreRoles();
    await ensureReferralProgram();
    await ensureHomeBanners();
    await ensureListingIndexes();
    await ensureListingModeration();
    await backfillMissingReferralCodes();
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    const msg = String(error.message || '');
    if (msg.includes('bad auth') || msg.includes('authentication failed')) {
      console.error(
        'Hint: bad auth means wrong username/password for this cluster. In Atlas: Database Access → user → Edit password, then use “Connect” → copy URI, or use MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOST so the password is plain text in .env (encoded automatically).',
      );
    } else {
      console.error(
        'Hint: if using MONGODB_URI only, special characters in the password must be percent-encoded in the URI (! → %21, @ → %40, # → %23).',
      );
    }
    throw error;
  }
};

app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'KuTaGjej API', version: '1' });
});

app.get('/api/health', async (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  const body = {
    ok: ready,
    mongo: ready ? 'connected' : 'disconnected',
  };
  if (ready && mongoose.connection.db) {
    body.dbName = mongoose.connection.db.databaseName;
    try {
      const Admin = mongoose.connection.models.Admin;
      if (Admin) {
        body.adminCount = await Admin.countDocuments();
      }
    } catch {
    }
  }
  body.jwtConfigured = Boolean(String(process.env.JWT_SECRET || '').trim());
  res.status(ready ? 200 : 503).json(body);
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
app.use('/api/admin/referral-program', require('./routes/admin-referral-program'));
app.use('/api/admin/home-banners', require('./routes/admin-home-banners'));
app.use('/api/referral-program', require('./routes/referral-program'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/admin/referrals', require('./routes/admin-referrals'));
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
app.use('/api/listing-metrics', require('./routes/listing-metrics'));
app.use('/api/job-employer-verification', require('./routes/job-employer-verification'));
app.use('/api/admin/job-employer-verification', require('./routes/admin-job-employer-verification'));
app.use('/api/public/home-banners', require('./routes/public-home-banners'));

const startServer = async () => {
  try {
    await connectDB();
    if (!String(process.env.JWT_SECRET || '').trim()) {
      console.error(
        'FATAL: JWT_SECRET is missing or empty. Set it in backend/.env locally, or in Vercel → Settings → Environment Variables for production.',
      );
      process.exit(1);
    }
    const PORT = Number(process.env.PORT) || 5000;
    app.listen(PORT, () => {
      console.log(`KuTaGjej API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

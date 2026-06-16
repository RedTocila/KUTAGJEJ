const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const BusinessUser = require('../models/BusinessUser');
const IndividualUser = require('../models/IndividualUser');
const ManagedUser = require('../models/ManagedUser');
const authMiddleware = require('../middleware/auth');
const {
  allocateUniqueReferralCode,
  processReferralOnSignup,
  ensureUserReferralCode,
  referralFieldsForUser,
} = require('../lib/referrals');

const router = express.Router();
const rateLimit = require('../middleware/rate-limit');

const authRateLimit = rateLimit({ windowMs: 60_000, max: 15 });

/** Dashboard profile & password routes: admin role only (not business users). */
function requireAdminRole(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët mund ta përdorin këtë funksion.' });
  }
  next();
}

/** Individual / business portal accounts only (not admin or managed staff). */
function requirePortalUser(req, res, next) {
  const model = req.admin?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Ky veprim është i disponueshëm vetëm për llogaritë e përdoruesve.' });
  }
  next();
}

const formatUser = (user) => {
  const model = user.constructor.modelName;
  const base = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
  if (model === 'Admin') return { ...base, accountType: 'admin' };
  if (model === 'ManagedUser') return { ...base, accountType: 'managed' };
  if (model === 'IndividualUser') {
    return { ...base, accountType: 'individual', phone: user.phone || '', ...referralFieldsForUser(user) };
  }
  if (model === 'BusinessUser') {
    return {
      ...base,
      accountType: 'business',
      nipt: user.nipt,
      businessName: user.businessName,
      businessOwner: user.businessOwner,
      businessCategory: user.businessCategory,
      phone: user.phone || '',
      ...referralFieldsForUser(user),
    };
  }
  return { ...base, accountType: 'business' };
};

async function isEmailRegistered(emailNorm) {
  if (await Admin.findOne({ email: emailNorm })) return true;
  if (await ManagedUser.findOne({ email: emailNorm })) return true;
  if (await BusinessUser.findOne({ email: emailNorm })) return true;
  if (await IndividualUser.findOne({ email: emailNorm })) return true;
  return false;
}

router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Emaili dhe fjalëkalimi janë të detyrueshëm.' });
    }

    const emailNorm = email.toLowerCase();
    let user = await Admin.findOne({ email: emailNorm });
    if (!user) user = await BusinessUser.findOne({ email: emailNorm });
    if (!user) user = await IndividualUser.findOne({ email: emailNorm });
    if (!user) user = await ManagedUser.findOne({ email: emailNorm });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i pasaktë.' });
    }

    if (
      (user.constructor.modelName === 'ManagedUser' || user.constructor.modelName === 'IndividualUser') &&
      user.isActive === false
    ) {
      return res.status(401).json({ message: 'Llogaria është çaktivizuar.' });
    }

    if (
      user.constructor.modelName === 'Admin' ||
      user.constructor.modelName === 'ManagedUser' ||
      user.constructor.modelName === 'IndividualUser'
    ) {
      user.lastLogin = new Date();
      await user.save();
    }

    const secret = String(process.env.JWT_SECRET || '').trim();
    if (!secret) {
      console.error('Login blocked: JWT_SECRET is not set');
      return res.status(500).json({ message: 'Gabim serveri.' });
    }

    const token = jwt.sign(
      {
        id: String(user._id),
        email: user.email,
        role: user.role,
        userType: user.constructor.modelName,
      },
      secret,
      { expiresIn: '7d' },
    );
    res.json({ token, admin: formatUser(user) });
  } catch (error) {
    console.error('POST /login error:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/register', authRateLimit, async (req, res) => {
  try {
    const { userType, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Emaili dhe fjalëkalimi janë të detyrueshëm.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' });
    }

    const emailNorm = String(email).toLowerCase().trim();
    if (await isEmailRegistered(emailNorm)) {
      return res.status(400).json({ message: 'Ky email është tashmë i regjistruar.' });
    }

    const secret = String(process.env.JWT_SECRET || '').trim();
    if (!secret) {
      console.error('Register blocked: JWT_SECRET is not set');
      return res.status(500).json({ message: 'Gabim serveri.' });
    }

    if (userType === 'individual') {
      const firstName = String(req.body.firstName || '').trim();
      const lastName = String(req.body.lastName || '').trim();
      if (!firstName || !lastName) {
        return res.status(400).json({ message: 'Emri dhe mbiemri janë të detyrueshëm.' });
      }
      const phone = String(req.body.phone || '').trim().slice(0, 40);
      const referralCode = await allocateUniqueReferralCode();
      const doc = await IndividualUser.create({
        email: emailNorm,
        password,
        firstName,
        lastName,
        referralCode,
        ...(phone ? { phone } : {}),
      });
      const refRaw = req.body.referralCode ?? req.body.ref;
      if (refRaw) await processReferralOnSignup(doc, refRaw);
      await ensureUserReferralCode(doc);
      const token = jwt.sign(
        {
          id: String(doc._id),
          email: doc.email,
          role: doc.role,
          userType: doc.constructor.modelName,
        },
        secret,
        { expiresIn: '7d' },
      );
      return res.status(201).json({ token, admin: formatUser(doc) });
    }

    if (userType === 'business') {
      const nipt = String(req.body.nipt || '').trim();
      const businessName = String(req.body.businessName || '').trim();
      const businessOwner = String(req.body.businessOwner || '').trim();
      const businessCategory = String(req.body.businessCategory || '').trim();
      if (!nipt || !businessName || !businessOwner || !businessCategory) {
        return res.status(400).json({
          message: 'NIPT, emri i biznesit, pronari dhe kategoria janë të detyrueshëm.',
        });
      }
      const niptTaken = await BusinessUser.findOne({ nipt });
      if (niptTaken) {
        return res.status(400).json({ message: 'Ky NIPT është tashmë i regjistruar.' });
      }
      const parts = businessOwner.split(/\s+/).filter(Boolean);
      const phone = String(req.body.phone || '').trim().slice(0, 40);
      const referralCode = await allocateUniqueReferralCode();
      const doc = await BusinessUser.create({
        email: emailNorm,
        password,
        nipt,
        businessName,
        businessOwner,
        businessCategory,
        firstName: parts[0] || businessOwner,
        lastName: parts.slice(1).join(' ') || '',
        referralCode,
        ...(phone ? { phone } : {}),
      });
      const refRaw = req.body.referralCode ?? req.body.ref;
      if (refRaw) await processReferralOnSignup(doc, refRaw);
      await ensureUserReferralCode(doc);
      const token = jwt.sign(
        {
          id: String(doc._id),
          email: doc.email,
          role: doc.role,
          userType: doc.constructor.modelName,
        },
        secret,
        { expiresIn: '7d' },
      );
      return res.status(201).json({ token, admin: formatUser(doc) });
    }

    return res.status(400).json({ message: 'Lloji i përdoruesit nuk është i vlefshëm.' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ky email ose NIPT është tashmë i regjistruar.' });
    }
    console.error('POST /register error:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.get('/admin/me', authMiddleware, async (req, res) => {
  try {
    res.json({ admin: formatUser(req.admin) });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.put('/admin/update-profile', authMiddleware, requireAdminRole, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const admin = req.admin;

    if (email === undefined || !String(email).trim()) {
      return res.status(400).json({ message: 'Emaili është i detyrueshëm.' });
    }

    if (email && String(email).toLowerCase() !== admin.email) {
      const nextEmail = String(email).toLowerCase().trim();
      const existing = await Admin.findOne({ email: nextEmail });
      if (existing && String(existing._id) !== String(admin._id)) {
        return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
      }
      admin.email = nextEmail;
    }

    if (firstName !== undefined) admin.firstName = String(firstName).trim();
    if (lastName !== undefined) admin.lastName = String(lastName).trim();
    await admin.save();

    res.json({ message: 'Profili u përditësua.', admin: formatUser(admin) });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.put('/admin/change-password', authMiddleware, requireAdminRole, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Fjalëkalimi aktual dhe i ri janë të detyrueshëm.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.' });
    }
    if (!(await req.admin.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Fjalëkalimi aktual është i pasaktë.' });
    }

    req.admin.password = newPassword;
    await req.admin.save();
    res.json({ message: 'Fjalëkalimi u ndryshua.' });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.put('/portal/update-profile', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const phone = String(req.body.phone ?? '').trim().slice(0, 40);
    req.admin.phone = phone;
    await req.admin.save();
    res.json({ message: 'Profili u përditësua.', admin: formatUser(req.admin) });
  } catch (error) {
    console.error('PUT /portal/update-profile:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.put('/portal/change-password', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Fjalëkalimi aktual dhe i ri janë të detyrueshëm.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Fjalëkalimi i ri duhet të ketë të paktën 6 karaktere.' });
    }
    if (!(await req.admin.comparePassword(currentPassword))) {
      return res.status(401).json({ message: 'Fjalëkalimi aktual është i pasaktë.' });
    }

    req.admin.password = newPassword;
    await req.admin.save();
    res.json({ message: 'Fjalëkalimi u ndryshua.' });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;

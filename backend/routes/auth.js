'use strict';

const express = require('express');
const { getSupabaseAdmin, createAuthPasswordClient } = require('../lib/supabase');
const { getProfileById, getProfileByEmail, insertProfile, mapProfile } = require('../lib/profiles');
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

function requireAdminRole(req, res, next) {
  if (!req.admin || req.admin.constructor.modelName !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm administratorët mund ta përdorin këtë funksion.' });
  }
  next();
}

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
    id: user.id,
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
  return Boolean(await getProfileByEmail(emailNorm));
}

async function createAuthUser({ email, password, metadata }) {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata || {},
  });
  if (error) {
    const msg = String(error.message || '');
    if (/already|registered|exists/i.test(msg)) {
      const err = new Error('EMAIL_TAKEN');
      err.code = 'EMAIL_TAKEN';
      throw err;
    }
    throw error;
  }
  return data.user;
}

async function signInWithPassword(email, password) {
  // Ephemeral client — must not use getSupabaseAdmin() (sign-in would stick a user JWT on it).
  const sb = createAuthPasswordClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error };
  return { session: data.session, user: data.user };
}

router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Emaili dhe fjalëkalimi janë të detyrueshëm.' });
    }

    const emailNorm = String(email).toLowerCase().trim();
    const { session, error } = await signInWithPassword(emailNorm, password);
    if (error || !session) {
      return res.status(401).json({ message: 'Email ose fjalëkalim i pasaktë.' });
    }

    const profile = await getProfileById(session.user.id);
    if (!profile) {
      return res.status(401).json({ message: 'Profili nuk u gjet. Kontaktoni mbështetjen.' });
    }

    if (
      (profile.constructor.modelName === 'ManagedUser' ||
        profile.constructor.modelName === 'IndividualUser') &&
      profile.isActive === false
    ) {
      return res.status(401).json({ message: 'Llogaria është çaktivizuar.' });
    }

    profile.lastLogin = new Date().toISOString();
    await profile.save();

    res.json({ token: session.access_token, admin: formatUser(profile) });
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

    if (userType === 'individual') {
      const firstName = String(req.body.firstName || '').trim();
      const lastName = String(req.body.lastName || '').trim();
      if (!firstName || !lastName) {
        return res.status(400).json({ message: 'Emri dhe mbiemri janë të detyrueshëm.' });
      }
      const phone = String(req.body.phone || '').trim().slice(0, 40);
      const referralCode = await allocateUniqueReferralCode();

      const authUser = await createAuthUser({
        email: emailNorm,
        password,
        metadata: { account_type: 'individual', first_name: firstName, last_name: lastName },
      });

      const doc = await insertProfile({
        id: authUser.id,
        email: emailNorm,
        first_name: firstName,
        last_name: lastName,
        phone: phone || '',
        account_type: 'individual',
        role: 'individual-user',
        referral_code: referralCode,
        is_active: true,
      });

      const refRaw = req.body.referralCode ?? req.body.ref;
      if (refRaw) await processReferralOnSignup(doc, refRaw);
      await ensureUserReferralCode(doc);

      const { session, error: signErr } = await signInWithPassword(emailNorm, password);
      if (signErr || !session) {
        return res.status(201).json({ token: null, admin: formatUser(doc), message: 'Llogaria u krijua. Identifikohuni.' });
      }
      return res.status(201).json({ token: session.access_token, admin: formatUser(doc) });
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

      const sb = getSupabaseAdmin();
      const { data: niptTaken } = await sb.from('profiles').select('id').eq('nipt', nipt).maybeSingle();
      if (niptTaken) {
        return res.status(400).json({ message: 'Ky NIPT është tashmë i regjistruar.' });
      }

      const parts = businessOwner.split(/\s+/).filter(Boolean);
      const phone = String(req.body.phone || '').trim().slice(0, 40);
      const referralCode = await allocateUniqueReferralCode();

      const authUser = await createAuthUser({
        email: emailNorm,
        password,
        metadata: { account_type: 'business', business_name: businessName },
      });

      const doc = await insertProfile({
        id: authUser.id,
        email: emailNorm,
        first_name: parts[0] || businessOwner,
        last_name: parts.slice(1).join(' ') || '',
        phone: phone || '',
        account_type: 'business',
        role: 'business-user',
        nipt,
        business_name: businessName,
        business_owner: businessOwner,
        business_category: businessCategory,
        referral_code: referralCode,
        is_active: true,
      });

      const refRaw = req.body.referralCode ?? req.body.ref;
      if (refRaw) await processReferralOnSignup(doc, refRaw);
      await ensureUserReferralCode(doc);

      const { session, error: signErr } = await signInWithPassword(emailNorm, password);
      if (signErr || !session) {
        return res.status(201).json({ token: null, admin: formatUser(doc), message: 'Llogaria u krijua. Identifikohuni.' });
      }
      return res.status(201).json({ token: session.access_token, admin: formatUser(doc) });
    }

    return res.status(400).json({ message: 'Lloji i përdoruesit nuk është i vlefshëm.' });
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') {
      return res.status(400).json({ message: 'Ky email është tashmë i regjistruar.' });
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

    const nextEmail = String(email).toLowerCase().trim();
    if (nextEmail !== admin.email) {
      const existing = await getProfileByEmail(nextEmail);
      if (existing && existing.id !== admin.id) {
        return res.status(400).json({ message: 'Ky email është tashmë në përdorim.' });
      }
      admin.email = nextEmail;
      await getSupabaseAdmin().auth.admin.updateUserById(admin.id, { email: nextEmail });
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

    const { error: checkErr } = await signInWithPassword(req.admin.email, currentPassword);
    if (checkErr) {
      return res.status(401).json({ message: 'Fjalëkalimi aktual është i pasaktë.' });
    }

    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(req.admin.id, {
      password: String(newPassword),
    });
    if (error) throw error;
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

    const { error: checkErr } = await signInWithPassword(req.admin.email, currentPassword);
    if (checkErr) {
      return res.status(401).json({ message: 'Fjalëkalimi aktual është i pasaktë.' });
    }

    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(req.admin.id, {
      password: String(newPassword),
    });
    if (error) throw error;
    res.json({ message: 'Fjalëkalimi u ndryshua.' });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

module.exports = router;

'use strict';

const express = require('express');
const { getSupabaseAdmin, createAuthPasswordClient, findAuthUserByEmail } = require('../lib/supabase');
const { getProfileById, getProfileByEmail, insertProfile, ensureProfileForAuthUser } = require('../lib/profiles');
const authMiddleware = require('../middleware/auth');
const {
  allocateUniqueReferralCode,
  processReferralOnSignup,
  ensureUserReferralCode,
  referralFieldsForUser,
} = require('../lib/referrals');
const { imageUpload } = require('../lib/image-upload');
const { uploadBuffersToSupabase } = require('../lib/storage-uploads');
const { isUuid } = require('../lib/public-listings/query-helpers');
const { sanitizeShareThemeColor } = require('../lib/share-theme-color');
const {
  sendSignupConfirmation,
  sendPasswordReset,
  sendPasswordChangedNotice,
  sendFromSupabaseHook,
  displayNameFromProfile,
} = require('../lib/mail/auth-emails');
const { isResendConfigured } = require('../lib/mail/resend');
const { verifySendEmailHook } = require('../lib/mail/hook-secret');

const router = express.Router();
const rateLimit = require('../middleware/rate-limit');

const authRateLimit = rateLimit({ windowMs: 60_000, max: 15 });
const mailRateLimit = rateLimit({ windowMs: 60_000, max: 5 });

const ACCOUNT_PHONE_RE = /^[\d+\s().-]{6,40}$/;

function parseRequiredPhone(raw) {
  const phone = String(raw || '')
    .trim()
    .slice(0, 40);
  if (phone.length < 6) {
    return { ok: false, message: 'Numri i telefonit është i detyrueshëm.' };
  }
  if (!ACCOUNT_PHONE_RE.test(phone)) {
    return { ok: false, message: 'Numri i telefonit përmban karaktere të pavlefshme.' };
  }
  return { ok: true, phone };
}

/**
 * Resolve optional based-city from request body.
 * Returns { ok: true, id, name } | { ok: true, id: null, name: null } | { ok: false, message }.
 */
async function resolveBasedCity(raw) {
  if (raw === undefined) return { ok: true, skipped: true };
  const id = String(raw ?? '').trim();
  if (!id) return { ok: true, id: null, name: null };
  if (!isUuid(id)) return { ok: false, message: 'Qyteti i zgjedhur nuk është i vlefshëm.' };
  const { data, error } = await getSupabaseAdmin()
    .from('real_estate_cities')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, message: 'Qyteti i zgjedhur nuk u gjet.' };
  return { ok: true, id: data.id, name: data.name || '' };
}

function portalBasedCityFields(user) {
  return {
    basedCityId: user.basedCityId || null,
    basedCityName: user.basedCityName || '',
  };
}

function portalShareThemeFields(user) {
  return {
    shareThemeColor: user.shareThemeColor || null,
  };
}

function portalSocialFields(user) {
  return {
    instagramUrl: user.instagramUrl || null,
    tiktokUrl: user.tiktokUrl || null,
    linkedinUrl: user.linkedinUrl || null,
    websiteUrl: user.websiteUrl || null,
  };
}

async function uploadAvatarBuffer(file) {
  const urls = await uploadBuffersToSupabase(
    [
      {
        buffer: file.buffer,
        originalname: file.originalname || 'avatar.jpg',
        mimetype: file.mimetype || 'image/jpeg',
      },
    ],
    'avatars'
  );
  if (!urls[0]) throw new Error('Avatar upload returned no URL');
  return urls[0];
}

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
    isPrivate: Boolean(user.isPrivate),
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
  if (model === 'Admin') return { ...base, accountType: 'admin' };
  if (model === 'ManagedUser') return { ...base, accountType: 'managed' };
  if (model === 'IndividualUser') {
    return {
      ...base,
      accountType: 'individual',
      phone: user.phone || '',
      avatar: user.avatarUrl || '',
      boostCredits: Number(user.boostCredits) || 0,
      autoRefreshSlots: Number(user.autoRefreshSlots) || 0,
      verified: Boolean(user.professionalsVerifiedAt || user.jobsEmployerVerifiedAt),
      ...portalBasedCityFields(user),
      ...portalShareThemeFields(user),
      ...portalSocialFields(user),
      ...referralFieldsForUser(user),
    };
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
      avatar: user.avatarUrl || '',
      boostCredits: Number(user.boostCredits) || 0,
      autoRefreshSlots: Number(user.autoRefreshSlots) || 0,
      verified: Boolean(user.professionalsVerifiedAt || user.jobsEmployerVerifiedAt),
      ...portalBasedCityFields(user),
      ...portalShareThemeFields(user),
      ...portalSocialFields(user),
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
    email_confirm: false,
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

async function queueAuthEmail(label, fn) {
  try {
    if (!isResendConfigured()) {
      console.warn(`auth email skipped (${label}): RESEND_API_KEY is not set`);
      return;
    }
    await fn();
    console.log(`auth email sent (${label})`);
  } catch (err) {
    console.error(`auth email (${label}):`, err?.message || err);
  }
}

function sessionPayload(session, profile) {
  return {
    token: session.access_token,
    refreshToken: session.refresh_token,
    admin: formatUser(profile),
  };
}

async function verifyEmailOtp(tokenHash, type) {
  const hashed = String(tokenHash || '').trim();
  const requested = String(type || 'magiclink').trim() || 'magiclink';
  if (!hashed) {
    const err = new Error('TOKEN_MISSING');
    err.code = 'TOKEN_MISSING';
    throw err;
  }
  const sb = createAuthPasswordClient();
  const candidates = [
    ...new Set([requested, 'magiclink', 'signup', 'email', 'recovery', 'invite', 'email_change'].filter(Boolean)),
  ];
  let lastError = null;
  for (const otpType of candidates) {
    const { data, error } = await sb.auth.verifyOtp({
      token_hash: hashed,
      type: otpType,
    });
    if (error || !data?.session || !data?.user) {
      lastError = error;
      continue;
    }
    if (!data.user.email_confirmed_at) {
      await getSupabaseAdmin().auth.admin.updateUserById(data.user.id, { email_confirm: true });
    }
    return data;
  }
  const err = new Error(lastError?.message || 'TOKEN_INVALID');
  err.code = 'TOKEN_INVALID';
  throw err;
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
    const { session, user: authUser, error } = await signInWithPassword(emailNorm, password);
    if (error || !session) {
      const msg = String(error?.message || '');
      if (/not confirmed|email_not_confirmed/i.test(msg)) {
        return res.status(403).json({
          code: 'EMAIL_NOT_CONFIRMED',
          message: 'Konfirmo emailin për të hyrë. Kontrollo kutinë e postës.',
        });
      }
      return res.status(401).json({ message: 'Email ose fjalëkalim i pasaktë.' });
    }

    let profile = await getProfileById(session.user.id);
    if (!profile) {
      // Auth user can outlive profiles after a schema reset — rebuild from metadata.
      profile = await ensureProfileForAuthUser(authUser || session.user);
    }
    if (!profile) {
      return res.status(401).json({ message: 'Profili nuk u gjet. Kontaktoni mbështetjen.' });
    }
    if (profile.constructor.modelName === 'IndividualUser' || profile.constructor.modelName === 'BusinessUser') {
      try {
        await ensureUserReferralCode(profile);
      } catch (refErr) {
        console.warn('login referral code:', refErr?.message || refErr);
      }
    }

    if (
      (profile.constructor.modelName === 'ManagedUser' || profile.constructor.modelName === 'IndividualUser') &&
      profile.isActive === false
    ) {
      return res.status(401).json({ message: 'Llogaria është çaktivizuar.' });
    }

    profile.lastLogin = new Date().toISOString();
    await profile.save();

    try {
      const { recordLoginStreak } = require('../lib/login-streak');
      await recordLoginStreak(profile);
    } catch (streakErr) {
      console.warn('login streak:', streakErr?.message || streakErr);
    }

    res.json({
      token: session.access_token,
      refreshToken: session.refresh_token,
      admin: formatUser(profile),
    });
  } catch (error) {
    console.error('POST /login error:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/refresh', authRateLimit, async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken || '').trim();
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token mungon.' });
    }
    const sb = createAuthPasswordClient();
    const { data, error } = await sb.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session?.access_token) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    let profile = await getProfileById(data.session.user.id);
    if (!profile) {
      profile = await ensureProfileForAuthUser(data.session.user);
    }
    if (!profile) {
      return res.status(401).json({ message: 'Profili nuk u gjet. Kontaktoni mbështetjen.' });
    }
    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      admin: formatUser(profile),
    });
  } catch (error) {
    console.error('POST /refresh error:', error?.message || error);
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
      const parsedPhone = parseRequiredPhone(req.body.phone);
      if (!parsedPhone.ok) return res.status(400).json({ message: parsedPhone.message });
      const based = await resolveBasedCity(req.body.basedCityId ?? req.body.cityId);
      if (!based.ok) return res.status(400).json({ message: based.message });
      const referralCode = await allocateUniqueReferralCode();

      const authUser = await createAuthUser({
        email: emailNorm,
        password,
        metadata: {
          account_type: 'individual',
          first_name: firstName,
          last_name: lastName,
          phone: parsedPhone.phone,
        },
      });

      const doc = await insertProfile({
        id: authUser.id,
        email: emailNorm,
        first_name: firstName,
        last_name: lastName,
        phone: parsedPhone.phone,
        account_type: 'individual',
        role: 'individual-user',
        referral_code: referralCode,
        based_city_id: based.skipped ? null : based.id,
        based_city_name: based.skipped ? null : based.name,
        is_active: true,
      });

      const refRaw = req.body.referralCode ?? req.body.ref;
      if (refRaw) await processReferralOnSignup(doc, refRaw);
      await ensureUserReferralCode(doc);

      await queueAuthEmail('signup', () => sendSignupConfirmation(emailNorm, { name: displayNameFromProfile(doc) }));
      return res.status(201).json({
        needsEmailConfirmation: true,
        email: emailNorm,
        admin: formatUser(doc),
        message: 'Llogaria u krijua. Konfirmo emailin për të hyrë.',
      });
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
      const parsedPhone = parseRequiredPhone(req.body.phone);
      if (!parsedPhone.ok) return res.status(400).json({ message: parsedPhone.message });
      const based = await resolveBasedCity(req.body.basedCityId ?? req.body.cityId);
      if (!based.ok) return res.status(400).json({ message: based.message });
      const referralCode = await allocateUniqueReferralCode();

      const authUser = await createAuthUser({
        email: emailNorm,
        password,
        metadata: {
          account_type: 'business',
          business_name: businessName,
          phone: parsedPhone.phone,
        },
      });

      const doc = await insertProfile({
        id: authUser.id,
        email: emailNorm,
        first_name: parts[0] || businessOwner,
        last_name: parts.slice(1).join(' ') || '',
        phone: parsedPhone.phone,
        account_type: 'business',
        role: 'business-user',
        nipt,
        business_name: businessName,
        business_owner: businessOwner,
        business_category: businessCategory,
        referral_code: referralCode,
        based_city_id: based.skipped ? null : based.id,
        based_city_name: based.skipped ? null : based.name,
        is_active: true,
      });

      const refRaw = req.body.referralCode ?? req.body.ref;
      if (refRaw) await processReferralOnSignup(doc, refRaw);
      await ensureUserReferralCode(doc);

      await queueAuthEmail('signup', () => sendSignupConfirmation(emailNorm, { name: displayNameFromProfile(doc) }));
      return res.status(201).json({
        needsEmailConfirmation: true,
        email: emailNorm,
        admin: formatUser(doc),
        message: 'Llogaria u krijua. Konfirmo emailin për të hyrë.',
      });
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
    await queueAuthEmail('password-changed', () =>
      sendPasswordChangedNotice(req.admin.email, { name: displayNameFromProfile(req.admin) })
    );
    res.json({ message: 'Fjalëkalimi u ndryshua.' });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

function sanitizeAvatarUrl(value) {
  const url = String(value ?? '')
    .trim()
    .slice(0, 2000);
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

function sanitizeSocialUrl(value) {
  const raw = String(value ?? '')
    .trim()
    .slice(0, 500);
  if (!raw) return '';
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

router.put('/portal/update-profile', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const model = req.admin.constructor.modelName;
    const body = req.body || {};

    if (body.phone !== undefined) {
      const parsedPhone = parseRequiredPhone(body.phone);
      if (!parsedPhone.ok) return res.status(400).json({ message: parsedPhone.message });
      req.admin.phone = parsedPhone.phone;
    }

    if (body.basedCityId !== undefined || body.cityId !== undefined) {
      const based = await resolveBasedCity(body.basedCityId !== undefined ? body.basedCityId : body.cityId);
      if (!based.ok) return res.status(400).json({ message: based.message });
      if (!based.skipped) {
        req.admin.basedCityId = based.id;
        req.admin.basedCityName = based.name || '';
      }
    }

    if (body.shareThemeColor !== undefined) {
      const color = sanitizeShareThemeColor(body.shareThemeColor);
      if (color === false) {
        return res.status(400).json({ message: 'Ngjyra e temës nuk është e vlefshme.' });
      }
      req.admin.shareThemeColor = color;
    }

    if (body.isPrivate !== undefined) {
      req.admin.isPrivate = Boolean(body.isPrivate);
    }

    if (body.avatar !== undefined || body.avatarUrl !== undefined) {
      const raw = body.avatar !== undefined ? body.avatar : body.avatarUrl;
      const avatarUrl = sanitizeAvatarUrl(raw);
      if (avatarUrl === null) {
        return res.status(400).json({ message: 'URL e fotos së profilit nuk është e vlefshme.' });
      }
      req.admin.avatarUrl = avatarUrl;
    }

    for (const [field, label] of [
      ['instagramUrl', 'Instagram'],
      ['tiktokUrl', 'TikTok'],
      ['linkedinUrl', 'LinkedIn'],
      ['websiteUrl', 'Website'],
    ]) {
      if (body[field] === undefined) continue;
      const socialUrl = sanitizeSocialUrl(body[field]);
      if (socialUrl === null) {
        return res.status(400).json({ message: `Linku i ${label} nuk është i vlefshëm.` });
      }
      req.admin[field] = socialUrl;
    }

    if (model === 'IndividualUser') {
      if (body.firstName !== undefined) {
        const firstName = String(body.firstName ?? '')
          .trim()
          .slice(0, 80);
        if (!firstName) return res.status(400).json({ message: 'Emri është i detyrueshëm.' });
        req.admin.firstName = firstName;
      }
      if (body.lastName !== undefined) {
        const lastName = String(body.lastName ?? '')
          .trim()
          .slice(0, 80);
        if (!lastName) return res.status(400).json({ message: 'Mbiemri është i detyrueshëm.' });
        req.admin.lastName = lastName;
      }
    }

    if (model === 'BusinessUser') {
      if (body.businessName !== undefined) {
        const businessName = String(body.businessName ?? '')
          .trim()
          .slice(0, 120);
        if (!businessName) return res.status(400).json({ message: 'Emri i biznesit është i detyrueshëm.' });
        req.admin.businessName = businessName;
      }
      if (body.businessOwner !== undefined) {
        req.admin.businessOwner = String(body.businessOwner ?? '')
          .trim()
          .slice(0, 120);
      }
      if (body.businessCategory !== undefined) {
        req.admin.businessCategory = String(body.businessCategory ?? '')
          .trim()
          .slice(0, 80);
      }
    }

    await req.admin.save();
    res.json({ message: 'Profili u përditësua.', admin: formatUser(req.admin) });
  } catch (error) {
    console.error('PUT /portal/update-profile:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** POST /api/auth/portal/convert-to-business — individual → business account. */
router.post('/portal/convert-to-business', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    if (req.admin.constructor.modelName !== 'IndividualUser') {
      return res.status(400).json({ message: 'Llogaria juaj është tashmë llogari biznesi.' });
    }

    const body = req.body || {};
    const nipt = String(body.nipt || '')
      .trim()
      .slice(0, 40);
    const businessName = String(body.businessName || '')
      .trim()
      .slice(0, 120);
    const businessOwner = String(body.businessOwner || '')
      .trim()
      .slice(0, 120);
    const businessCategory = String(body.businessCategory || '')
      .trim()
      .slice(0, 80);

    if (!nipt || !businessName || !businessOwner || !businessCategory) {
      return res.status(400).json({
        message: 'NIPT, emri i biznesit, pronari dhe kategoria janë të detyrueshëm.',
      });
    }

    const sb = getSupabaseAdmin();
    const { data: niptTaken, error: niptErr } = await sb
      .from('profiles')
      .select('id')
      .eq('nipt', nipt)
      .neq('id', req.admin.id)
      .maybeSingle();
    if (niptErr) throw niptErr;
    if (niptTaken) {
      return res.status(400).json({ message: 'Ky NIPT është tashmë i regjistruar.' });
    }

    const parts = businessOwner.split(/\s+/).filter(Boolean);
    req.admin.accountType = 'business';
    req.admin.role = 'business-user';
    req.admin.nipt = nipt;
    req.admin.businessName = businessName;
    req.admin.businessOwner = businessOwner;
    req.admin.businessCategory = businessCategory;
    if (!String(req.admin.firstName || '').trim()) {
      req.admin.firstName = parts[0] || businessOwner;
    }
    if (!String(req.admin.lastName || '').trim()) {
      req.admin.lastName = parts.slice(1).join(' ') || '';
    }
    if (body.phone !== undefined) {
      const parsedPhone = parseRequiredPhone(body.phone);
      if (!parsedPhone.ok) return res.status(400).json({ message: parsedPhone.message });
      req.admin.phone = parsedPhone.phone;
    }

    await req.admin.save();

    try {
      await sb.auth.admin.updateUserById(req.admin.id, {
        user_metadata: {
          account_type: 'business',
          business_name: businessName,
        },
      });
    } catch (metaErr) {
      console.warn('convert-to-business metadata:', metaErr?.message || metaErr);
    }

    // Reload so constructor.modelName / formatUser reflect business account.
    const refreshed = await getProfileById(req.admin.id);
    res.json({
      message: 'Llogaria u kthye në llogari biznesi.',
      admin: formatUser(refreshed || req.admin),
    });
  } catch (error) {
    console.error('POST /portal/convert-to-business:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

function parseAvatar(req, res, next) {
  imageUpload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Foto duhet të jetë nën 8 MB.' });
    }
    if (/images are allowed/i.test(err.message || '')) {
      return res.status(400).json({ message: 'Lejohen vetëm foto JPEG, PNG, WEBP dhe GIF.' });
    }
    console.error('POST /portal/avatar multer:', err?.message || err);
    return res.status(400).json({ message: 'Nuk u arrit ngarkimi i fotos.' });
  });
}

/** POST /api/auth/portal/avatar — upload + persist profile photo in one step. */
router.post('/portal/avatar', authMiddleware, requirePortalUser, parseAvatar, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nuk u zgjodh asnjë foto.' });
    }
    const avatarUrl = await uploadAvatarBuffer(req.file);
    req.admin.avatarUrl = avatarUrl;
    await req.admin.save();
    return res.json({ message: 'Foto e profilit u përditësua.', admin: formatUser(req.admin), avatarUrl });
  } catch (err) {
    console.error('POST /portal/avatar:', err?.message || err);
    return res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** DELETE /api/auth/portal/avatar — clear profile photo. */
router.delete('/portal/avatar', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    req.admin.avatarUrl = '';
    await req.admin.save();
    res.json({ message: 'Foto e profilit u hoq.', admin: formatUser(req.admin) });
  } catch (error) {
    console.error('DELETE /portal/avatar:', error?.message || error);
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
    await queueAuthEmail('password-changed', () =>
      sendPasswordChangedNotice(req.admin.email, { name: displayNameFromProfile(req.admin) })
    );
    res.json({ message: 'Fjalëkalimi u ndryshua.' });
  } catch (error) {
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

function yieldEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

router.post('/resend-confirmation', mailRateLimit, async (req, res) => {
  try {
    const emailNorm = String(req.body?.email || '')
      .toLowerCase()
      .trim();
    if (!emailNorm) {
      return res.status(400).json({ message: 'Emaili është i detyrueshëm.' });
    }
    const profile = await getProfileByEmail(emailNorm);
    if (profile) {
      const { data } = await getSupabaseAdmin().auth.admin.getUserById(profile.id);
      if (data?.user?.email_confirmed_at) {
        return res.json({ ok: true, message: 'Emaili është tashmë i konfirmuar. Mund të hysh.' });
      }
    }
    res.json({
      ok: true,
      message: 'Nëse llogaria ekziston, të dërguam një email konfirmimi.',
    });
    await yieldEventLoop();
    if (profile) {
      await queueAuthEmail('resend-signup', () =>
        sendSignupConfirmation(emailNorm, { name: displayNameFromProfile(profile) })
      );
    }
  } catch (error) {
    console.error('POST /resend-confirmation:', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Gabim serveri.' });
    }
  }
});

router.post('/forgot-password', mailRateLimit, async (req, res) => {
  try {
    const emailNorm = String(req.body?.email || '')
      .toLowerCase()
      .trim();
    if (!emailNorm) {
      return res.status(400).json({ message: 'Emaili është i detyrueshëm.' });
    }
    const profile = await getProfileByEmail(emailNorm);
    const authUser = profile ? null : await findAuthUserByEmail(emailNorm);
    res.json({
      ok: true,
      message: 'Nëse llogaria ekziston, të dërguam një link për rivendosjen e fjalëkalimit. Kontrollo kutinë dhe spam.',
    });
    await yieldEventLoop();
    if (profile || authUser) {
      await queueAuthEmail('recovery', () => sendPasswordReset(emailNorm, { name: displayNameFromProfile(profile) }));
    }
  } catch (error) {
    console.error('POST /forgot-password:', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Gabim serveri.' });
    }
  }
});

router.post('/confirm', authRateLimit, async (req, res) => {
  try {
    const tokenHash = String(req.body?.tokenHash || req.body?.token_hash || '').trim();
    const type = String(req.body?.type || 'magiclink').trim() || 'magiclink';
    const verified = await verifyEmailOtp(tokenHash, type);
    let profile = await getProfileById(verified.user.id);
    if (!profile) profile = await ensureProfileForAuthUser(verified.user);
    if (!profile) {
      return res.status(401).json({ message: 'Profili nuk u gjet. Kontaktoni mbështetjen.' });
    }
    return res.json(sessionPayload(verified.session, profile));
  } catch (error) {
    if (error.code === 'TOKEN_MISSING' || error.code === 'TOKEN_INVALID') {
      return res.status(400).json({ message: 'Linku i konfirmimit është i pavlefshëm ose ka skaduar.' });
    }
    console.error('POST /confirm:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

router.post('/reset-password', authRateLimit, async (req, res) => {
  try {
    const tokenHash = String(req.body?.tokenHash || req.body?.token_hash || '').trim();
    const type = String(req.body?.type || 'recovery').trim() || 'recovery';
    const newPassword = String(req.body?.newPassword || req.body?.password || '');
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' });
    }
    const verified = await verifyEmailOtp(tokenHash, type);
    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(verified.user.id, {
      password: newPassword,
    });
    if (error) throw error;
    let profile = await getProfileById(verified.user.id);
    if (!profile) profile = await ensureProfileForAuthUser(verified.user);
    if (!profile) {
      return res.status(401).json({ message: 'Profili nuk u gjet. Kontaktoni mbështetjen.' });
    }
    await queueAuthEmail('password-changed', () =>
      sendPasswordChangedNotice(profile.email, { name: displayNameFromProfile(profile) })
    );
    return res.json({
      ...sessionPayload(verified.session, profile),
      message: 'Fjalëkalimi u ndryshua.',
    });
  } catch (error) {
    if (error.code === 'TOKEN_MISSING' || error.code === 'TOKEN_INVALID') {
      return res.status(400).json({ message: 'Linku i rivendosjes është i pavlefshëm ose ka skaduar.' });
    }
    console.error('POST /reset-password:', error?.message || error);
    res.status(500).json({ message: 'Gabim serveri.' });
  }
});

/** Supabase Auth Send Email Hook — point the dashboard webhook here to brand all auth mail. */
router.post('/hooks/send-email', async (req, res) => {
  try {
    if (!verifySendEmailHook(req)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const payload = req.body || {};
    // ACK first: generateLink waits on this webhook. Awaiting Resend here can
    // deadlock forgot-password on a single-concurrency instance.
    res.status(200).json({ ok: true });
    await yieldEventLoop();
    await sendFromSupabaseHook(payload);
  } catch (error) {
    console.error('POST /hooks/send-email:', error?.message || error);
    if (!res.headersSent) {
      res.status(500).json({ message: error?.message || 'Gabim serveri.' });
    }
  }
});

module.exports = router;

'use strict';

const { getSupabaseAdmin } = require('../supabase');
const { getFrontendBaseUrl } = require('../site-url');
const { sendResendEmail, isResendConfigured } = require('./resend');
const { renderAuthEmail } = require('./templates');

function frontendAuthUrl(path, tokenHash, type) {
  const params = new URLSearchParams();
  if (tokenHash) params.set('token_hash', tokenHash);
  if (type) params.set('type', type);
  const qs = params.toString();
  return `${getFrontendBaseUrl()}${path}${qs ? `?${qs}` : ''}`;
}

async function generateAuthLink(type, email, extra = {}) {
  const sb = getSupabaseAdmin();
  const payload = { type, email };
  if (extra.password) payload.password = extra.password;
  payload.options = {
    redirectTo: extra.redirectTo || `${getFrontendBaseUrl()}/user/auth/confirm`,
  };
  if (extra.data) payload.options.data = extra.data;
  const { data, error } = await sb.auth.admin.generateLink(payload);
  if (error) throw error;
  return data;
}

function linkFromGenerate(data, fallbackPath, fallbackType) {
  const props = data?.properties || {};
  const hashed = String(props.hashed_token || '').trim();
  const vtype = String(props.verification_type || fallbackType || '').trim();
  if (!hashed) {
    const action = String(props.action_link || '').trim();
    if (action) return { url: action, type: vtype };
    throw new Error('Supabase generateLink returned no token');
  }
  return {
    url: frontendAuthUrl(fallbackPath, hashed, vtype || fallbackType),
    type: vtype || fallbackType,
    hashedToken: hashed,
  };
}

async function sendSignupConfirmation(email, { name } = {}) {
  const data = await generateAuthLink('magiclink', email);
  const link = linkFromGenerate(data, '/user/auth/confirm', 'magiclink');
  await sendResendEmail({
    to: email,
    subject: 'Konfirmo emailin — KuTaGjej',
    html: renderAuthEmail({
      preheader: 'Konfirmo adresën tënde për të aktivizuar llogarinë në KuTaGjej.',
      title: 'Konfirmo emailin',
      greeting: name ? `Përshëndetje ${name},` : 'Përshëndetje,',
      body: 'Faleminderit që u regjistruat në KuTaGjej. Shtyp butonin më poshtë për të konfirmuar emailin dhe aktivizuar llogarinë.',
      cta: 'Konfirmo emailin',
      href: link.url,
      footnote: 'Nëse nuk ke krijuar këtë llogari, mund ta injorosh këtë mesazh. Linku skadon pas pak orësh.',
    }),
  });
  return link;
}

async function sendPasswordReset(email, { name } = {}) {
  const data = await generateAuthLink('recovery', email, {
    redirectTo: `${getFrontendBaseUrl()}/user/auth/reset-password`,
  });
  const link = linkFromGenerate(data, '/user/auth/reset-password', 'recovery');
  await sendResendEmail({
    to: email,
    subject: 'Rivendos fjalëkalimin — KuTaGjej',
    html: renderAuthEmail({
      preheader: 'Rivendos fjalëkalimin e llogarisë tënde në KuTaGjej.',
      title: 'Rivendos fjalëkalimin',
      greeting: name ? `Përshëndetje ${name},` : 'Përshëndetje,',
      body: 'Morëm një kërkesë për të ndryshuar fjalëkalimin. Shtyp butonin më poshtë dhe zgjidh një fjalëkalim të ri.',
      cta: 'Ndrysho fjalëkalimin',
      href: link.url,
      footnote: 'Nëse nuk e kërkove këtë ndryshim, injoroje këtë email. Fjalëkalimi yt nuk ndryshon derisa të zgjedhësh një të ri.',
    }),
  });
  return link;
}

async function sendPasswordChangedNotice(email, { name } = {}) {
  await sendResendEmail({
    to: email,
    subject: 'Fjalëkalimi u ndryshua — KuTaGjej',
    html: renderAuthEmail({
      preheader: 'Fjalëkalimi i llogarisë tënde në KuTaGjej sapo u ndryshua.',
      title: 'Fjalëkalimi u ndryshua',
      greeting: name ? `Përshëndetje ${name},` : 'Përshëndetje,',
      body: 'Fjalëkalimi i llogarisë tënde sapo u ndryshua. Nëse e bëre ti, nuk të duhet asgjë tjetër.',
      cta: 'Hyr në KuTaGjej',
      href: `${getFrontendBaseUrl()}/user/auth`,
      footnote: 'Nëse nuk e ndryshove ti, rivendos fjalëkalimin menjëherë ose kontakto mbështetjen.',
    }),
  });
}

async function sendEmailChangeConfirmation(email, { name } = {}) {
  const data = await generateAuthLink('email_change_new', email, {
    redirectTo: `${getFrontendBaseUrl()}/user/auth/confirm`,
  });
  const link = linkFromGenerate(data, '/user/auth/confirm', 'email_change');
  await sendResendEmail({
    to: email,
    subject: 'Konfirmo emailin e ri — KuTaGjej',
    html: renderAuthEmail({
      preheader: 'Konfirmo adresën e re të emailit për llogarinë KuTaGjej.',
      title: 'Konfirmo emailin e ri',
      greeting: name ? `Përshëndetje ${name},` : 'Përshëndetje,',
      body: 'Për të përfunduar ndryshimin e emailit, shtyp butonin më poshtë.',
      cta: 'Konfirmo emailin e ri',
      href: link.url,
      footnote: 'Nëse nuk e kërkove këtë ndryshim, injoroje këtë mesazh.',
    }),
  });
  return link;
}

/**
 * Map a Supabase Send Email Hook payload onto the branded Resend templates.
 * https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
 */
async function sendFromSupabaseHook(payload) {
  const email = String(payload?.user?.email || '').trim();
  if (!email) throw new Error('Hook payload missing user.email');
  const meta = payload?.user?.user_metadata || {};
  const name =
    String(meta.first_name || meta.business_name || '').trim() ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim();
  const emailData = payload?.email_data || {};
  const action = String(emailData.email_action_type || '').trim();
  const hashed = String(emailData.token_hash || '').trim();
  const token = String(emailData.token || '').trim();

  const typeForVerify =
    action === 'recovery'
      ? 'recovery'
      : action === 'email_change' || action === 'email_change_new'
        ? 'email_change'
        : action === 'invite'
          ? 'invite'
          : action === 'signup'
            ? 'signup'
            : 'magiclink';

  const path = typeForVerify === 'recovery' ? '/user/auth/reset-password' : '/user/auth/confirm';
  const href = hashed
    ? frontendAuthUrl(path, hashed, typeForVerify)
    : token
      ? frontendAuthUrl(path, token, typeForVerify)
      : `${getFrontendBaseUrl()}/user/auth`;

  if (action === 'recovery') {
    await sendResendEmail({
      to: email,
      subject: 'Rivendos fjalëkalimin — KuTaGjej',
      html: renderAuthEmail({
        preheader: 'Rivendos fjalëkalimin e llogarisë tënde në KuTaGjej.',
        title: 'Rivendos fjalëkalimin',
        greeting: name ? `Përshëndetje ${name},` : 'Përshëndetje,',
        body: 'Morëm një kërkesë për të ndryshuar fjalëkalimin. Shtyp butonin më poshtë dhe zgjidh një fjalëkalim të ri.',
        cta: 'Ndrysho fjalëkalimin',
        href,
        footnote: 'Nëse nuk e kërkove këtë ndryshim, injoroje këtë email.',
      }),
    });
    return;
  }

  if (action === 'email_change' || action === 'email_change_new') {
    await sendResendEmail({
      to: email,
      subject: 'Konfirmo emailin e ri — KuTaGjej',
      html: renderAuthEmail({
        preheader: 'Konfirmo adresën e re të emailit për llogarinë KuTaGjej.',
        title: 'Konfirmo emailin e ri',
        greeting: name ? `Përshëndetje ${name},` : 'Përshëndetje,',
        body: 'Për të përfunduar ndryshimin e emailit, shtyp butonin më poshtë.',
        cta: 'Konfirmo emailin e ri',
        href,
        footnote: 'Nëse nuk e kërkove këtë ndryshim, injoroje këtë mesazh.',
      }),
    });
    return;
  }

  await sendResendEmail({
    to: email,
    subject: 'Konfirmo emailin — KuTaGjej',
    html: renderAuthEmail({
      preheader: 'Konfirmo adresën tënde për të aktivizuar llogarinë në KuTaGjej.',
      title: 'Konfirmo emailin',
      greeting: name ? `Përshëndetje ${name},` : 'Përshëndetje,',
      body: 'Shtyp butonin më poshtë për të konfirmuar emailin dhe të hysh në KuTaGjej.',
      cta: 'Konfirmo emailin',
      href,
      footnote: 'Nëse nuk ke krijuar këtë llogari, mund ta injorosh këtë mesazh.',
    }),
  });
}

function displayNameFromProfile(profile) {
  if (!profile) return '';
  if (profile.businessName) return String(profile.businessName).trim();
  return `${profile.firstName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim();
}

module.exports = {
  isResendConfigured,
  generateAuthLink,
  sendSignupConfirmation,
  sendPasswordReset,
  sendPasswordChangedNotice,
  sendEmailChangeConfirmation,
  sendFromSupabaseHook,
  displayNameFromProfile,
  frontendAuthUrl,
};

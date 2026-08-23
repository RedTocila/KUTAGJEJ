#!/usr/bin/env node
'use strict';

/**
 * Writes branded HTML into supabase/email-templates/ for paste into
 * Supabase Dashboard → Authentication → Email Templates.
 *
 *   node backend/scripts/export-supabase-email-templates.js
 */

const fs = require('fs');
const path = require('path');
const { renderAuthEmail } = require('../lib/mail/templates');

const ORIGIN = 'https://kutagjej.al';
const GREETING = 'Përshëndetje,';

const outDir = path.join(__dirname, '../../supabase/email-templates');

function confirmHref(type) {
  return `${ORIGIN}/user/auth/confirm?token_hash={{ .TokenHash }}&type=${type}`;
}

function recoveryHref() {
  return `${ORIGIN}/user/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery`;
}

const templates = [
  {
    file: 'confirm-signup.html',
    dashboard: 'Confirm sign up',
    subject: 'Konfirmo emailin — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Konfirmo adresën tënde për të aktivizuar llogarinë në KuTaGjej.',
      title: 'Konfirmo emailin',
      greeting: GREETING,
      body: 'Faleminderit që u regjistruat në KuTaGjej. Shtyp butonin më poshtë për të konfirmuar emailin dhe aktivizuar llogarinë.',
      cta: 'Konfirmo emailin',
      href: confirmHref('signup'),
      footnote: 'Nëse nuk ke krijuar këtë llogari, mund ta injorosh këtë mesazh. Linku skadon pas pak orësh.',
    }),
  },
  {
    file: 'invite.html',
    dashboard: 'Invite user',
    subject: 'Ftesë për KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Je ftuar të krijosh një llogari në KuTaGjej.',
      title: 'Je i ftuar',
      greeting: GREETING,
      body: 'Ke një ftesë për të krijuar llogari në KuTaGjej. Shtyp butonin më poshtë për ta pranuar.',
      cta: 'Prano ftesën',
      href: confirmHref('invite'),
      footnote: 'Nëse nuk e prisje këtë ftesë, injoroje këtë email.',
    }),
  },
  {
    file: 'magic-link.html',
    dashboard: 'Magic link',
    subject: 'Linku i hyrjes — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Hyr në KuTaGjej me këtë link një-përdorimësh.',
      title: 'Hyr në KuTaGjej',
      greeting: GREETING,
      body: 'Shtyp butonin më poshtë për të hyrë. Linku skadon së shpejti dhe mund të përdoret vetëm një herë.',
      cta: 'Hyr tani',
      href: confirmHref('magiclink'),
      footnote: 'Nëse nuk e kërkove këtë link, injoroje këtë email.',
    }),
  },
  {
    file: 'change-email.html',
    dashboard: 'Change email address',
    subject: 'Konfirmo emailin e ri — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Konfirmo adresën e re të emailit për llogarinë KuTaGjej.',
      title: 'Konfirmo emailin e ri',
      greeting: GREETING,
      body: 'Për të përfunduar ndryshimin e emailit në {{ .NewEmail }}, shtyp butonin më poshtë.',
      cta: 'Konfirmo emailin e ri',
      href: confirmHref('email_change'),
      footnote: 'Nëse nuk e kërkove këtë ndryshim, injoroje këtë mesazh.',
    }),
  },
  {
    file: 'reset-password.html',
    dashboard: 'Reset password',
    subject: 'Rivendos fjalëkalimin — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Rivendos fjalëkalimin e llogarisë tënde në KuTaGjej.',
      title: 'Rivendos fjalëkalimin',
      greeting: GREETING,
      body: 'Morëm një kërkesë për të ndryshuar fjalëkalimin. Shtyp butonin më poshtë dhe zgjidh një fjalëkalim të ri.',
      cta: 'Ndrysho fjalëkalimin',
      href: recoveryHref(),
      footnote: 'Nëse nuk e kërkove këtë ndryshim, injoroje këtë email. Fjalëkalimi yt nuk ndryshon derisa të zgjedhësh një të ri.',
    }),
  },
  {
    file: 'reauthentication.html',
    dashboard: 'Reauthentication',
    subject: '{{ .Token }} është kodi yt — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Kodi yt i verifikimit për KuTaGjej.',
      title: 'Kodi i verifikimit',
      greeting: GREETING,
      body: 'Përdor kodin 6-shifror më poshtë për të konfirmuar identitetin. Skadon së shpejti.',
      otp: '{{ .Token }}',
      footnote: 'Nëse nuk e kërkove këtë kod, injoroje këtë email.',
    }),
  },
  {
    file: 'password-changed.html',
    dashboard: 'Password changed',
    subject: 'Fjalëkalimi u ndryshua — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Fjalëkalimi i llogarisë tënde në KuTaGjej sapo u ndryshua.',
      title: 'Fjalëkalimi u ndryshua',
      greeting: GREETING,
      body: 'Fjalëkalimi i llogarisë tënde sapo u ndryshua. Nëse e bëre ti, nuk të duhet asgjë tjetër.',
      cta: 'Hyr në KuTaGjej',
      href: `${ORIGIN}/user/auth`,
      footnote: 'Nëse nuk e ndryshove ti, rivendos fjalëkalimin menjëherë ose kontakto mbështetjen.',
    }),
  },
  {
    file: 'email-changed.html',
    dashboard: 'Email address changed',
    subject: 'Emaili u ndryshua — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Adresa e emailit të llogarisë tënde në KuTaGjej sapo u ndryshua.',
      title: 'Emaili u ndryshua',
      greeting: GREETING,
      body: 'Emaili i llogarisë u ndryshua nga {{ .OldEmail }} në {{ .Email }}.',
      cta: 'Hyr në KuTaGjej',
      href: `${ORIGIN}/user/auth`,
      footnote: 'Nëse nuk e bëre ti këtë ndryshim, kontakto mbështetjen menjëherë.',
    }),
  },
  {
    file: 'phone-changed.html',
    dashboard: 'Phone number changed',
    subject: 'Numri i telefonit u ndryshua — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Numri i telefonit të llogarisë tënde në KuTaGjej sapo u ndryshua.',
      title: 'Numri i telefonit u ndryshua',
      greeting: GREETING,
      body: 'Numri i telefonit u ndryshua nga {{ .OldPhone }} në {{ .Phone }}.',
      cta: 'Hyr në KuTaGjej',
      href: `${ORIGIN}/user/auth`,
      footnote: 'Nëse nuk e bëre ti këtë ndryshim, kontakto mbështetjen menjëherë.',
    }),
  },
  {
    file: 'identity-linked.html',
    dashboard: 'Sign-in method linked',
    subject: 'U shtua një mënyrë hyrjeje — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Një mënyrë e re hyrjeje u lidh me llogarinë tënde në KuTaGjej.',
      title: 'Mënyrë hyrjeje e re',
      greeting: GREETING,
      body: 'Llogaria {{ .Provider }} u lidh si mënyrë hyrjeje për {{ .Email }}.',
      cta: 'Hyr në KuTaGjej',
      href: `${ORIGIN}/user/auth`,
      footnote: 'Nëse nuk e bëre ti këtë ndryshim, kontakto mbështetjen menjëherë.',
    }),
  },
  {
    file: 'identity-unlinked.html',
    dashboard: 'Sign-in method removed',
    subject: 'U hoq një mënyrë hyrjeje — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Një mënyrë hyrjeje u hoq nga llogaria jote në KuTaGjej.',
      title: 'Mënyrë hyrjeje e hequr',
      greeting: GREETING,
      body: 'Llogaria {{ .Provider }} u hoq si mënyrë hyrjeje për {{ .Email }}.',
      cta: 'Hyr në KuTaGjej',
      href: `${ORIGIN}/user/auth`,
      footnote: 'Nëse nuk e bëre ti këtë ndryshim, kontakto mbështetjen menjëherë.',
    }),
  },
  {
    file: 'mfa-enrolled.html',
    dashboard: 'Verification method added',
    subject: 'U shtua verifikim — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Një metodë e re verifikimi u shtua në llogarinë tënde në KuTaGjej.',
      title: 'Verifikim i ri',
      greeting: GREETING,
      body: 'Metoda e verifikimit {{ .FactorType }} u shtua në llogarinë tënde.',
      cta: 'Hyr në KuTaGjej',
      href: `${ORIGIN}/user/auth`,
      footnote: 'Nëse nuk e bëre ti këtë ndryshim, kontakto mbështetjen menjëherë.',
    }),
  },
  {
    file: 'mfa-unenrolled.html',
    dashboard: 'Verification method removed',
    subject: 'U hoq verifikimi — KuTaGjej',
    html: renderAuthEmail({
      origin: ORIGIN,
      preheader: 'Një metodë verifikimi u hoq nga llogaria jote në KuTaGjej.',
      title: 'Verifikim i hequr',
      greeting: GREETING,
      body: 'Metoda e verifikimit {{ .FactorType }} u hoq nga llogaria jote.',
      cta: 'Hyr në KuTaGjej',
      href: `${ORIGIN}/user/auth`,
      footnote: 'Nëse nuk e bëre ti këtë ndryshim, kontakto mbështetjen menjëherë.',
    }),
  },
];

function wrap(meta, html) {
  return `<!--
  Paste into Supabase → Authentication → Email Templates → ${meta.dashboard}
  Subject: ${meta.subject}
  Copy only from <!DOCTYPE html> downward (this comment can stay).
-->
${html}
`;
}

fs.mkdirSync(outDir, { recursive: true });

const indexLines = [
  'KuTaGjej — paste these into Supabase Authentication → Email Templates.',
  'Open each .html, copy the full file, paste into Body. Copy the Subject line below.',
  '',
  'Dashboard name                  | Subject                                      | File',
  '------------------------------- | -------------------------------------------- | -------------------------',
];

for (const t of templates) {
  fs.writeFileSync(path.join(outDir, t.file), wrap(t, t.html), 'utf8');
  indexLines.push(
    `${t.dashboard.padEnd(31)} | ${t.subject.padEnd(44)} | ${t.file}`,
  );
}

indexLines.push(
  '',
  'Also enable security notifications in that same page (Password changed, Email changed, …).',
  'SMTP must already point at Resend (smtp.resend.com, user resend, password = API key).',
  '',
  'Regenerate: node backend/scripts/export-supabase-email-templates.js',
  '',
);

fs.writeFileSync(path.join(outDir, 'COPY-INTO-SUPABASE.txt'), `${indexLines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${templates.length} templates to ${outDir}`);

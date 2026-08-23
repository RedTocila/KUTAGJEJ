'use strict';

const { getFrontendBaseUrl } = require('../site-url');

const GREEN = '#82c91e';
const GREEN_DARK = '#5f9816';
const BG = '#0a0a0a';
const CARD = '#171717';
const BORDER = '#404040';
const TEXT = '#fafafa';
const MUTED = '#a3a3a3';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function logoUrl() {
  return `${getFrontendBaseUrl()}/Ku-Ta-Gjej-Logo.png`;
}

function siteUrl() {
  return getFrontendBaseUrl();
}

/**
 * Transactional HTML matching the KuTaGjej dark + lime product chrome.
 * Table-based for Outlook / Gmail.
 */
function renderAuthEmail({
  preheader,
  title,
  greeting,
  body,
  cta,
  href,
  footnote,
}) {
  const safeTitle = escapeHtml(title);
  const safeGreeting = escapeHtml(greeting);
  const safeBody = escapeHtml(body);
  const safeCta = escapeHtml(cta);
  const safeHref = escapeHtml(href);
  const safeFoot = escapeHtml(footnote);
  const safePre = escapeHtml(preheader);
  const home = escapeHtml(siteUrl());
  const logo = escapeHtml(logoUrl());

  return `<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${TEXT};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePre}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td align="center" style="padding:8px 0 28px;">
              <a href="${home}" style="text-decoration:none;display:inline-block;">
                <img src="${logo}" alt="KuTaGjej" width="56" height="56" style="display:block;border:0;border-radius:14px;" />
              </a>
              <div style="margin-top:12px;font-size:22px;font-weight:800;letter-spacing:-0.03em;line-height:1;">
                <span style="color:${MUTED};">KuTa</span><span style="color:${GREEN};">Gjej</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:${CARD};border:1px solid ${BORDER};border-radius:20px;padding:32px 28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;letter-spacing:-0.02em;color:${TEXT};">${safeTitle}</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${TEXT};">${safeGreeting}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:${MUTED};">${safeBody}</p>
              ${
                href
                  ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
                <tr>
                  <td style="border-radius:999px;background:${GREEN};">
                    <a href="${safeHref}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;color:#0a0a0a;text-decoration:none;border-radius:999px;background:${GREEN};">${safeCta}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all;">Nëse butoni nuk hapet, kopjo këtë link:<br /><a href="${safeHref}" style="color:${GREEN};">${safeHref}</a></p>`
                  : ''
              }
              ${safeFoot ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${MUTED};">${safeFoot}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 8px 8px;font-size:12px;line-height:1.5;color:${MUTED};">
              <a href="${home}" style="color:${GREEN_DARK};text-decoration:none;font-weight:700;">kutagjej.al</a>
              <div style="margin-top:8px;">Njoftime falas në Shqipëri — prona, makina, punë dhe tregu.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  renderAuthEmail,
  escapeHtml,
};

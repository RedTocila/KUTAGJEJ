'use strict';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_ID_SCAN_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_IMAGE_CHARS = 6_500_000;

function isOpenAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

function normalizeDataUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (value.length > MAX_IMAGE_CHARS) return null;
  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

function buildSystemPrompt() {
  return [
    'You validate identity document photos for account verification in Albania/Kosovo.',
    'Return ONLY valid JSON with this exact shape:',
    '{',
    '  "isIdCard": boolean,',
    '  "rejectReason": "screen_photo" | "not_document" | "wrong_document" | "back_side" | "cropped" | "cluttered" | "blurry" | "unreadable" | null,',
    '  "idNumber": string | null,',
    '  "documentType": "national_id" | "passport" | "drivers_license" | "residence_permit" | "other" | null',
    '}',
    '',
    'Accept ONLY when ALL of these are true:',
    '- The image shows the FRONT of a real, physical government-issued identity document',
    '  (Albanian ID card "Kartë Identiteti", Kosovo ID, passport biodata page/card, or valid driving licence).',
    '- The ENTIRE physical card is visible — no edge is cut off by the photo frame.',
    '- Text on the card (name and ID number) is clearly readable — not blurry, dark, or out of focus.',
    '',
    'Do NOT reject just because of the background:',
    '- Skin, hands, tattoos, clothing, or a plain surface behind/around the card are fine.',
    '- Only reject as "cluttered" when a distinct foreign object (phone, lighter, keys, another document)',
    '  overlaps the card or clearly obstructs reading the ID number.',
    '- The card does not need to fill 100% of the image — margins and dark scanner padding are normal.',
    '',
    'REJECT (isIdCard=false) when you see:',
    '- Any edge of the physical ID card cut off or cropped (rejectReason: "cropped")',
    '- A distinct foreign object overlapping the card or blocking the ID number (rejectReason: "cluttered")',
    '- Blurry, motion-blurred, or out-of-focus image where text is hard to read (rejectReason: "blurry")',
    '- A photo of a screen, monitor, laptop, phone display, or printed screenshot (rejectReason: "screen_photo")',
    '- A web page, app UI, form, or browser window (including localhost URLs) (rejectReason: "screen_photo")',
    '- Random objects, faces without ID layout, business cards, invoices, or NIPT paperwork alone (rejectReason: "not_document")',
    '- The back side only, or a document that is mostly covered (rejectReason: "back_side" or "unreadable")',
    '- Obvious fake, template, or digitally edited ID without a physical card present (rejectReason: "not_document")',
    '- Key text (name or ID number) cannot be read clearly (rejectReason: "unreadable")',
    '',
    'IMPORTANT — avoid screen_photo false positives:',
    '- Mobile in-app scanners often crop the card with dark/black margins around it. That padding is NOT evidence of a screen.',
    '- Lamination glare, holographic overlays, and eagle watermarks on Albanian "Kartë Identiteti" cards are normal on physical cards.',
    '- Use rejectReason "screen_photo" ONLY with clear evidence: visible pixel grid, LCD moiré, device bezels, browser/URL chrome,',
    '  or an obvious photo of another phone/monitor showing the ID.',
    '- If the card looks physical but text is hard to read, use "blurry" or "unreadable" — NOT "screen_photo".',
    '- When unsure, prefer "blurry" over "screen_photo".',
    '',
    'When isIdCard=true, read the personal ID number from the document (Albanian format is often',
    'one letter + 8 digits + one letter, e.g. I12345678A). Return idNumber without spaces.',
    'If the number is not clearly readable, reject with rejectReason "unreadable" — do NOT accept.',
    'Set rejectReason to null when accepted.',
  ].join('\n');
}

function normalizeIdNumber(raw) {
  const value = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!value) return null;
  if (!/^[A-Z]\d{8}[A-Z]$/.test(value)) return value.slice(0, 40);
  return value;
}

function userMessageForReject(rejectReason) {
  switch (rejectReason) {
    case 'screen_photo':
      return 'Duket si foto e ekranit. Skanoni kartën ID fizike, jo ekranin ose telefonin.';
    case 'back_side':
      return 'Skanoni pjesën e përparme të ID-së, jo pjesën e pasme.';
    case 'wrong_document':
      return 'Dokumenti nuk është një kartë identiteti e vlefshme. Skanoni ID-në tuaj.';
    case 'cropped':
      return 'Karta nuk është e plotë në kornizë. Vendoseni të gjithë kartën ID brenda kornizës.';
    case 'cluttered':
      return 'Hiqni objektet pranë kartës. Vetëm ID-ja duhet të jetë në foto.';
    case 'blurry':
      return 'Foto e turbullt. Mbajeni telefonin fiks dhe sigurohuni që ka dritë të mjaftueshme.';
    case 'unreadable':
      return 'ID-ja nuk lexohet qartë. Afrojeni kamerën dhe sigurohuni që ka dritë të mjaftueshme.';
    case 'not_document':
    default:
      return 'Nuk u njoh si kartë ID e vërtetë. Vendoseni ID-në fizike, të plotë, brenda kornizës.';
  }
}

async function callVisionScan(imageUrl, userText) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.05,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'high' },
            },
          ],
        },
      ],
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error?.message || `OpenAI request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }

  const raw = payload?.choices?.[0]?.message?.content;
  try {
    return JSON.parse(typeof raw === 'string' ? raw : '{}');
  } catch {
    return {};
  }
}

function formatScanResult(parsed) {
  const isIdCard = parsed.isIdCard === true;
  const rejectReason =
    typeof parsed.rejectReason === 'string' && parsed.rejectReason.trim()
      ? parsed.rejectReason.trim()
      : null;
  const idNumber = normalizeIdNumber(parsed.idNumber);
  const documentType =
    typeof parsed.documentType === 'string' && parsed.documentType.trim()
      ? parsed.documentType.trim()
      : null;

  return {
    isIdCard,
    rejectReason: isIdCard ? null : rejectReason || 'not_document',
    message: isIdCard ? null : userMessageForReject(rejectReason || 'not_document'),
    idNumber: isIdCard ? idNumber : null,
    documentType: isIdCard ? documentType : null,
  };
}

async function scanIdDocumentFront(imageInput) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('Verifikimi i fotos nuk është i disponueshëm për momentin.');
    err.status = 503;
    throw err;
  }

  const imageUrl = normalizeDataUrl(imageInput);
  if (!imageUrl) {
    const err = new Error('Foto e pavlefshme për skanim.');
    err.status = 400;
    throw err;
  }

  const userText =
    'This photo was taken live from a mobile phone camera inside our ID scanner. ' +
    'Is it a readable photo of the front of a real physical ID card? ' +
    'Background skin, hands, or tattoos are OK. If yes, extract the ID number.';

  let parsed = await callVisionScan(imageUrl, userText);
  let result = formatScanResult(parsed);

  if (!result.isIdCard && (result.rejectReason === 'screen_photo' || result.rejectReason === 'cluttered')) {
    const retryHint =
      result.rejectReason === 'screen_photo'
        ? 'Second review: this is a direct mobile-camera capture (not a screenshot). ' +
          'Dark margins around the card are from our scanner frame, not a screen bezel. '
        : 'Second review: skin, hands, tattoos, or a plain background around the card are NOT clutter. ' +
          'Only reject cluttered if an object overlaps the card. ';
    parsed = await callVisionScan(
      imageUrl,
      retryHint +
        'If you can see a physical Albanian/Kosovo ID card layout with a readable ID number, accept it. ' +
        'Otherwise use blurry or unreadable — not screen_photo or cluttered.',
    );
    result = formatScanResult(parsed);
  }

  return result;
}

/**
 * Validate an uploaded ID front image URL before accepting a verification request.
 * @returns {{ ok: true } | { ok: false, status: number, message: string }}
 */
async function validateIdFrontImageUrl(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!url) {
    return { ok: false, status: 400, message: 'Fotoja e përparme e ID-së është e detyrueshme.' };
  }

  const { isOurStorageUrl } = require('./storage-uploads');
  if (!isOurStorageUrl(url)) {
    return { ok: false, status: 400, message: 'Fotoja e ID-së nuk është e vlefshme.' };
  }

  if (!isOpenAiConfigured()) {
    return { ok: true };
  }

  try {
    const scan = await scanIdDocumentFront(url);
    if (!scan.isIdCard) {
      return {
        ok: false,
        status: 400,
        message: scan.message || 'Fotoja e ID-së nuk kaloi verifikimin. Skanoni përsëri.',
      };
    }
    return { ok: true };
  } catch (err) {
    console.error('validateIdFrontImageUrl:', err?.message || err);
    return {
      ok: false,
      status: 503,
      message: 'Verifikimi i fotos së ID-së dështoi. Provoni përsëri.',
    };
  }
}

module.exports = {
  isOpenAiConfigured,
  scanIdDocumentFront,
  validateIdFrontImageUrl,
};

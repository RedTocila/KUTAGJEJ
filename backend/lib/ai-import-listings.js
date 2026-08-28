'use strict';

const { getSupabaseAdmin } = require('./supabase');
const { compressImageBuffer } = require('./compress-image');
const {
  VEHICLE_TYPE_VALUES,
  makesForVehicleType,
  modelsForMake,
  isValidVehicleMake,
} = require('./vehicle-catalog');
const { normalizeFuelType } = require('./car-field-rules');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
/** Leave enough room for the complete JSON form, especially descriptions with bullets. */
const OPENAI_INITIAL_MAX_TOKENS = 2600;
const OPENAI_RETRY_MAX_TOKENS = 3400;
/** Max listing/source links processed in one import request. */
const MAX_IMPORT_URLS = 50;
/** Max images kept on a car listing draft (matches create-form / API). */
const MAX_CAR_LISTING_IMAGES = 8;
/** Max remote snapshot photos sent to vision (OpenAI). Compressed first. */
const MAX_SNAPSHOT_VISION_IMAGES = 2;

const CATEGORIES = [
  'real-estate',
  'cars',
  'job-listings',
  'marketplace',
  'businesses',
  'professionals',
];

const CATEGORY_LABELS = {
  'real-estate': 'Prona (real estate)',
  cars: 'Makina (vehicles)',
  'job-listings': 'Punë (jobs)',
  marketplace: 'Tregu (marketplace)',
  businesses: 'Biznese (businesses)',
  professionals: 'Profesionistë (professionals)',
};

const CATEGORY_MISMATCH_CODE = 'category_mismatch';
const CONTENT_RESTRICTED_CODE = 'content_restricted';

const RESTRICTED_REASON_CODES = [
  'nudity',
  'sexual',
  'gambling',
  'drugs',
  'weapons',
  'violence',
  'hate',
  'fraud',
  'counterfeit',
  'illegal',
  'other',
];

/** Hard policy blocks — never reclassify these as category mismatch. */
const HARD_RESTRICTED_REASON_CODES = RESTRICTED_REASON_CODES.filter((c) => c !== 'other');

const RESTRICTED_REASON_LABELS = {
  nudity: 'nudity / adult sexual content',
  sexual: 'sexual services or pornography',
  gambling: 'gambling, betting, or casinos',
  drugs: 'illegal drugs or controlled substances',
  weapons: 'weapons, explosives, or ammunition',
  violence: 'violent or graphic content',
  hate: 'hate speech or discrimination',
  fraud: 'scams or fraudulent offers',
  counterfeit: 'counterfeit or pirated goods',
  illegal: 'other illegal activity',
  other: 'restricted content',
};

function hasHardRestrictedReasons(reasons) {
  return normalizeRestrictedReasons(reasons).some((r) => HARD_RESTRICTED_REASON_CODES.includes(r));
}

function isOpenAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOpenAiRateLimitError(status, message) {
  if (status === 429) return true;
  return /rate limit reached|tokens per min|\bTPM\b/i.test(String(message || ''));
}

function parseOpenAiRetryMs(message, retryAfterHeader) {
  const header = Number.parseFloat(String(retryAfterHeader || '').trim());
  if (Number.isFinite(header) && header > 0) {
    return Math.min(45_000, Math.max(400, Math.ceil(header * 1000)));
  }
  const match = String(message || '').match(/try again in\s+([\d.]+)\s*(ms|s)?/i);
  if (match) {
    const n = Number.parseFloat(match[1]);
    if (Number.isFinite(n)) {
      const unit = (match[2] || 's').toLowerCase();
      const ms = unit === 'ms' ? n : n * 1000;
      return Math.min(45_000, Math.max(400, Math.ceil(ms + 250)));
    }
  }
  return 2500;
}

const OPENAI_RATE_LIMIT_MESSAGE =
  'AI is temporarily busy (too many listings at once). Wait a minute and retry the remaining links.';

const OPENAI_RATE_LIMIT_CODE = 'openai_rate_limit';

function categoryMismatchMessage(preferredCategory, detectedCategory) {
  const preferred = CATEGORY_LABELS[preferredCategory] || preferredCategory;
  const detected = CATEGORY_LABELS[detectedCategory] || detectedCategory || 'another category';
  return `This content belongs in ${detected}, not ${preferred}. Choose the matching category to post.`;
}

function normalizeRestrictedReasons(raw) {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' && raw.trim() ? [raw] : [];
  const out = [];
  for (const item of list) {
    const code = String(item || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    const mapped =
      RESTRICTED_REASON_CODES.find((c) => c === code) ||
      RESTRICTED_REASON_CODES.find((c) => code.includes(c)) ||
      null;
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

function contentRestrictedMessage(reasons) {
  const labels = normalizeRestrictedReasons(reasons).map(
    (r) => RESTRICTED_REASON_LABELS[r] || r,
  );
  if (labels.length === 0) {
    return 'This listing was blocked because it appears to contain restricted or prohibited content.';
  }
  return `This listing was blocked because it appears to involve restricted content: ${labels.join(', ')}.`;
}

function normalizeUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  try {
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const withProtocol = hasProtocol ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const host = url.hostname.replace(/\.$/, '').toLowerCase();
    if (!host) return null;
    // Plain words like "Telefon" become https://telefon/ — require a real host.
    const isLocalhost = host === 'localhost';
    const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const hasDot = host.includes('.');
    if (!isLocalhost && !isIpv4 && !hasDot) return null;

    return url.toString();
  } catch {
    return null;
  }
}

function extractUrls(input) {
  const text = Array.isArray(input) ? input.join('\n') : String(input || '');
  const seen = new Set();
  const urls = [];

  const push = (candidate) => {
    const normalized = normalizeUrl(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    urls.push(normalized);
  };

  for (const line of text.split(/[\n,]+/)) {
    if (urls.length >= MAX_IMPORT_URLS) break;
    push(line);
  }

  // Also pick up https?:// links embedded in prose (not alone on a line).
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  for (const match of matches) {
    if (urls.length >= MAX_IMPORT_URLS) break;
    push(match.replace(/[),.;]+$/, ''));
  }

  return urls;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html, attr, key) {
  const patterns = [
    new RegExp(
      `<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["'][^>]*>`,
      'i',
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
/** Many product / listing SPAs only emit og:image + title for social crawlers. */
const CRAWLER_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const IG_WEB_APP_ID = '936619743392459';
/**
 * PolarisPostRootQuery — returns v1/iPhone-shaped media (carousel_media).
 * Instagram deprecated older shortcode doc_ids for anonymous scrapers (mid-2026).
 */
const IG_SHORTCODE_DOC_ID = '27128499623469141';
/** Legacy xdt_shortcode_media query — kept as a fallback. */
const IG_SHORTCODE_DOC_ID_LEGACY = '10015901848480474';
const MAX_SNAPSHOT_IMAGES = 8;

/** Cached anonymous Instagram CSRF + cookie jar (required by GraphQL). */
let igCsrfCache = { token: null, cookie: null, fetchedAt: 0 };
const IG_CSRF_TTL_MS = 25 * 60 * 1000;

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/');
}

function isLikelyJunkImageUrl(url) {
  const lower = String(url || '').toLowerCase();
  return (
    lower.startsWith('data:') ||
    /\.svg(\?|$)/i.test(lower) ||
    /sprite|icon|logo|favicon|pixel|tracking|1x1|blank\.|placeholder|avatar-default|spinner|loading\.gif|rsrc\.php/i.test(
      lower,
    ) ||
    // Analytics / ad beacons often appear as <img> tags (e.g. Facebook noscript pixel).
    /facebook\.com\/(?:tr|tr\/)\b|connect\.facebook\.net\/.*\/fbevents|google-analytics\.com|googletagmanager\.com|googleadservices\.com|doubleclick\.net|bat\.bing\.com|adservice\.google|scorecardresearch\.com|hotjar\.com/i.test(
      lower,
    ) ||
    /[?&]ev=pageview\b/i.test(lower) ||
    // Amazon share/composite banners (not product gallery shots)
    /\.jpg_bo\d+/i.test(lower) ||
    /_sr\d+,\d+/i.test(lower)
  );
}

function firstSrcsetUrl(srcset) {
  if (!srcset) return null;
  const first = String(srcset)
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .find(Boolean);
  return first || null;
}

function extractAllMeta(html, attr, key) {
  const out = [];
  const re = new RegExp(
    `<meta[^>]+(?:${attr}=["']${key}["'][^>]+content=["']([^"']+)["']|content=["']([^"']+)["'][^>]+${attr}=["']${key}["'])[^>]*>`,
    'gi',
  );
  let match;
  while ((match = re.exec(html))) {
    const value = decodeHtmlEntities(match[1] || match[2] || '').trim();
    if (value) out.push(value);
  }
  return out;
}

function extractJsonLdImages(html) {
  const out = [];
  const blocks =
    html.match(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    ) || [];
  for (const block of blocks) {
    const raw = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== 'object') continue;
      if (Array.isArray(node)) {
        stack.push(...node);
        continue;
      }
      const image = node.image ?? node.photo ?? node.thumbnailUrl ?? node.contentUrl;
      if (typeof image === 'string') out.push(image);
      else if (Array.isArray(image)) {
        for (const item of image) {
          if (typeof item === 'string') out.push(item);
          else if (item && typeof item === 'object' && item.url) out.push(String(item.url));
        }
      } else if (image && typeof image === 'object' && image.url) {
        out.push(String(image.url));
      }
      for (const value of Object.values(node)) {
        if (value && typeof value === 'object') stack.push(value);
      }
    }
  }
  return out;
}

/** Product galleries often embed hiRes / large image URLs in page JSON. */
function extractAmazonStyleImages(html) {
  const out = [];
  const patterns = [
    /"hiRes"\s*:\s*"(https:[^"]+)"/gi,
    /"large"\s*:\s*"(https:\/\/m\.media-amazon\.com[^"]+)"/gi,
    /"hiRes"\s*:\s*'(https:[^']+)'/gi,
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(html))) {
      out.push(decodeHtmlEntities(match[1]));
      if (out.length >= 16) return out;
    }
  }
  return out;
}

function extractEmbeddedPayloadImages(html) {
  const out = [];
  const patterns = [
    /"(?:imageUrl|image_url|imageURL|thumbnailUrl|thumbnail_url|contentUrl|photoUrl|photo_url|mainImage|main_image)"\s*:\s*"(https:[^"]+)"/gi,
    /"(?:images|photos|gallery|imageGallery|media)"\s*:\s*\[([^\]]{0,8000})\]/gi,
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(html))) {
      if (re.source.startsWith('"(?:images')) {
        const urls = match[1].match(/https:[^"\\]+/g) || [];
        out.push(...urls);
      } else {
        out.push(decodeHtmlEntities(match[1]));
      }
      if (out.length >= 24) return out;
    }
  }
  return out;
}

function preferLargerImageUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    // Remax / Gryphtech preview → Large
    if (/remax\.azureedge\.net|cdn\.gryphtech\.com/i.test(host)) {
      parsed.pathname = parsed.pathname.replace(
        /\/userimages\/(\d+)\/(?!Large(?:WM)?\/)/i,
        '/userimages/$1/Large/',
      );
      return parsed.toString();
    }
    // Amazon size transforms → larger SL1500 when possible
    if (/media-amazon\.com|images-amazon\.com|ssl-images-amazon\.com/i.test(host)) {
      parsed.pathname = parsed.pathname.replace(/\._[A-Z0-9,_]+_\./i, '._AC_SL1500_.');
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractImageCandidates(html, baseUrl) {
  const urls = [];
  const seen = new Set();
  const push = (raw) => {
    if (!raw) return;
    try {
      const absolute = preferLargerImageUrl(
        new URL(decodeHtmlEntities(String(raw).trim()), baseUrl).toString(),
      );
      if (seen.has(absolute)) return;
      if (!/^https?:\/\//i.test(absolute)) return;
      if (isLikelyJunkImageUrl(absolute)) return;
      seen.add(absolute);
      urls.push(absolute);
    } catch {
      /* ignore */
    }
  };

  for (const img of extractAllMeta(html, 'property', 'og:image')) push(img);
  for (const img of extractAllMeta(html, 'name', 'twitter:image')) push(img);
  for (const img of extractAllMeta(html, 'property', 'twitter:image')) push(img);
  for (const img of extractJsonLdImages(html)) push(img);
  for (const img of extractAmazonStyleImages(html)) push(img);
  for (const img of extractEmbeddedPayloadImages(html)) push(img);

  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgTags.slice(0, 60)) {
    push(tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]);
    push(tag.match(/\bdata-src=["']([^"']+)["']/i)?.[1]);
    push(tag.match(/\bdata-lazy-src=["']([^"']+)["']/i)?.[1]);
    push(tag.match(/\bdata-original=["']([^"']+)["']/i)?.[1]);
    push(tag.match(/\bdata-zoom-image=["']([^"']+)["']/i)?.[1]);
    push(firstSrcsetUrl(tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1]));
    if (urls.length >= MAX_SNAPSHOT_IMAGES) break;
  }

  if (urls.length < MAX_SNAPSHOT_IMAGES) {
    const embedded =
      html.match(/https?:\/\/[^"'\\\s<>]+?\.(?:jpe?g|png|webp)(?:\?[^"'\\\s<>]*)?/gi) || [];
    for (const match of embedded) {
      push(match);
      if (urls.length >= MAX_SNAPSHOT_IMAGES) break;
    }
  }

  return urls.slice(0, MAX_SNAPSHOT_IMAGES);
}

function htmlRichnessScore(html) {
  const text = String(html || '');
  if (!text) return 0;
  const images = extractImageCandidates(text, 'https://example.com').length;
  const textLen = stripHtml(text).length;
  const hasOg = extractAllMeta(text, 'property', 'og:image').length > 0 ? 400 : 0;
  const hasTitle = extractMeta(text, 'property', 'og:title') ? 120 : 0;
  return images * 80 + Math.min(textLen, 4000) + hasOg + hasTitle + Math.min(text.length / 50, 500);
}

function isThinListingHtml(html) {
  const text = String(html || '');
  if (!text) return true;
  if (text.length < 4000 && /<div[^>]+id=["']root["'][^>]*>\s*<\/div>/i.test(text)) {
    return true;
  }
  // Anti-bot challenge shells
  if (text.length < 6000 && /_0x[a-f0-9]+|cf-browser-verification|challenge-platform/i.test(text)) {
    return true;
  }
  const hasOgImage = extractAllMeta(text, 'property', 'og:image').length > 0;
  const hasMeaningfulText = stripHtml(text).length > 280;
  return !hasOgImage && !hasMeaningfulText;
}

function mergeImageUrlLists(...lists) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    for (const raw of list || []) {
      const url = preferLargerImageUrl(String(raw || '').trim());
      if (!/^https?:\/\//i.test(url) || seen.has(url) || isLikelyJunkImageUrl(url)) continue;
      seen.add(url);
      out.push(url);
      if (out.length >= MAX_SNAPSHOT_IMAGES) return out;
    }
  }
  return out;
}

/** Remax Albania listing pages are empty SPA shells — optional gallery API boost (no-op for other sites). */
async function enrichRemaxAlbaniaImages(pageUrl) {
  let parsed;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return [];
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'remax-albania.com' && !host.endsWith('.remax-albania.com')) return [];

  const mlsId = parsed.pathname.match(/(\d{5,}-\d+)\s*$/)?.[1];
  if (!mlsId) return [];

  const endpoint = `${parsed.origin}/search/listing-search/docs/search`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: parsed.origin,
        Referer: `${parsed.origin}/`,
      },
      body: JSON.stringify({
        search: '*',
        filter: `content/MLSID eq '${mlsId.replace(/'/g, "''")}'`,
        top: 1,
        count: true,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const content = data?.value?.[0]?.content;
    if (!content || typeof content !== 'object') return [];

    const regionId = Number(content.RegionId || content.MacroRegionId || 0);
    const images = Array.isArray(content.ListingImages) ? content.ListingImages : [];
    if (!regionId || !images.length) return [];

    const ordered = [...images].sort(
      (a, b) => Number(a?.Order || 0) - Number(b?.Order || 0),
    );
    const urls = [];
    for (const image of ordered) {
      const fileName = String(image?.FileName || '').trim();
      if (!fileName) continue;
      const useLarge = String(image?.HasLargeImage || '') === '1';
      urls.push(
        useLarge
          ? `https://remax.azureedge.net/userimages/${regionId}/Large/${fileName}`
          : `https://remax.azureedge.net/userimages/${regionId}/${fileName}`,
      );
      if (urls.length >= MAX_SNAPSHOT_IMAGES) break;
    }
    return urls;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHtmlDocument(url, userAgent, signal) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal,
    headers: {
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,sq;q=0.8',
    },
  });
  const html = await res.text();
  return { res, html };
}

function isSocialMediaUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return (
      host === 'instagram.com' ||
      host.endsWith('.instagram.com') ||
      host === 'facebook.com' ||
      host.endsWith('.facebook.com') ||
      host === 'fb.com' ||
      host === 'tiktok.com' ||
      host.endsWith('.tiktok.com') ||
      host === 'twitter.com' ||
      host === 'x.com' ||
      host === 'linkedin.com' ||
      host.endsWith('.linkedin.com')
    );
  } catch {
    return false;
  }
}

/**
 * First useful line of an Instagram caption for a listing title hint.
 * Skips @mentions-only / hashtag-only lines. Never returns a profile handle.
 */
function titleHintFromCaption(caption) {
  const raw = String(caption || '').trim();
  if (!raw) return null;
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  for (const line of lines) {
    const withoutTags = line
      .replace(/#[\p{L}\p{N}_]+/gu, ' ')
      .replace(/@[\p{L}\p{N}._]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Need real words after stripping tags — avoid "#sale #moto" as a title.
    if (withoutTags.length < 3) continue;
    const candidate = withoutTags.slice(0, 90).trim();
    // Drop lines that are only emojis / punctuation.
    if (!/[\p{L}\p{N}]/u.test(candidate)) continue;
    return candidate;
  }
  return raw.slice(0, 90).trim() || null;
}

function normalizeNameKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, ' ');
}

/** True when a draft title is just the IG profile / KuTaGjej business name. */
function isProfileLikeTitle(title, { authorName, businessName, fullName } = {}) {
  const key = normalizeNameKey(title);
  if (!key || key.length < 2) return false;
  const suspects = [authorName, businessName, fullName]
    .map(normalizeNameKey)
    .filter(Boolean);
  if (suspects.some((s) => key === s || key === `@${s}`)) return true;
  // Instagram oEmbed often returns display name; GraphQL returns username — both bad as titles.
  return false;
}

function isInstagramUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return host === 'instagram.com' || host.endsWith('.instagram.com');
  } catch {
    return false;
  }
}

function extractInstagramShortcode(url) {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\/(?:p|reel|tv|reels)\/([A-Za-z0-9_-]+)/i);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

/** Instagram anonymous GraphQL requires an X-CSRFToken (cookie alone is rejected). */
async function fetchInstagramCsrfSession(signal) {
  const now = Date.now();
  if (
    igCsrfCache.token &&
    igCsrfCache.cookie &&
    now - igCsrfCache.fetchedAt < IG_CSRF_TTL_MS
  ) {
    return igCsrfCache;
  }
  try {
    const res = await fetch('https://www.instagram.com/', {
      method: 'GET',
      redirect: 'follow',
      signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const setCookies =
      typeof res.headers.getSetCookie === 'function'
        ? res.headers.getSetCookie()
        : [res.headers.get('set-cookie')].filter(Boolean);
    let token = null;
    const cookieParts = [];
    for (const raw of setCookies) {
      const first = String(raw || '').split(';')[0].trim();
      if (first) cookieParts.push(first);
      const match = String(raw || '').match(/(?:^|,\s*)csrftoken=([^;,\s]+)/i);
      if (match?.[1]) token = match[1];
    }
    if (!token) return igCsrfCache.token ? igCsrfCache : { token: null, cookie: null, fetchedAt: 0 };
    igCsrfCache = {
      token,
      cookie: cookieParts.join('; '),
      fetchedAt: now,
    };
    return igCsrfCache;
  } catch {
    return igCsrfCache.token ? igCsrfCache : { token: null, cookie: null, fetchedAt: 0 };
  }
}

function instagramAuthHeaders(csrfSession, shortcode) {
  const headers = {
    'User-Agent': BROWSER_UA,
    Accept: '*/*',
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-IG-App-ID': IG_WEB_APP_ID,
    Referer: shortcode
      ? `https://www.instagram.com/p/${shortcode}/`
      : 'https://www.instagram.com/',
  };
  if (csrfSession?.token) {
    headers['X-CSRFToken'] = csrfSession.token;
    if (csrfSession.cookie) headers.Cookie = csrfSession.cookie;
  }
  return headers;
}

/** Instagram HTML is often a login shell; oEmbed returns the real post caption. */
async function fetchInstagramOEmbed(url) {
  const endpoint = `https://www.instagram.com/api/v1/oembed/?omitscript=true&url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return null;
    const caption = String(data.title || '').trim();
    const authorName = String(data.author_name || '').trim();
    const thumbnail = String(data.thumbnail_url || '').trim();
    return {
      caption: caption || null,
      authorName: authorName || null,
      authorUrl: String(data.author_url || '').trim() || null,
      thumbnailUrl: /^https?:\/\//i.test(thumbnail) ? thumbnail : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Best display URL from v1 image_versions2 candidates (largest first). */
function bestInstagramImageVersionUrl(mediaNode) {
  const candidates = mediaNode?.image_versions2?.candidates;
  if (Array.isArray(candidates) && candidates.length) {
    const sorted = [...candidates].sort(
      (a, b) => (Number(b?.width) || 0) * (Number(b?.height) || 0) -
        (Number(a?.width) || 0) * (Number(a?.height) || 0),
    );
    const url = String(sorted[0]?.url || '').trim();
    if (/^https?:\/\//i.test(url)) return url;
  }
  return null;
}

function isInstagramCarouselNode(mediaNode) {
  if (!mediaNode || typeof mediaNode !== 'object') return false;
  if (Number(mediaNode.media_type) === 8) return true;
  if (mediaNode.product_type === 'carousel_container') return true;
  const typename = String(mediaNode.__typename || '');
  if (/sidecar|carousel/i.test(typename)) return true;
  const children = mediaNode.edge_sidecar_to_children?.edges;
  if (Array.isArray(children) && children.length > 1) return true;
  const carousel = mediaNode.carousel_media;
  if (Array.isArray(carousel) && carousel.length > 1) return true;
  return false;
}

function collectInstagramMediaImages(mediaNode) {
  const urls = [];
  if (!mediaNode || typeof mediaNode !== 'object') return { urls, isCarousel: false };
  const push = (raw) => {
    const value = decodeHtmlEntities(String(raw || '').trim());
    if (/^https?:\/\//i.test(value) && !isLikelyJunkImageUrl(value) && !urls.includes(value)) {
      urls.push(value);
    }
  };

  // Legacy GraphQL sidecar children.
  const children = mediaNode.edge_sidecar_to_children?.edges;
  if (Array.isArray(children) && children.length) {
    for (const edge of children) {
      const node = edge?.node;
      push(node?.display_url || bestInstagramImageVersionUrl(node));
      if (urls.length >= MAX_SNAPSHOT_IMAGES) break;
    }
    return { urls, isCarousel: true };
  }

  // Polaris / v1 API carousel_media.
  const carousel = mediaNode.carousel_media;
  if (Array.isArray(carousel) && carousel.length) {
    for (const item of carousel) {
      push(bestInstagramImageVersionUrl(item) || item?.display_url);
      if (urls.length >= MAX_SNAPSHOT_IMAGES) break;
    }
    return { urls, isCarousel: true };
  }

  // Single photo/reel: keep ONE image. Do not also push thumbnail_src —
  // that doubles the same frame with a different CDN URL.
  push(
    mediaNode.display_url ||
      bestInstagramImageVersionUrl(mediaNode) ||
      mediaNode.thumbnail_src,
  );
  if (!urls.length) push(mediaNode.thumbnail_src);
  return {
    urls: urls.slice(0, 1),
    isCarousel: isInstagramCarouselNode(mediaNode),
  };
}

function parseInstagramShortcodePayload(data) {
  if (!data || typeof data !== 'object') return null;

  // New PolarisPostRootQuery → v1 web_info.items[0]
  const polarisItem = data?.data?.xdt_api__v1__media__shortcode__web_info?.items?.[0];
  if (polarisItem && typeof polarisItem === 'object') {
    const collected = collectInstagramMediaImages(polarisItem);
    const captionText =
      polarisItem.caption && typeof polarisItem.caption === 'object'
        ? String(polarisItem.caption.text || '').trim()
        : String(polarisItem.caption || '').trim();
    return {
      caption: captionText || null,
      authorName: polarisItem.user?.username
        ? String(polarisItem.user.username)
        : polarisItem.owner?.username
          ? String(polarisItem.owner.username)
          : null,
      imageUrls: collected.urls,
      isCarousel: collected.isCarousel || Number(polarisItem.media_type) === 8,
    };
  }

  // Legacy xdt_shortcode_media
  const media = data?.data?.xdt_shortcode_media;
  if (!media || typeof media !== 'object') return null;
  const captionEdges = media.edge_media_to_caption?.edges;
  const caption =
    Array.isArray(captionEdges) && captionEdges[0]?.node?.text
      ? String(captionEdges[0].node.text).trim()
      : null;
  const collected = collectInstagramMediaImages(media);
  return {
    caption,
    authorName: media.owner?.username ? String(media.owner.username) : null,
    imageUrls: collected.urls,
    isCarousel: collected.isCarousel,
  };
}

/** Public Instagram shortcode media (includes carousel children when available). */
async function fetchInstagramShortcodeMedia(shortcode) {
  if (!shortcode) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const csrfSession = await fetchInstagramCsrfSession(controller.signal);
    if (!csrfSession?.token) return null;

    const attempts = [
      {
        doc_id: IG_SHORTCODE_DOC_ID,
        variables: {
          shortcode,
          __relay_internal__pv__PolarisAIGMMediaWebLabelEnabledrelayprovider: false,
        },
      },
      {
        doc_id: IG_SHORTCODE_DOC_ID_LEGACY,
        variables: {
          shortcode,
          fetch_tagged_user_count: null,
          hoisted_comment_id: null,
          hoisted_reply_id: null,
        },
      },
    ];

    for (const attempt of attempts) {
      const body = new URLSearchParams({
        variables: JSON.stringify(attempt.variables),
        doc_id: attempt.doc_id,
        server_timestamps: 'true',
      });
      const res = await fetch('https://www.instagram.com/graphql/query', {
        method: 'POST',
        redirect: 'follow',
        signal: controller.signal,
        headers: instagramAuthHeaders(csrfSession, shortcode),
        body,
      });
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const parsed = parseInstagramShortcodePayload(data);
      if (parsed && (parsed.imageUrls?.length || parsed.caption)) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fallback: look up author's recent posts and match shortcode (includes carousel).
 */
async function fetchInstagramCarouselViaProfile(shortcode, authorName) {
  const username = String(authorName || '')
    .replace(/^@/, '')
    .trim();
  if (!shortcode || !username) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const csrfSession = await fetchInstagramCsrfSession(controller.signal);
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: '*/*',
          'X-IG-App-ID': IG_WEB_APP_ID,
          Referer: `https://www.instagram.com/${username}/`,
          ...(csrfSession?.token
            ? {
                'X-CSRFToken': csrfSession.token,
                ...(csrfSession.cookie ? { Cookie: csrfSession.cookie } : {}),
              }
            : {}),
        },
      },
    );
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges;
    if (!Array.isArray(edges)) return [];
    const match = edges.find((edge) => edge?.node?.shortcode === shortcode)?.node;
    return collectInstagramMediaImages(match).urls;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichInstagramSnapshot(url) {
  const shortcode = extractInstagramShortcode(url);
  const crawlerController = new AbortController();
  const crawlerTimeout = setTimeout(() => crawlerController.abort(), 12000);

  const [oembed, graphql, crawlerResult] = await Promise.all([
    fetchInstagramOEmbed(url),
    shortcode ? fetchInstagramShortcodeMedia(shortcode) : Promise.resolve(null),
    fetchHtmlDocument(url, CRAWLER_UA, crawlerController.signal).catch(() => ({
      res: null,
      html: '',
    })),
  ]).finally(() => clearTimeout(crawlerTimeout));

  const crawlerHtml = crawlerResult?.html || '';

  // Prefer the post's own media only. HTML extraction pulls profile grid / ads /
  // unrelated frames ("random screenshots").
  let imageUrls = mergeImageUrlLists(
    graphql?.imageUrls,
    oembed?.thumbnailUrl ? [oembed.thumbnailUrl] : [],
  );
  let isCarousel = Boolean(graphql?.isCarousel);

  // Profile timeline fallback: recover carousel children when GraphQL returned
  // nothing or only the cover frame. Match is by shortcode (not the whole grid).
  if (shortcode && imageUrls.length <= 1) {
    const fromProfile = await fetchInstagramCarouselViaProfile(
      shortcode,
      graphql?.authorName || oembed?.authorName,
    );
    if (fromProfile.length > imageUrls.length) {
      imageUrls = mergeImageUrlLists(fromProfile, imageUrls);
      if (fromProfile.length > 1) isCarousel = true;
    }
  }

  // Last resort only: og:image from HTML when GraphQL/oEmbed returned nothing.
  if (!imageUrls.length) {
    imageUrls = mergeImageUrlLists(
      imageUrls,
      extractImageCandidates(crawlerHtml, url).slice(0, 1),
    );
  }

  // Single-frame posts must stay at 1 photo (no thumbnail duplicates / HTML noise).
  if (!isCarousel && imageUrls.length > 1) {
    imageUrls = imageUrls.slice(0, 1);
  }

  const caption =
    graphql?.caption ||
    oembed?.caption ||
    extractMeta(crawlerHtml, 'property', 'og:description') ||
    null;
  // Prefer oEmbed display name for "author" context, but never use it as listing title.
  const authorName = oembed?.authorName || graphql?.authorName || null;
  const title = titleHintFromCaption(caption);

  const textParts = [];
  if (authorName) {
    textParts.push(
      `Instagram author (profile only — NOT the listing title): ${authorName}`,
    );
  }
  if (caption) textParts.push(`Post caption / description:\n${caption}`);

  return {
    ok: Boolean(caption || imageUrls.length || crawlerResult?.res?.ok),
    status: crawlerResult?.res?.status || (caption || imageUrls.length ? 200 : 0),
    finalUrl: crawlerResult?.res?.url || url,
    title,
    description: caption,
    caption,
    authorName,
    text: textParts.filter(Boolean).join('\n\n').slice(0, 6000),
    imageUrls,
    isCarousel,
    social: true,
    fetchError: caption || imageUrls.length ? null : 'Could not open this Instagram link',
  };
}

function buildSnapshotFromHtml({ url, pageResult, extraImageUrls = [], social = false }) {
  const html = pageResult?.html || '';
  const res = pageResult?.res || null;
  const ogTitle =
    extractMeta(html, 'property', 'og:title') ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ||
    null;
  const ogDescription =
    extractMeta(html, 'property', 'og:description') ||
    extractMeta(html, 'name', 'description') ||
    null;

  const imageUrls = mergeImageUrlLists(
    extraImageUrls,
    extractImageCandidates(html, url),
  );

  const textParts = [];
  if (ogTitle || ogDescription) {
    textParts.push([ogTitle, ogDescription].filter(Boolean).join('\n'));
  }
  if (!social && html && !isThinListingHtml(html)) {
    textParts.push(stripHtml(html).slice(0, 4000));
  } else if (!social && (ogTitle || ogDescription)) {
    textParts.push(stripHtml(html).slice(0, 1500));
  }

  return {
    ok: Boolean(res?.ok || imageUrls.length || ogTitle || ogDescription),
    status: res?.status || (imageUrls.length || ogTitle ? 200 : 0),
    finalUrl: res?.url || url,
    title: ogTitle,
    description: ogDescription,
    caption: ogDescription,
    authorName: null,
    text: textParts.filter(Boolean).join('\n\n').slice(0, 6000),
    imageUrls,
    social,
    fetchError:
      imageUrls.length || ogTitle || ogDescription
        ? null
        : pageResult?.fetchError || null,
  };
}

async function fetchPageSnapshot(url) {
  const social = isSocialMediaUrl(url);
  const instagram = isInstagramUrl(url);

  if (instagram) {
    try {
      return await enrichInstagramSnapshot(url);
    } catch (err) {
      return {
        ok: false,
        status: 0,
        finalUrl: url,
        title: null,
        description: null,
        caption: null,
        authorName: null,
        text: '',
        imageUrls: [],
        social: true,
        fetchError: err?.message || 'Failed to fetch Instagram post',
      };
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    // Same path for every website: browser HTML + crawler HTML (og tags / galleries),
    // then merge title, description, and images.
    const [browserResult, crawlerResult, remaxImages] = await Promise.all([
      fetchHtmlDocument(url, BROWSER_UA, controller.signal).catch((err) => ({
        res: null,
        html: '',
        fetchError: err?.message || 'Failed to fetch page',
      })),
      fetchHtmlDocument(url, CRAWLER_UA, controller.signal).catch(() => ({
        res: null,
        html: '',
      })),
      enrichRemaxAlbaniaImages(url),
    ]);

    const browserScore = htmlRichnessScore(browserResult.html);
    const crawlerScore = htmlRichnessScore(crawlerResult.html);
    const pageResult =
      crawlerScore > browserScore
        ? { ...crawlerResult, fetchError: crawlerResult.res?.ok ? null : browserResult.fetchError }
        : browserResult;

    const mergedImages = mergeImageUrlLists(
      remaxImages,
      extractImageCandidates(crawlerResult.html || '', url),
      extractImageCandidates(browserResult.html || '', url),
    );

    if (!pageResult.res && !mergedImages.length) {
      return {
        ok: false,
        status: 0,
        finalUrl: url,
        title: null,
        description: null,
        caption: null,
        authorName: null,
        text: '',
        imageUrls: [],
        social,
        fetchError: pageResult.fetchError || 'Failed to fetch page',
      };
    }

    const snapshot = buildSnapshotFromHtml({
      url,
      pageResult,
      extraImageUrls: mergedImages,
      social,
    });
    snapshot.imageUrls = mergeImageUrlLists(mergedImages, snapshot.imageUrls);
    return snapshot;
  } catch (err) {
    return {
      ok: false,
      status: 0,
      finalUrl: url,
      title: null,
      description: null,
      caption: null,
      authorName: null,
      text: '',
      imageUrls: [],
      social,
      fetchError: err?.message || 'Failed to fetch page',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function foldLookupName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pickBestNamedMatch(query, rows, getName) {
  const n = foldLookupName(query);
  if (!n || !Array.isArray(rows) || !rows.length) return null;
  const partial = [];
  for (const row of rows) {
    const rn = foldLookupName(getName(row));
    if (!rn) continue;
    if (rn === n) return row;
    if (rn.includes(n) || n.includes(rn)) partial.push({ row, score: Math.min(rn.length, n.length) });
  }
  if (!partial.length) return null;
  partial.sort((a, b) => b.score - a.score);
  return partial[0].row;
}

let citiesWithZonesCache = null;

async function loadCitiesWithZones() {
  if (citiesWithZonesCache) return citiesWithZonesCache;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from('real_estate_cities').select('id, name, zones');
  if (error) throw error;
  citiesWithZonesCache = data || [];
  return citiesWithZonesCache;
}

async function resolveCityRowByName(cityName) {
  const name = String(cityName || '').trim();
  if (!name) return null;
  const cities = await loadCitiesWithZones();
  return pickBestNamedMatch(name, cities, (c) => c.name);
}

async function resolveCityIdByName(cityName) {
  const city = await resolveCityRowByName(cityName);
  return city?.id || null;
}

function resolveZoneIdByName(cityRow, zoneName) {
  const zones = Array.isArray(cityRow?.zones) ? cityRow.zones : [];
  const match = pickBestNamedMatch(zoneName, zones, (z) => z.name);
  return match?.id || null;
}

function parseSurfaceM2(value) {
  if (value == null || value === '') return null;
  const s = String(value).replace(',', '.').replace(/[^\d.]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function applyResolvedLocation(form, interpreted, profile) {
  if (!form || typeof form !== 'object') return;
  const cities = await loadCitiesWithZones();
  const cityName = interpreted?.cityName || form.cityName || profile?.preferredCityName;
  let city = await resolveCityRowByName(cityName);
  if (!city) {
    const id = form.cityId || profile?.preferredCityId;
    if (id) city = cities.find((c) => String(c.id) === String(id)) || null;
  }
  if (city) {
    form.cityId = city.id;
    if (!interpreted.cityName) interpreted.cityName = city.name;
    if (!form.cityName) form.cityName = city.name;
  }
  const zoneName = interpreted?.zoneName || form.zoneName;
  if (zoneName && !form.zoneName) form.zoneName = zoneName;
  if (city && zoneName) {
    const zoneId = resolveZoneIdByName(city, zoneName);
    if (zoneId) {
      form.zoneId = zoneId;
      const zone = (city.zones || []).find((z) => String(z.id) === String(zoneId));
      if (zone?.name) {
        form.zoneName = zone.name;
        interpreted.zoneName = zone.name;
      }
    }
  }
  const surface = parseSurfaceM2(form.surfaceM2);
  form.surfaceM2 = surface != null ? String(surface) : '';
}

function buildSystemPrompt(preferredCategory, { mode = 'create' } = {}) {
  const hasPreferred = CATEGORIES.includes(preferredCategory);
  const categoryDefinitions = `Category definitions (STRICT — pick the true subject of the post):
- real-estate: apartments, houses, villas, rooms, land, offices, shops, warehouses FOR RENT OR SALE as property
- cars: complete vehicles only (car, SUV, van, truck, motorcycle, boat) for sale/rent — NOT car parts
- job-listings: hiring / employment offers (even if the workplace is a restaurant, clinic, or agency)
- marketplace: products/goods (phones, furniture, clothes, car parts, toys, food products, etc.) — NOT whole vehicles, NOT property for rent/sale
- businesses: restaurants, bars, cafés, local venues promoting the business itself (menu, hours, location)
- professionals: freelancers / personal & professional services (consulting, design, medical, courses, coaching, etc.)`;

  const categoryInstruction = hasPreferred
    ? `The user selected preferredCategory "${preferredCategory}".
${categoryDefinitions}

CATEGORY GUARD (CRITICAL):
1. Independently detect what the content ACTUALLY is from photos, caption, page text, and prompt — ignore preferredCategory while detecting.
2. Set "detectedCategory" to exactly one of: ${CATEGORIES.join(', ')}.
3. Set "categoryMatch": true ONLY if detectedCategory === "${preferredCategory}".
4. Set "categoryMatch": false when the content clearly belongs to a different vertical (e.g. apartment text/photos under cars, a job ad under real-estate, a restaurant under professionals, a phone under cars).
5. If the content is too thin/ambiguous to classify (e.g. only "change the price" while editing an existing listing in that category), set detectedCategory to "${preferredCategory}" and categoryMatch true.
6. When categoryMatch is false: STILL build a complete draft for detectedCategory (fill that category's form fields, title, summary, cityName). Set "category" to detectedCategory. Do NOT fill preferredCategory fields. The app will ask the user to switch category.
7. When categoryMatch is true: set "category" to "${preferredCategory}" and fill that category's form fields.`
    : `Choose exactly one category based on the true subject:
${categoryDefinitions}
Set "detectedCategory" to the same value as "category", and "categoryMatch": true.`;

  const contentPolicyInstruction = `CONTENT POLICY GUARD (CRITICAL — only for truly prohibited content):
KuTaGjej does NOT allow listings that involve restricted or prohibited content. Inspect photos, caption, page text, and prompt carefully.
Set "contentAllowed": false and fill "restrictedReasons" (string array) ONLY when ANY of the following is clearly intended or depicted:
- nudity / pornography / adult sexual content / sexual services ("nudity" or "sexual")
- gambling, betting, casinos, lottery schemes ("gambling")
- illegal drugs, narcotics, or controlled substance sales ("drugs")
- weapons, firearms, explosives, ammunition ("weapons")
- graphic violence or threats ("violence")
- hate speech, discrimination, or extremist recruitment ("hate")
- scams, phishing, fake documents, pyramid schemes ("fraud")
- counterfeit / pirated branded goods sold as genuine ("counterfeit")
- other clearly illegal activity (trafficking, stolen goods, etc.) ("illegal")
Use "other" ONLY for similarly illegal/prohibited material that has no better code above — NEVER for "wrong category", "does not match preferredCategory", or ordinary allowed goods/services in another vertical.

WRONG CATEGORY IS NOT PROHIBITED CONTENT (CRITICAL):
- A normal car/property/job/marketplace/business/professional listing under the wrong preferredCategory MUST keep contentAllowed true, restrictedReasons [], and use CATEGORY GUARD (categoryMatch false + detectedCategory).
- Example: user selected real-estate but pasted a BMW for sale → contentAllowed true, categoryMatch false, detectedCategory "cars". Do NOT set contentAllowed false.

Rules:
1. If contentAllowed is false (hard prohibited only): do NOT invent a sellable draft. Set title/summary to short refusal notes, form to {}, categoryMatch true, detectedCategory to preferredCategory when provided (or "marketplace"), and list every matching restrictedReasons code.
2. Lingerie, swimwear, medical anatomy diagrams, toy guns clearly for kids, alcohol/tobacco sold legally as products, and casino-themed decorations that are NOT gambling services are usually ALLOWED (contentAllowed true) unless they are explicit adult content or real gambling offers.
3. When contentAllowed is true: set restrictedReasons to [].
4. Prefer blocking only when prohibited intent is clear; if truly ambiguous and looks like a normal marketplace/job/property/car post, allow it and apply CATEGORY GUARD.`;

  const modeInstruction =
    mode === 'edit'
      ? `MODE: EDIT an existing listing.
You receive the current listing JSON plus the user's edit instructions (and optional images/links).
Return an UPDATED full draft. Keep fields the user did not ask to change. Apply only the requested edits.
If they ask to add/replace images, set imageRoles for attached images and/or keep/merge imageUrls.
When new photos are attached, re-identify the product/subject from the photos and refresh title/description accordingly (DESCRIPTION STYLE: listed bullets + keywords), then merge the user's edit notes.
Still apply the CONTENT POLICY GUARD and CATEGORY GUARD: block only truly prohibited content; if new photos/text clearly show a different vertical than preferredCategory, set categoryMatch false with contentAllowed true (wrong category is not prohibited content).`
      : `MODE: CREATE a new listing from the user's prompt and/or website links and/or attached images.
Use seller profile/signup info as defaults for business name / city when the listing omits them.
contactPhone: if a phone number appears in the caption, page text, prompt, or photos (e.g. "Nr tel +355 69 865 3949"), you MUST put THAT number in form.contactPhone. Use profile.phone ONLY when the listing content has no phone at all.`;

  return `You are KuTaGjej's listing assistant for Albania.
${modeInstruction}

${contentPolicyInstruction}

${categoryInstruction}

Return ONLY valid JSON:
{
  "contentAllowed": true,
  "restrictedReasons": [],
  "detectedCategory": "real-estate",
  "categoryMatch": true,
  "category": "professionals",
  "title": "short listing title",
  "summary": "1 sentence preview of what you built/changed",
  "cityName": "Tiranë or null",
  "zoneName": "Blloku or neighborhood/lagje or null",
  "imageUrls": ["https://..."],
  "imageRoles": ["cover", "profile", "gallery"],
  "form": { ...category-specific fields as strings when possible... }
}

imageRoles: optional array aligned with attachedImages order. Values: cover | profile | gallery | portfolio | work.
- cover = main/listing cover photo (first image for most categories)
- profile = avatar/profile photo (professionals imageUrls[1])
- gallery / work / portfolio = additional listing photos

Form fields by category:
real-estate: propertyCategory (apartment|villa|penthouse-duplex|room-studio-attic|parking|shop|office|building-plot|agricultural-land|commercial-local|warehouse), title, description, transactionType (rent|sale), price, surfaceM2 (number only, e.g. 85), currency (EUR|LEK), zoneName (neighborhood/lagje), condition, floor, totalFloors, bedrooms, bathrooms, furnishing, yearBuilt, contactPhone
  - ALWAYS extract surfaceM2 when m² / m2 / sqm is mentioned or readable on photos (floor plans, captions).
  - ALWAYS extract cityName AND zoneName/neighborhood when mentioned (Blloku, Komuna e Parisit, Qendër, Kashar, …). Put street/landmark in description as "• Adresa: …".
  - If city, zone, or m² is NOT in the photos/caption/prompt, leave them empty/null — do NOT invent a size or neighborhood.
cars: vehicleType (car|suv|van|truck|motorcycle|boat), make, model, variant, description, year, kilometers, transmission (automatic|manual), fuelType (petrol|diesel|electric|hybrid-petrol|plugin-hybrid|lpg), price, currency (EUR|LEK), color, contactPhone
  - LOOK at photos: scooters, bikes, motorcycles, dirt bikes → vehicleType "motorcycle" (NOT "car"/Vetura). Cars/sedans → "car". SUVs → "suv".
  - make/model MUST match common catalog spellings when visible or named (Yamaha, Honda, BMW, Mercedes-Benz, Volkswagen, …). Example: Yamaha Ténéré / TMAX → vehicleType motorcycle, make "Yamaha", model "Ténéré" or "TMAX".
  - Scooter / maxi-scooter / TMAX → motorcycle.
job-listings: title, description, industry, education, experience, jobType (full-time|part-time|remote|internship|freelance), workLocation (onsite|hybrid|remote), salary, currency, contactPhone, responsibilities (string[]), requirements (string[])
  - Job flyers/posters: OCR employer name, ALL open roles (e.g. Kamarier + Banakier → title like "Kamarier / Banakier"), street address + landmark → description "• Adresa: …", phone → contactPhone, shifts/hours → description + jobType/workLocation (night/evening shift → usually part-time or full-time + workLocation onsite). Infer cityName from street/neighborhood when obvious (Rruga e Kavajës → Tiranë).
marketplace: transactionType (always "shes"), title, description, category (elektronike|mobilje-shtepi|veshje-aksesore|libra-shkolla|sport-hobi|lodra|automjete-pjese|ushqime-bujqesi|sherbime|te-tjera), condition (i-ri|si-i-ri|shume-mire|mire|me-defekte), price, currency, contactPhone
businesses: title, description, category (restorant|bar|kafe|brunch|piceri-fast-food|pasticeri), contactPhone, servicesHighlight
professionals: title, description, category (konsulent|freelance|sherbim|kurse|dizajn-it|marketing|mjekesi|arsim), servicesHighlight, price, currency, contactPhone, responseTimeHours
  - fitness trainers / personal training / gym coaching / workout courses → category "kurse"
  - apps, digital products, subscriptions sold as products → marketplace (category "sherbime" or "sport-hobi") is OK when the post is mainly selling a product/app

DESCRIPTION STYLE for form.description (CRITICAL — never one big paragraph):
Write a clean, scannable, SEO-friendly description with real newlines in the JSON string. Structure:
1) Opening line — one short sentence with what is offered + searchable keywords (brand/model/product/job, key attribute, city when known).
2) Blank line, then a bullet list using "• " for every known structured fact. Skip unknown fields. Typical bullets (pick what applies): Marka, Modeli, Varianti, Tipi, Viti, Kilometrazhi, Karburanti, Transmisioni, Çmimi, Gjendja, Ngjyra, Sipërfaqja, Dhoma, Banjo, Produkti, Kategoria, Qyteti, Adresa, Orari, Shërbimi, Kompania, Pozicioni, Turni, Paga.
3) Buyer-critical extras from the caption/prompt/PHOTOS (REQUIRED when present — not optional). Add more "• " bullets for EVERY useful offer detail buyers care about, including:
   - Transport / shipping / RoRo / delivery time (e.g. "Përfshirë transport me RoRo, 35 ditë")
   - What the price includes or excludes (doganë, TVSH, registration, accessories)
   - Warranty, financing / këste, negotiable price, trade-in
   - Condition notes, accident/service history, ownership history
   - Important equipment / extras named in the caption
   - Location facts: city AND full street / landmark addresses when readable (e.g. "Rruga e Kavajës, pranë Raiffeisen Bank") — NEVER drop a real address just to shorten
   - Business / employer name, opening hours, shifts, schedule, salary range when visible
4) Closing CTA — one short line, e.g. "Kontaktoni për më shumë detaje."
CAPTION COMPLETENESS (CRITICAL): Read the FULL caption line by line, including text inside parentheses. Never drop a buyer-relevant clause just to shorten the description. Parenthetical price notes like "(Përfshirë transport me RoRo 35 ditë)" MUST become their own bullet(s).
Strip only: hashtag dumps, @mentions, emoji spam, URLs, English brand-disclaimer boilerplate, and empty trust fluff. Keep real offer facts (including addresses). Do NOT paste the raw caption. Do NOT write a single wall of text. Prefer under ~1100 characters (hard max ~1600) — completeness beats brevity when a fact helps the buyer.
Example:
Ofrohet Mercedes-Benz S-Class S350L, 2015, në Tiranë.\\n\\n• Marka: Mercedes-Benz\\n• Modeli: S-Class\\n• Varianti: S350L d 4MATIC\\n• Viti: 2015\\n• Kilometrazhi: 270000 km\\n• Çmimi: 17900 EUR\\n• Transport: Përfshirë transport me RoRo, 35 ditë\\n• Qyteti: Tiranë / Prishtinë\\n\\nKontaktoni për interes.

Vision + text fusion (CRITICAL when attached images are present — applies to ALL categories):
1. OCR / READ every readable word on flyers, posters, screenshots, menus, labels, and product packaging. Treat on-image text as primary source data — do not wait for the user to retype it.
2. Extract ALL valuable facts visible in photos into the draft, including when applicable:
   - What is offered (product, job role(s), property, service, vehicle)
   - Business / employer / brand name
   - Title / positions (e.g. "Kamarier", "Banakier" → job title; product name → marketplace title)
   - Location: cityName AND zoneName / neighborhood AND street / landmark (put street in description as "• Adresa: …"; map city to cityName and neighborhood to zoneName)
   - Size: surfaceM2 for properties when m² is visible or stated
   - Phone numbers → contactPhone (and mention in description only if useful)
   - Price / salary / currency
   - Hours, shifts, schedule ("turni i 3", "darkë", "full-time")
   - Requirements, responsibilities, benefits (jobs)
   - Specs readable on the item or poster (year, km, rooms, size, condition, etc.)
3. Write form.title that a buyer/applicant would search for from the strongest visible cue (job role, product+brand, property type, vehicle make/model).
4. Write form.description in DESCRIPTION STYLE above. COMBINE:
   a) EVERY useful readable fact from the photos (addresses, phones already mapped to contactPhone, hours, roles, prices, landmarks), AND
   b) EVERY useful detail from the user's prompt / caption (price notes, condition, city, "used once", transport/shipping, what's included, warranty, delivery days, shift notes, etc.).
   Merge into one listed description — never paste two separate blocks or the raw caption. Never omit a visible street address or landmark.
5. AUTO-COMPLETE form fields whenever photos or text make them clear — do not leave title/description/city/phone/enums empty if the image already shows them. Fill marketplace.category / cars.vehicleType / jobType / workLocation / propertyCategory / other enums from evidence.
6. Infer condition from photos + user text when possible (i-ri|si-i-ri|shume-mire|mire|me-defekte). If the user says "used once" / "si i ri", prefer si-i-ri or shume-mire.
7. Photos alone are enough to build a solid draft — never leave title/description empty when images clearly show an offer. The user should NOT need to tell you what to extract.
8. Do NOT invent brands, model numbers, addresses, phones, or technical specs that are not visible in photos and not stated in text. If unsure, describe generically ("multicooker elektrik inox", not a fake SKU).

Link / caption rules (when a URL snapshot is present and few/no attached photos):
- Prefer caption, page description, og:description, and the user's prompt for what is offered.
- Keep snapshotImageUrls as listing photos — only the post's own photos (carousel frames). Never invent extra images.
- Do NOT invent a profession from the username alone.
- Instagram / social posts: each post needs its OWN listing title derived from THAT post's caption (and photos). NEVER use authorName, Instagram @handle, profile display name, or profile.businessName / fullName as the listing title when the caption describes a product, vehicle, service, job, or offer. Example: caption about a Yamaha T-MAX → title about the scooter, not "Geshtenja Light".
- Description: ANALYZE the FULL caption — do NOT paste it verbatim. Rewrite in DESCRIPTION STYLE (listed bullets + keywords). Extract price, city, street address, make/model, phone into form fields / description. Preserve transport/shipping, inclusions, warranty, delivery time, and other buyer facts from the caption (including parenthetical notes on the price line).
- payload.title is only a caption hint (or null) — never treat authorName as the title.
- Phone from caption/photos ALWAYS wins over profile.phone (Albanian labels: "Nr tel", "Tel", "Telefon", WhatsApp, Viber).

General rules:
- Prefer Albanian for title/description when the caption/prompt is in Albanian; otherwise match the user's language.
- Leave truly unknown fields empty string / empty array / null — but always fill title + description when you can see or read enough.
- contactPhone MUST come from the listing (caption / prompt / photos) when a number is present. Use profile.phone ONLY if no phone appears in the listing content.
- Use profile.businessName / full name for title ONLY for businesses/professionals AND ONLY when the caption does not describe a specific offer (generic "about the shop/pro" posts). Never reuse the same profile name for every Instagram post.
- Use profile.preferredCityId / preferredCityName for city when the content does not mention a city.
- cityName should be an Albanian city when mentioned (e.g. Tiranë, Durrës).
- zoneName should be the neighborhood/lagje when mentioned (e.g. Blloku, Komuna e Parisit). Leave empty if unknown — never invent a zone.
- surfaceM2 for real-estate when size is stated. Leave empty if unknown — never invent m².
- imageUrls: keep absolute http(s) URLs from the page snapshot (snapshotImageUrls) whenever present (max 8). Never drop scraped listing photos that belong to the post. Attached images are sent separately — describe roles via imageRoles; do not invent fake image URLs.
- If the page is thin (Instagram login wall, blocked scraper) but caption or photos are present, build the draft from caption + prompt + photos + profile.`;
}

const MAX_ATTACHED_IMAGES = 6;
const MAX_IMAGE_CHARS = 6_500_000;

function normalizeAttachedImages(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (out.length >= MAX_ATTACHED_IMAGES) break;
    if (typeof item === 'string') {
      const value = item.trim();
      if (!value || value.length > MAX_IMAGE_CHARS) continue;
      if (
        /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value) ||
        /^https?:\/\//i.test(value)
      ) {
        out.push({ url: value, hint: '' });
      }
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const url = String(item.url || item.dataUrl || item.src || '').trim();
    if (!url || url.length > MAX_IMAGE_CHARS) continue;
    if (
      !/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(url) &&
      !/^https?:\/\//i.test(url)
    ) {
      continue;
    }
    out.push({
      url,
      hint: String(item.hint || item.role || item.caption || '').trim().slice(0, 120),
    });
  }
  return out;
}

const PHONE_LABEL_RE =
  /(?:nr\.?\s*(?:i\s+)?(?:tel(?:efon)?(?:it|i)?|cel(?:ular(?:i)?)?)|numri\s+(?:i\s+)?tel(?:efon)?it|tel(?:efon)?(?:i|it)?|phone|whats?\s*app|viber|cel(?:ular(?:i)?)?|gsm|kontakt(?:i)?)\b\s*[:.\-–—]?\s*/i;

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function cleanPhoneCandidate(raw) {
  let s = String(raw || '')
    .replace(/[\u00a0\u202f]/g, ' ')
    .trim()
    .replace(/[)\]}.,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  return s.slice(0, 40);
}

/** Albanian mobile / +355 / other plausible listing phones. Reject years, prices, IDs. */
function isLikelyListingPhone(digits) {
  if (!digits || digits.length < 8 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (/^(19|20)\d{2}$/.test(digits)) return false;

  let d = digits;
  if (d.startsWith('00')) d = d.slice(2);

  if (d.startsWith('355')) {
    const rest = d.slice(3).replace(/^0/, '');
    return rest.length === 8 || rest.length === 9;
  }
  // National mobile 0698653949 / 698653949
  if (/^0?6[6-9]\d{7,8}$/.test(d)) return true;
  // National landline 04xxxxxxx
  if (/^0[2-5]\d{7,8}$/.test(d)) return true;
  // International +XX …
  if (d.length >= 10 && d.length <= 15) return true;
  return false;
}

function scorePhoneCandidate(raw, { labeled = false } = {}) {
  const digits = phoneDigits(raw);
  if (!isLikelyListingPhone(digits)) return 0;
  let score = labeled ? 100 : 20;
  if (digits.startsWith('355') || /^\+355/.test(String(raw).trim())) score += 25;
  const national = digits.startsWith('355')
    ? digits.slice(3).replace(/^0/, '')
    : digits.replace(/^0/, '');
  if (/^6[6-9]\d{7}$/.test(national)) score += 15;
  return score;
}

function pushPhoneCandidate(into, raw, labeled) {
  const cleaned = cleanPhoneCandidate(raw);
  if (!cleaned) return;
  const score = scorePhoneCandidate(cleaned, { labeled });
  if (!score) return;
  const digits = phoneDigits(cleaned);
  const existing = into.find((c) => c.digits === digits);
  if (existing) {
    if (score > existing.score) {
      existing.raw = cleaned;
      existing.score = score;
    }
    return;
  }
  into.push({ raw: cleaned, digits, score });
}

/**
 * Pull a seller phone from Instagram caption / page text / prompt.
 * Prefers labeled numbers ("Nr tel +355 69 865 3949") over unlabeled digit runs.
 */
function extractContactPhoneFromText(text) {
  const src = String(text || '').replace(/[\u00a0\u202f]/g, ' ');
  if (!src.trim()) return null;
  const found = [];

  const labeledRe = new RegExp(
    `${PHONE_LABEL_RE.source}(\\+?\\d[\\d\\s()./-]{6,22}\\d)`,
    'gi',
  );
  let labeledMatch;
  while ((labeledMatch = labeledRe.exec(src))) {
    pushPhoneCandidate(found, labeledMatch[1], true);
  }

  const intlRe = /(?:\+|00)\s*\d{1,3}(?:[\s./-]*\d){7,14}/g;
  let intlMatch;
  while ((intlMatch = intlRe.exec(src))) {
    pushPhoneCandidate(found, intlMatch[0], false);
  }

  const localRe = /\b0?6[6-9](?:[\s./-]?\d){7,8}\b/g;
  let localMatch;
  while ((localMatch = localRe.exec(src))) {
    pushPhoneCandidate(found, localMatch[0], false);
  }

  if (!found.length) return null;
  found.sort((a, b) => b.score - a.score);
  return found[0].raw;
}

function extractContactPhoneFromListingSources({ snapshot, sourcePrompt, form } = {}) {
  const chunks = [
    snapshot?.caption,
    snapshot?.description,
    snapshot?.text,
    sourcePrompt,
    form?.description,
  ];
  for (const chunk of chunks) {
    const phone = extractContactPhoneFromText(chunk);
    if (phone) return phone;
  }
  return null;
}

/** Listing text/photos win; profile phone is only used when the listing has no number. */
function applyListingContactPhone(form, snapshot, sourcePrompt) {
  if (!form || typeof form !== 'object') return form;
  const fromListing = extractContactPhoneFromListingSources({ snapshot, sourcePrompt, form });
  if (fromListing) {
    form.contactPhone = fromListing;
  }
  return form;
}

function sanitizeProfile(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const firstName = String(raw.firstName || '').trim().slice(0, 80);
  const lastName = String(raw.lastName || '').trim().slice(0, 80);
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  return {
    accountType: String(raw.accountType || '').trim().slice(0, 40) || null,
    firstName: firstName || null,
    lastName: lastName || null,
    fullName: fullName || null,
    phone: String(raw.phone || '').trim().slice(0, 40) || null,
    email: String(raw.email || '').trim().slice(0, 120) || null,
    businessName: String(raw.businessName || '').trim().slice(0, 120) || null,
    businessOwner: String(raw.businessOwner || '').trim().slice(0, 120) || null,
    businessCategory: String(raw.businessCategory || '').trim().slice(0, 80) || null,
    nipt: String(raw.nipt || '').trim().slice(0, 40) || null,
    preferredCityId: String(raw.preferredCityId || '').trim().slice(0, 80) || null,
    preferredCityName: String(raw.preferredCityName || '').trim().slice(0, 80) || null,
  };
}

function applyProfileDefaultsToForm(form, profile, { allowProfileTitle = true } = {}) {
  if (!profile || !form || typeof form !== 'object') return form;
  if (!form.contactPhone && profile.phone) {
    form.contactPhone = profile.phone;
  }
  // Never stamp the same business/profile name onto every social post title.
  if (allowProfileTitle) {
    if (!form.title && profile.businessName) {
      form.title = profile.businessName;
    } else if (!form.title && profile.fullName) {
      form.title = profile.fullName;
    }
  }
  if (!form.cityId && profile.preferredCityId) {
    form.cityId = profile.preferredCityId;
  }
  if (!form.cityName && profile.preferredCityName) {
    form.cityName = profile.preferredCityName;
  }
  return form;
}

/**
 * After the model returns: ensure caption drives title, strip profile-like titles,
 * and never dump the raw Instagram caption into description (SEO rewrite is required).
 */
function applyCaptionFallbacks(interpreted, snapshot, profile) {
  if (!interpreted || typeof interpreted !== 'object') return interpreted;
  const caption = String(snapshot?.caption || snapshot?.description || '').trim();
  const authorName = snapshot?.authorName || null;
  const form = interpreted.form && typeof interpreted.form === 'object' ? interpreted.form : {};
  interpreted.form = form;

  const captionTitle = titleHintFromCaption(caption);
  const profileOpts = {
    authorName,
    businessName: profile?.businessName,
    fullName: profile?.fullName,
  };

  let title = String(interpreted.title || form.title || '').trim();
  if (!title || isProfileLikeTitle(title, profileOpts)) {
    if (captionTitle && !isProfileLikeTitle(captionTitle, profileOpts)) {
      title = captionTitle;
    } else if (captionTitle) {
      title = captionTitle;
    }
  }
  if (title) {
    interpreted.title = title;
    if (!form.title || isProfileLikeTitle(form.title, profileOpts)) {
      form.title = title;
    }
  }

  const seoMeta = {
    ...listingSeoMetaFromForm(form, interpreted),
    caption,
  };
  const description = String(form.description || '').trim();
  const captionNorm = caption.replace(/\s+/g, ' ').trim();
  const descIsRawCaption =
    Boolean(captionNorm) &&
    (description === caption ||
      description === captionNorm ||
      (captionNorm.length > 40 &&
        description.length > 40 &&
        description.slice(0, 80) === captionNorm.slice(0, 80)));

  if ((!description || descIsRawCaption) && caption) {
    form.description = refineCaptionToSeoDescription(caption, seoMeta);
  } else if (description) {
    form.description = ensureListedSeoDescription(description, seoMeta);
  } else if (caption) {
    form.description = refineCaptionToSeoDescription(caption, seoMeta);
  }

  return interpreted;
}

function listingSeoMetaFromForm(form = {}, interpreted = {}) {
  return {
    title: interpreted.title || form.title,
    make: form.make,
    model: form.model,
    variant: form.variant,
    vehicleType: form.vehicleType,
    year: form.year,
    kilometers: form.kilometers,
    transmission: form.transmission,
    fuelType: form.fuelType,
    color: form.color,
    condition: form.condition,
    price: form.price,
    currency: form.currency,
    surfaceM2: form.surfaceM2,
    bedrooms: form.bedrooms,
    bathrooms: form.bathrooms,
    category: form.category || form.propertyCategory,
    cityName: interpreted.cityName || form.cityName,
  };
}

function vehicleTypeLabelSq(vehicleType) {
  const v = String(vehicleType || '').trim().toLowerCase();
  if (v === 'motorcycle') return 'Motor / scooter';
  if (v === 'car') return 'Veturë';
  if (v === 'suv') return 'SUV';
  if (v === 'van') return 'Furgon';
  if (v === 'truck') return 'Kamion';
  if (v === 'boat') return 'Varkë';
  return '';
}

function cleanCaptionNoise(raw) {
  let text = String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/@[\p{L}\p{N}._]+/gu, ' ')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  text = text.replace(/^[\s.,;:!?\-–—]+/, '').trim();
  return text;
}

function descriptionLooksListed(desc) {
  const d = String(desc || '').trim();
  if (!d) return false;
  if (/^[•\-\*]\s+/m.test(d) || /\n\s*[•\-\*]\s+/.test(d)) return true;
  const lines = d.split(/\n/).map((l) => l.trim()).filter(Boolean);
  return lines.length >= 3;
}

function buildSeoDescriptionBullets(meta = {}) {
  const bullets = [];
  const push = (label, value) => {
    const v = String(value ?? '').trim();
    if (!v) return;
    bullets.push(`• ${label}: ${v}`);
  };

  push('Marka', meta.make);
  push('Modeli', meta.model);
  push('Varianti', meta.variant);
  push('Tipi', vehicleTypeLabelSq(meta.vehicleType));
  push('Viti', meta.year);
  if (meta.kilometers) {
    const km = String(meta.kilometers).trim();
    push('Kilometrazhi', /km/i.test(km) ? km : `${km} km`);
  }
  push('Karburanti', meta.fuelType);
  push('Transmisioni', meta.transmission);
  push('Ngjyra', meta.color);
  push('Gjendja', meta.condition);
  if (meta.price) {
    const cur = String(meta.currency || '').trim();
    push('Çmimi', cur ? `${meta.price} ${cur}` : meta.price);
  }
  if (meta.surfaceM2) {
    const s = String(meta.surfaceM2).trim();
    push('Sipërfaqja', /m/i.test(s) ? s : `${s} m²`);
  }
  push('Dhoma', meta.bedrooms);
  push('Banjo', meta.bathrooms);
  push('Kategoria', meta.category);
  push('Qyteti', meta.cityName);
  push('Adresa', meta.address);
  push('Orari', meta.hours);
  push('Kompania', meta.businessName);
  return bullets;
}

function buildSeoDescriptionOpener(meta = {}) {
  const vehicleLabel = vehicleTypeLabelSq(meta.vehicleType);
  const product =
    meta.make && meta.model
      ? `${meta.make} ${meta.model}`
      : meta.make || meta.model || String(meta.title || '').trim();
  const bits = [
    product || null,
    vehicleLabel || null,
    meta.cityName ? `në ${meta.cityName}` : null,
  ].filter(Boolean);
  if (bits.length) return `Ofrohet ${bits.join(', ')}.`;
  return 'Ofrohet për shitje.';
}

const SEO_DESCRIPTION_MAX_CHARS = 1600;

/** Buyer-critical caption facts that must not be dropped during SEO rewrite. */
const BUYER_DETAIL_RE =
  /\b(roro|ro[\s-]?ro|transport|shipping|delivery|d[eë]rges|dogan|customs|p[eë]rfshir|included|include|garanci|warranty|financ|k[eë]ste|pages[eë]|negoci|aksident|accident|servis|service history|k[eë]mbim|trade[\s-]?in|tvsh|vat|regjistrim|registration|import|eksport|export|porosit|adresa|rruga|sheshi|pran[eë]|landmark|orari|turni|dark[eë]|shift|lokacion|vendndodhja)\b/i;

const CAPTION_NOISE_LINE_RE =
  /\b(not affiliated|all items (are )?pre[- ]?owned|disclaimer|kontrollo i sigurt|vetem me stafin|vetëm me stafin|na gjeni cdo dite|na gjeni çdo ditë|for entertainment|trademark)\b/i;

function normalizeFactKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isCaptionNoiseLine(line) {
  const t = String(line || '').trim();
  if (!t) return true;
  if (CAPTION_NOISE_LINE_RE.test(t)) return true;
  // Keep address lines — they are buyer-critical. Strip bare phone-only lines (phones → contactPhone).
  if (/^(kontakt|tel|phone|telefon)\s*:/i.test(t) && !/\b(rruga|adresa|sheshi|pran[eë])\b/i.test(t)) {
    // If the line is only a phone label + digits, treat as noise.
    if (/^(kontakt|tel|phone|telefon)\s*:?\s*\+?\d[\d\s().-]{6,}$/i.test(t)) return true;
  }
  if (/^\+?\d[\d\s().-]{6,}$/.test(t)) return true;
  if (/^(ofrohet|shit(et|e)|kontaktoni)\b/i.test(t)) return true;
  return false;
}

function formatBuyerDetailBullet(raw) {
  let text = cleanCaptionNoise(raw)
    .replace(/^[•\-\*]+\s*/, '')
    .replace(/^[\s([{\\]+/, '')
    .replace(/[\s)\]}]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  // Normalize common transport / inclusion / address phrasing into a labeled bullet.
  if (/\b(roro|ro[\s-]?ro|transport|shipping|delivery|d[eë]rges)/i.test(text)) {
    text = text.replace(/^p[eë]rfshir[eë]\s+/i, 'Përfshirë ');
    if (!/^transport\s*:/i.test(text)) text = `Transport: ${text}`;
  } else if (/\b(garanci|warranty)\b/i.test(text) && !/^garanci\s*:/i.test(text)) {
    text = `Garanci: ${text}`;
  } else if (/\b(financ|k[eë]ste)\b/i.test(text) && !/^financ/i.test(text)) {
    text = `Financim: ${text}`;
  } else if (
    /\b(adresa|rruga|sheshi|pran[eë]|street|avenue|blvd)\b/i.test(text) &&
    !/^adresa\s*:/i.test(text)
  ) {
    text = text.replace(/^(info|informacion)\s*:?\s*/i, '');
    text = `Adresa: ${text}`;
  }

  if (text.length < 8 || text.length > 220) return null;
  return text;
}

/**
 * Pull buyer-critical facts from a raw Instagram/caption text.
 * Prefers parenthetical price notes and transport/shipping/warranty lines.
 */
function extractBuyerDetailFacts(caption, { max = 8 } = {}) {
  const raw = String(caption || '').trim();
  if (!raw) return [];

  const candidates = [];
  const pushCandidate = (value, priority) => {
    const formatted = formatBuyerDetailBullet(value);
    if (!formatted || isCaptionNoiseLine(formatted)) return;
    const key = normalizeFactKey(formatted);
    if (!key || key.length < 8) return;
    if (candidates.some((c) => c.key === key || c.key.includes(key) || key.includes(c.key))) {
      return;
    }
    // Prefer one transport / one warranty / one financing / one address bullet.
    const topic =
      /\b(roro|transport|shipping|delivery|d[eë]rges)\b/i.test(formatted)
        ? 'transport'
        : /\b(garanci|warranty)\b/i.test(formatted)
          ? 'garanci'
          : /\b(financ|k[eë]ste)\b/i.test(formatted)
            ? 'financim'
            : /\b(adresa|rruga|sheshi|pran[eë]|street|avenue|blvd)\b/i.test(formatted)
              ? 'adresa'
              : null;
    if (topic && candidates.some((c) => c.topic === topic)) return;
    candidates.push({ text: formatted, key, priority, topic });
  };

  // Parenthetical notes often hold the most important offer facts
  // e.g. "(Perfshire transport me RoRo 35 dite)".
  const parenRe = /\(([^)]{8,160})\)/g;
  let parenMatch;
  while ((parenMatch = parenRe.exec(raw))) {
    const inner = parenMatch[1];
    if (BUYER_DETAIL_RE.test(inner) || /\d/.test(inner)) {
      pushCandidate(inner, 0);
    }
  }

  const cleaned = cleanCaptionNoise(raw);
  const chunks = cleaned
    .split(/\n+|(?<=[.!?])\s+|;\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    if (isCaptionNoiseLine(chunk)) continue;
    // Only keep lines that clearly carry buyer-critical offer facts.
    if (!BUYER_DETAIL_RE.test(chunk)) continue;
    pushCandidate(chunk, 1);
  }

  candidates.sort((a, b) => a.priority - b.priority || a.text.length - b.text.length);
  return candidates.slice(0, max).map((c) => c.text);
}

function descriptionAlreadyCoversFact(description, fact) {
  const descKey = normalizeFactKey(description);
  const factKey = normalizeFactKey(fact);
  if (!descKey || !factKey) return true;
  if (descKey.includes(factKey) || factKey.includes(descKey)) return true;

  const tokens = factKey.split(' ').filter((t) => t.length >= 4);
  if (!tokens.length) return descKey.includes(factKey);
  // Distinctive tokens: require most of them (transport + roro + dite, etc.).
  const distinctive = tokens.filter(
    (t) =>
      !/^(me|per|nga|dhe|the|and|with|from|for|nese|vetem|cdo|dite|days|euro|eur|lek)$/i.test(
        t,
      ),
  );
  const check = distinctive.length ? distinctive : tokens;
  const hit = check.filter((t) => descKey.includes(t)).length;
  return hit >= Math.ceil(check.length * 0.7);
}

/**
 * If the model (or SEO rewrite) omitted buyer-critical caption facts, append them as bullets.
 */
function mergeMissingCaptionDetails(description, caption) {
  const desc = String(description || '').trim();
  const facts = extractBuyerDetailFacts(caption, { max: 8 });
  if (!facts.length) return desc;

  const missing = facts.filter((fact) => !descriptionAlreadyCoversFact(desc, fact));
  if (!missing.length) return desc;

  const bullets = missing.map((fact) => (fact.startsWith('•') ? fact : `• ${fact}`));
  if (!desc) {
    return [...bullets, '', 'Kontaktoni për më shumë detaje.']
      .join('\n')
      .trim()
      .slice(0, SEO_DESCRIPTION_MAX_CHARS);
  }

  const ctaRe = /\n+Kontaktoni[^\n]*$/i;
  if (ctaRe.test(desc)) {
    return desc
      .replace(ctaRe, `\n${bullets.join('\n')}\n\nKontaktoni për më shumë detaje.`)
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, SEO_DESCRIPTION_MAX_CHARS);
  }

  return `${desc}\n${bullets.join('\n')}`
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, SEO_DESCRIPTION_MAX_CHARS);
}

function splitUsefulDetailLines(text, { max = 6 } = {}) {
  return extractBuyerDetailFacts(text, { max });
}

/**
 * Build a listed, keyword-friendly SEO description from caption + structured fields.
 */
function refineCaptionToSeoDescription(caption, meta = {}) {
  const raw = String(caption || '').trim();
  const text = cleanCaptionNoise(raw);
  if (!text && !meta.title && !meta.make) return '';

  const opener = buildSeoDescriptionOpener(meta);
  const bullets = buildSeoDescriptionBullets(meta);
  const extras = splitUsefulDetailLines(raw, { max: 6 }).map((line) =>
    line.startsWith('•') ? line : `• ${line}`,
  );

  const parts = [opener];
  if (bullets.length || extras.length) {
    parts.push('', ...bullets, ...extras);
  } else if (text) {
    parts.push('', `• ${text.slice(0, 280)}`);
  }
  parts.push('', 'Kontaktoni për më shumë detaje.');

  return mergeMissingCaptionDetails(
    parts.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, SEO_DESCRIPTION_MAX_CHARS),
    raw,
  );
}

/**
 * If the model returned a wall of text, reshape into listed SEO style while keeping useful prose.
 * Always merge missing buyer-critical caption facts when meta.caption is provided.
 */
function ensureListedSeoDescription(description, meta = {}) {
  const desc = String(description || '').trim();
  const caption = String(meta.caption || '').trim();
  if (!desc) return refineCaptionToSeoDescription(caption, meta);

  let next;
  if (descriptionLooksListed(desc)) {
    next = cleanCaptionNoise(desc).slice(0, SEO_DESCRIPTION_MAX_CHARS);
  } else {
    const opener = buildSeoDescriptionOpener(meta);
    const bullets = buildSeoDescriptionBullets(meta);
    const extras = splitUsefulDetailLines(desc, { max: 6 }).map((line) =>
      line.startsWith('•') ? line : `• ${line}`,
    );
    const parts = [opener];
    if (bullets.length || extras.length) {
      parts.push('', ...bullets, ...extras);
    } else {
      parts.push('', `• ${cleanCaptionNoise(desc).slice(0, 280)}`);
    }
    if (!/kontaktoni/i.test(desc)) {
      parts.push('', 'Kontaktoni për më shumë detaje.');
    }
    next = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, SEO_DESCRIPTION_MAX_CHARS);
  }

  return caption ? mergeMissingCaptionDetails(next, caption) : next;
}

function normalizeVehicleTypeValue(raw) {
  const v = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
  if (!v) return '';
  if (VEHICLE_TYPE_VALUES.includes(v)) return v;
  if (
    /motor|moto|scooter|scuter|motorçiklet|motociklet|bike(?!car)|tmax|tenere|ténéré|vespa|enduro|cross/.test(
      v,
    )
  ) {
    return 'motorcycle';
  }
  if (/suv|crossover|jeep/.test(v)) return 'suv';
  if (/furgon|van|minivan/.test(v)) return 'van';
  if (/kamion|truck|camion/.test(v)) return 'truck';
  if (/boat|vark|jaht|yacht/.test(v)) return 'boat';
  if (/car|vetur|sedan|makin/.test(v)) return 'car';
  return '';
}

function findCatalogMakeInText(text, vehicleType) {
  const hay = String(text || '').toLowerCase();
  if (!hay || !vehicleType) return null;
  const makes = makesForVehicleType(vehicleType).filter((m) => m !== 'Other');
  // Longer names first (Mercedes-Benz before …).
  const sorted = [...makes].sort((a, b) => b.length - a.length);
  for (const make of sorted) {
    const key = make.toLowerCase();
    const alt = key.replace(/-/g, '[\\s-]?');
    const re = new RegExp(`(?:^|[^a-z0-9])${alt}(?:[^a-z0-9]|$)`, 'i');
    if (re.test(hay)) return make;
  }
  return null;
}

function findCatalogModelInText(text, vehicleType, make) {
  const hay = String(text || '').toLowerCase();
  if (!hay || !vehicleType || !make) return null;
  const hayLoose = hay.normalize('NFD').replace(/\p{M}/gu, '');
  const models = modelsForMake(vehicleType, make).filter((m) => m !== 'Other');
  const sorted = [...models].sort((a, b) => b.length - a.length);
  for (const model of sorted) {
    const key = model
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s*');
    // Accent-insensitive-ish for Ténéré / Tenere
    const loose = key.normalize('NFD').replace(/\p{M}/gu, '');
    if (new RegExp(`(?:^|[^a-z0-9])${loose}(?:[^a-z0-9]|$)`, 'i').test(hayLoose)) {
      return model;
    }
  }
  // Common aliases
  if (make === 'Yamaha') {
    if (/\bt[\s-]?max\b/i.test(hay) || /\btmax\b/i.test(hay)) return 'TMAX';
    if (/\bt[eé]n[eé]r[eé]\b/i.test(hayLoose)) return 'Ténéré';
  }
  return null;
}

function inferVehicleTypeFromText(text) {
  const hay = String(text || '').toLowerCase();
  if (!hay) return '';
  if (
    /motorçiklet|motociklet|\bmotor\b|\bmoto\b|scooter|scuter|tmax|t-max|ténéré|tenere|vespa|enduro|\bcbr\b|\bmt-0|\byzf\b/.test(
      hay,
    )
  ) {
    return 'motorcycle';
  }
  if (/\bsuv\b|crossover/.test(hay)) return 'suv';
  if (/\bfurgon\b|\bvan\b/.test(hay)) return 'van';
  if (/\bkamion\b|\btruck\b/.test(hay)) return 'truck';
  if (/\bvark|\bboat\b|\byacht\b/.test(hay)) return 'boat';
  return '';
}

function inferFuelTypeFromText(text) {
  if (!text) return '';
  const s = String(text).toLowerCase();
  if (/\b(naft[eë]|diesel|gazoil|dizel)\b/i.test(s)) return 'diesel';
  if (/\b(benzin[eë]|petrol|gasoline)\b/i.test(s)) return 'petrol';
  if (/\b(lpg|autogas|\bgaz\b)\b/i.test(s)) return 'lpg';
  if (/\b(hybrid.*diesel|hibrid.*naft)\b/i.test(s)) return 'hybrid-diesel';
  if (/\b(plugin|plug-in)\b/i.test(s)) return 'plugin-hybrid';
  if (/\b(hybrid|hibrid)\b/i.test(s)) return 'hybrid-petrol';
  if (/\b(elektrik|electric|\bev\b)\b/i.test(s)) return 'electric';
  if (/\b(metan|natural.?gas|cng)\b/i.test(s)) return 'natural-gas';
  return '';
}

/**
 * Fill / correct cars form fields from caption + catalog after the model runs.
 */
function normalizeCarFormFields(form, snapshot, interpreted) {
  if (!form || typeof form !== 'object') return form;
  const blob = [
    snapshot?.caption,
    snapshot?.description,
    snapshot?.text,
    interpreted?.title,
    form.title,
    form.description,
    form.make,
    form.model,
    form.variant,
  ]
    .filter(Boolean)
    .join('\n');

  const normalizedFuel = normalizeFuelType(form.fuelType) || inferFuelTypeFromText(blob);
  form.fuelType = normalizedFuel || '';

  let vehicleType =
    normalizeVehicleTypeValue(form.vehicleType) || inferVehicleTypeFromText(blob);
  if (!vehicleType && VEHICLE_TYPE_VALUES.includes(String(form.vehicleType || '').trim())) {
    vehicleType = String(form.vehicleType).trim();
  }

  // If make is a motorcycle-only brand, force motorcycle.
  if (!vehicleType || vehicleType === 'car') {
    const motoMake = findCatalogMakeInText(blob, 'motorcycle');
    if (motoMake) vehicleType = 'motorcycle';
  }

  if (vehicleType) form.vehicleType = vehicleType;

  let make = String(form.make || '').trim();
  if (vehicleType) {
    if (make && !isValidVehicleMake(vehicleType, make)) {
      const matched = makesForVehicleType(vehicleType).find(
        (m) => m.toLowerCase() === make.toLowerCase(),
      );
      make = matched || findCatalogMakeInText(make, vehicleType) || make;
    }
    if (!make || !isValidVehicleMake(vehicleType, make)) {
      make = findCatalogMakeInText(blob, vehicleType) || make;
    }
    if (make && isValidVehicleMake(vehicleType, make)) {
      form.make = make;
    } else if (make) {
      // Keep orphan so the UI can show it; prefer catalog when possible.
      const catalogHit = findCatalogMakeInText(make, vehicleType);
      form.make = catalogHit || make;
    }
  }

  let model = String(form.model || '').trim();
  if (vehicleType && form.make && (!model || model.length < 2)) {
    const found = findCatalogModelInText(blob, vehicleType, form.make);
    if (found) form.model = found;
  } else if (vehicleType && form.make && model) {
    const models = modelsForMake(vehicleType, form.make);
    const exact = models.find((m) => m.toLowerCase() === model.toLowerCase());
    if (exact) form.model = exact;
    else {
      const found = findCatalogModelInText(model, vehicleType, form.make);
      if (found) form.model = found;
    }
  }

  // Also extract variant if not already set and model is known
  if (vehicleType && form.make && form.model && !form.variant) {
    const titleStr = String(interpreted?.title || form.title || '').trim();
    if (titleStr) {
      const makeIdx = titleStr.toLowerCase().indexOf(form.make.toLowerCase().split(/[-\s]/)[0]);
      if (makeIdx !== -1) {
        const afterMake = titleStr.slice(makeIdx);
        const modelIdx = afterMake.toLowerCase().indexOf(form.model.toLowerCase());
        if (modelIdx !== -1) {
          const afterModel = afterMake.slice(modelIdx + form.model.length).trim();
          const cleaned = afterModel.replace(/^[-–—,:/|]+/, '').trim();
          if (cleaned && cleaned.length <= 50) {
            form.variant = cleaned;
          }
        }
      }
    }
  }

  return form;
}

function maxImagesForCategory(category) {
  if (category === 'cars') return MAX_CAR_LISTING_IMAGES;
  if (category === 'professionals') return 2;
  return MAX_SNAPSHOT_IMAGES;
}

function sanitizeCurrentListing(raw) {
  if (!raw || typeof raw !== 'object') return null;
  try {
    return JSON.parse(JSON.stringify(raw));
  } catch {
    return null;
  }
}

function buildVisionUserContent({ payload, attachedImages }) {
  const hasImages = Array.isArray(attachedImages) && attachedImages.length > 0;
  const parts = [
    {
      type: 'text',
      text: hasImages
        ? [
            'Task: OCR/read every attached photo carefully (flyers, posters, labels, products), then build a COMPLETE listing draft.',
            'Extract valuable on-image text: titles/roles, business names, street addresses & landmarks, phones, prices, hours/shifts, requirements — and map them into form fields + description bullets.',
            'Merge visual facts + OCR with the user prompt/caption in payload.prompt (and caption/description if present).',
            'The user should not need to restate what is already visible in the photo.',
            'Output JSON only. Title + description must be specific and buyer-ready; include • Adresa when a street/landmark is readable.',
            '',
            JSON.stringify(payload),
          ].join('\n')
        : JSON.stringify(payload),
    },
  ];
  for (let i = 0; i < attachedImages.length; i += 1) {
    const img = attachedImages[i];
    const hint = img.hint ? ` Hint: ${img.hint}` : '';
    parts.push({
      type: 'text',
      text: `Attached listing photo #${i + 1}.${hint} Read all visible text and visuals; use them for title, description bullets (including Adresa/Orari/Kompania when present), cityName, zoneName, surfaceM2, contactPhone, and other form fields.`,
    });
    parts.push({
      type: 'image_url',
      image_url: { url: img.url, detail: img.detail === 'low' ? 'low' : 'high' },
    });
  }
  return parts;
}

function zoneNameFromParsed(parsed) {
  if (typeof parsed?.zoneName === 'string' && parsed.zoneName.trim()) return parsed.zoneName.trim();
  const form = parsed?.form && typeof parsed.form === 'object' ? parsed.form : {};
  if (typeof form.zoneName === 'string' && form.zoneName.trim()) return form.zoneName.trim();
  return '';
}

function parseBooleanFlag(value) {
  if (value === true || value === false) return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true;
    if (normalized === 'false' || normalized === 'no' || normalized === '0') return false;
  }
  return null;
}

/**
 * Models occasionally use a familiar alias instead of the exact form key from
 * the prompt. Normalize those aliases before the draft reaches the frontend.
 */
function normalizeModelFormFields(parsed, categoryOverride = null) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const form =
    parsed.form && typeof parsed.form === 'object' && !Array.isArray(parsed.form)
      ? parsed.form
      : {};
  parsed.form = form;

  const copyAlias = (target, aliases) => {
    if (form[target] != null && String(form[target]).trim() !== '') return;
    const alias = aliases.find(
      (key) =>
        (form[key] != null && String(form[key]).trim() !== '') ||
        (parsed[key] != null && String(parsed[key]).trim() !== ''),
    );
    if (alias) form[target] = form[alias] ?? parsed[alias];
  };

  const copyTopLevel = (key) => {
    if (form[key] != null && String(form[key]).trim() !== '') return;
    if (parsed[key] != null && String(parsed[key]).trim() !== '') form[key] = parsed[key];
  };
  [
    'title',
    'description',
    'contactPhone',
    'cityName',
    'zoneName',
    'price',
    'currency',
    'condition',
    'servicesHighlight',
  ].forEach(copyTopLevel);

  copyAlias('title', ['listingTitle', 'name']);
  copyAlias('description', ['details', 'content', 'text']);
  copyAlias('contactPhone', ['phone', 'telephone', 'tel', 'whatsapp']);
  copyAlias('cityName', ['city', 'locationCity']);
  copyAlias('zoneName', ['neighborhood', 'neighbourhood', 'areaName']);

  const category = CATEGORIES.includes(categoryOverride)
    ? categoryOverride
    : CATEGORIES.includes(parsed.category)
    ? parsed.category
    : CATEGORIES.includes(parsed.detectedCategory)
      ? parsed.detectedCategory
      : null;
  if (category === 'cars') {
    ['vehicleType', 'make', 'model', 'variant', 'year', 'kilometers', 'transmission', 'fuelType', 'color'].forEach(
      copyTopLevel,
    );
    copyAlias('make', ['brand', 'vehicleMake']);
    copyAlias('model', ['vehicleModel']);
    copyAlias('vehicleType', ['vehicleCategory']);
    copyAlias('kilometers', ['km', 'mileage', 'mileageKm']);
    copyAlias('fuelType', ['fuel']);
    copyAlias('transmission', ['gearbox']);
  } else if (category === 'real-estate') {
    [
      'propertyCategory',
      'transactionType',
      'surfaceM2',
      'floor',
      'totalFloors',
      'bedrooms',
      'bathrooms',
      'furnishing',
      'yearBuilt',
    ].forEach(copyTopLevel);
    copyAlias('propertyCategory', ['propertyType']);
    copyAlias('surfaceM2', ['surface', 'area', 'size', 'sqm', 'squareMeters']);
    copyAlias('transactionType', ['listingType']);
  } else if (category === 'job-listings') {
    [
      'industry',
      'education',
      'experience',
      'jobType',
      'workLocation',
      'salary',
      'responsibilities',
      'requirements',
    ].forEach(copyTopLevel);
    copyAlias('jobType', ['employmentType']);
    copyAlias('workLocation', ['locationType']);
    copyAlias('responsibilities', ['duties']);
    copyAlias('requirements', ['qualifications']);
  }

  return parsed;
}

function buildCategoryMismatchResult(parsed, { forcedCategory, detectedCategory, fallbackImageUrls }) {
  const form = parsed.form && typeof parsed.form === 'object' ? parsed.form : {};
  const modelImageUrls = Array.isArray(parsed.imageUrls)
    ? parsed.imageUrls.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
    : [];
  const imageRoles = Array.isArray(parsed.imageRoles)
    ? parsed.imageRoles
        .map((r) => String(r || '').trim().toLowerCase())
        .map((r) => {
          if (r === 'cover' || r === 'main') return 'cover';
          if (r === 'profile' || r === 'avatar') return 'profile';
          if (r === 'portfolio' || r === 'work') return 'portfolio';
          return 'gallery';
        })
        .slice(0, MAX_ATTACHED_IMAGES)
    : [];
  const usableCategory =
    detectedCategory && CATEGORIES.includes(detectedCategory) ? detectedCategory : null;

  return {
    // Keep a ready draft for the true category; UI must confirm before post.
    category: usableCategory,
    detectedCategory: usableCategory,
    preferredCategory: forcedCategory,
    categoryMatch: false,
    contentAllowed: true,
    restrictedReasons: [],
    title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    cityName: typeof parsed.cityName === 'string' ? parsed.cityName.trim() : '',
    zoneName: zoneNameFromParsed(parsed),
    imageUrls: mergeImageUrlLists(fallbackImageUrls, modelImageUrls),
    imageRoles,
    form,
    error: CATEGORY_MISMATCH_CODE,
    errorMessage: categoryMismatchMessage(forcedCategory, usableCategory),
  };
}

function resolveCategorySignals(parsed, forcedCategory) {
  const detectedFromModel = CATEGORIES.includes(parsed.detectedCategory)
    ? parsed.detectedCategory
    : CATEGORIES.includes(parsed.category)
      ? parsed.category
      : null;
  const inferredFromForm = inferCategoryFromForm(parsed.form);
  const explicitMatch = parseBooleanFlag(parsed.categoryMatch);

  let categoryMismatch = false;
  let detectedCategory = detectedFromModel;

  if (forcedCategory) {
    if (detectedFromModel && detectedFromModel !== forcedCategory) {
      // True subject differs from the user-selected category — never force-post.
      categoryMismatch = true;
      detectedCategory = detectedFromModel;
    } else if (
      CATEGORIES.includes(parsed.category) &&
      parsed.category !== forcedCategory
    ) {
      categoryMismatch = true;
      detectedCategory = parsed.category;
    } else if (inferredFromForm && inferredFromForm !== forcedCategory) {
      categoryMismatch = true;
      detectedCategory = inferredFromForm;
    } else if (explicitMatch === false) {
      categoryMismatch = true;
      detectedCategory = detectedFromModel || inferredFromForm || null;
    } else {
      detectedCategory = forcedCategory;
    }
  }

  return { categoryMismatch, detectedCategory, detectedFromModel, explicitMatch };
}

/** Infer listing vertical from filled form fields when the model mislabels category. */
function inferCategoryFromForm(form) {
  if (!form || typeof form !== 'object') return null;
  const filled = (key) => {
    const value = form[key];
    if (value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    return String(value).trim() !== '';
  };

  if (
    filled('vehicleType') ||
    filled('make') ||
    filled('kilometers') ||
    filled('fuelType') ||
    filled('transmission')
  ) {
    return 'cars';
  }
  if (
    filled('propertyCategory') ||
    filled('surfaceM2') ||
    filled('bedrooms') ||
    filled('bathrooms') ||
    filled('furnishing') ||
    filled('totalFloors')
  ) {
    return 'real-estate';
  }
  if (
    filled('jobType') ||
    filled('workLocation') ||
    filled('responsibilities') ||
    filled('requirements') ||
    filled('industry')
  ) {
    return 'job-listings';
  }
  if (filled('responseTimeHours') && filled('servicesHighlight')) {
    return 'professionals';
  }
  if (
    filled('servicesHighlight') &&
    (filled('category') || filled('title')) &&
    !filled('vehicleType') &&
    !filled('propertyCategory') &&
    !filled('jobType')
  ) {
    // businesses form is thinner; only claim it when marketplace-style product fields are absent
    if (!filled('condition') && !filled('price')) return 'businesses';
    if (filled('condition') || form.transactionType === 'shes') return 'marketplace';
  }
  if (filled('condition') && (form.transactionType === 'shes' || filled('category'))) {
    return 'marketplace';
  }
  return null;
}

function parseAiListingResponse(raw, { forcedCategory, fallbackImageUrls = [] }) {
  let parsed;
  try {
    parsed = JSON.parse(typeof raw === 'string' ? raw : '{}');
  } catch {
    parsed = {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {};
  normalizeModelFormFields(parsed, forcedCategory);
  if (!parsed.form.title && parsed.title) parsed.form.title = parsed.title;
  if (!parsed.form.description && parsed.summary) parsed.form.description = parsed.summary;

  const restrictedReasons = normalizeRestrictedReasons(parsed.restrictedReasons);
  const contentAllowedFlag = parseBooleanFlag(parsed.contentAllowed);
  const contentBlocked =
    contentAllowedFlag === false ||
    (contentAllowedFlag == null && restrictedReasons.length > 0);

  const { categoryMismatch, detectedCategory } = resolveCategorySignals(parsed, forcedCategory);

  // Model sometimes marks wrong-category posts as contentAllowed:false with "other".
  // Prefer category mismatch (with switch UI) unless a hard prohibited reason is present.
  if (contentBlocked && categoryMismatch && !hasHardRestrictedReasons(restrictedReasons)) {
    return buildCategoryMismatchResult(parsed, {
      forcedCategory,
      detectedCategory,
      fallbackImageUrls,
    });
  }

  if (contentBlocked) {
    const reasons = restrictedReasons.length ? restrictedReasons : ['other'];
    return {
      category: null,
      detectedCategory: null,
      preferredCategory: forcedCategory || null,
      categoryMatch: true,
      contentAllowed: false,
      restrictedReasons: reasons,
      title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      cityName: '',
      imageUrls: [],
      imageRoles: [],
      form: {},
      error: CONTENT_RESTRICTED_CODE,
      errorMessage: contentRestrictedMessage(reasons),
    };
  }

  if (categoryMismatch) {
    return buildCategoryMismatchResult(parsed, {
      forcedCategory,
      detectedCategory,
      fallbackImageUrls,
    });
  }

  const category =
    forcedCategory ||
    (CATEGORIES.includes(parsed.category) ? parsed.category : 'marketplace');
  const form = parsed.form && typeof parsed.form === 'object' ? parsed.form : {};
  const modelImageUrls = Array.isArray(parsed.imageUrls)
    ? parsed.imageUrls.filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
    : [];
  const imageRoles = Array.isArray(parsed.imageRoles)
    ? parsed.imageRoles
        .map((r) => String(r || '').trim().toLowerCase())
        .map((r) => {
          if (r === 'cover' || r === 'main') return 'cover';
          if (r === 'profile' || r === 'avatar') return 'profile';
          if (r === 'portfolio' || r === 'work') return 'portfolio';
          return 'gallery';
        })
        .slice(0, MAX_ATTACHED_IMAGES)
    : [];

  return {
    category,
    detectedCategory: detectedCategory || category,
    preferredCategory: forcedCategory || null,
    categoryMatch: true,
    contentAllowed: true,
    restrictedReasons: [],
    title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    cityName: typeof parsed.cityName === 'string' ? parsed.cityName.trim() : '',
    zoneName: zoneNameFromParsed(parsed),
    // Always keep scraped page photos even if the model omits or reorders them.
    imageUrls: mergeImageUrlLists(fallbackImageUrls, modelImageUrls),
    imageRoles,
    form,
  };
}

async function callListingModel({
  preferredCategory,
  mode,
  userPayload,
  attachedImages,
}) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.status = 503;
    throw err;
  }

  const forcedCategory = CATEGORIES.includes(preferredCategory) ? preferredCategory : null;

  const maxAttempts = 6;
  let lastError = null;
  let incompleteDraftRetries = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const body = JSON.stringify({
      model: OPENAI_MODEL,
      temperature: mode === 'edit' ? 0.15 : 0.25,
      max_tokens:
        incompleteDraftRetries > 0 ? OPENAI_RETRY_MAX_TOKENS : OPENAI_INITIAL_MAX_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(forcedCategory, { mode }) },
        {
          role: 'user',
          content: buildVisionUserContent({
            payload: userPayload,
            attachedImages,
          }),
        },
      ],
    });
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
      const raw = payload?.choices?.[0]?.message?.content;
      const wasTruncated = payload?.choices?.[0]?.finish_reason === 'length';
      const parsed = parseAiListingResponse(raw, {
        forcedCategory,
        fallbackImageUrls: Array.isArray(userPayload.snapshotImageUrls)
          ? userPayload.snapshotImageUrls
          : Array.isArray(userPayload.imageUrls)
            ? userPayload.imageUrls
            : [],
      });
      const form = parsed.form && typeof parsed.form === 'object' ? parsed.form : {};
      const title = String(parsed.title || form.title || '').trim();
      const description = String(form.description || parsed.summary || '').trim();
      const isRestricted = parsed.error === CONTENT_RESTRICTED_CODE;
      const isMismatch =
        parsed.error === CATEGORY_MISMATCH_CODE || parsed.categoryMatch === false;
      const hasCategory = CATEGORIES.includes(parsed.category) || isRestricted;
      const hasCompleteDraft =
        isRestricted ||
        (hasCategory &&
          Boolean(title) &&
          Boolean(description) &&
          Object.keys(form).length > 0 &&
          (!isMismatch || Boolean(parsed.detectedCategory)));
      if (hasCompleteDraft && !wasTruncated) return parsed;

      lastError = new Error(
        wasTruncated
          ? 'AI response was truncated before the listing draft was complete'
          : 'AI returned an incomplete listing draft',
      );
      lastError.status = 502;
      if (incompleteDraftRetries < 1) {
        incompleteDraftRetries += 1;
        continue;
      }
      break;
    }

    const message = payload?.error?.message || `OpenAI request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    lastError = err;

    const retryable = isOpenAiRateLimitError(res.status, message) || res.status === 503;
    if (!retryable || attempt === maxAttempts) break;

    const waitMs = parseOpenAiRetryMs(message, res.headers.get('retry-after'));
    await sleep(waitMs);
  }

  throw lastError || new Error('OpenAI request failed');
}

async function fetchImageAsDataUrl(url) {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    let host = '';
    try {
      host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      host = '';
    }
    const isInstagramCdn =
      host.includes('cdninstagram.com') ||
      host.includes('fbcdn.net') ||
      host.includes('instagram.com');
    const res = await fetch(raw, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': BROWSER_UA,
        ...(isInstagramCdn
          ? { Referer: 'https://www.instagram.com/', Origin: 'https://www.instagram.com' }
          : {}),
      },
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (contentType && !contentType.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 4_500_000) return null;
    const compressed = await compressImageBuffer(buf, { folder: 'listings' });
    const dataUrl = `data:${compressed.mimetype};base64,${compressed.buffer.toString('base64')}`;
    if (dataUrl.length > MAX_IMAGE_CHARS) return null;
    return dataUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function compressAttachedVisionImage(img) {
  if (!img || typeof img !== 'object') return img;
  const raw = String(img.url || '').trim();
  if (!raw) return img;
  if (/^https?:\/\//i.test(raw)) {
    const dataUrl = await fetchImageAsDataUrl(raw);
    return dataUrl ? { ...img, url: dataUrl } : img;
  }
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=\s]+)$/i.exec(raw);
  if (!match) return img;
  try {
    const buf = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
    if (!buf.length || buf.length > 4_500_000) return img;
    const compressed = await compressImageBuffer(buf, { folder: 'listings' });
    const dataUrl = `data:${compressed.mimetype};base64,${compressed.buffer.toString('base64')}`;
    if (dataUrl.length > MAX_IMAGE_CHARS) return img;
    return { ...img, url: dataUrl };
  } catch {
    return img;
  }
}

/** Download a few scraped post photos so the model can visually identify vehicle type/make. */
async function prepareSnapshotVisionImages(snapshotImageUrls, maxImages = MAX_SNAPSHOT_VISION_IMAGES) {
  const cap = Math.max(0, Math.min(MAX_SNAPSHOT_VISION_IMAGES, Number(maxImages) || 0));
  const urls = Array.isArray(snapshotImageUrls) ? snapshotImageUrls : [];
  const out = [];
  for (const url of urls) {
    if (out.length >= cap) break;
    const dataUrl = await fetchImageAsDataUrl(url);
    if (dataUrl) {
      out.push({
        url: dataUrl,
        detail: 'low',
        hint: 'Scraped listing photo — identify the product/vehicle and fill vehicleType/make/model when visible.',
      });
    }
  }
  return out;
}

async function interpretListing({
  url,
  snapshot,
  preferredCategory,
  profile,
  attachedImages,
  mode,
  prompt,
  currentListing,
  maxSnapshotVisionImages = MAX_SNAPSHOT_VISION_IMAGES,
}) {
  const userAttached = attachedImages || [];
  // When the user didn't attach photos, analyze the scraped post images with vision.
  let visionImages = userAttached;
  if (!visionImages.length && Array.isArray(snapshot?.imageUrls) && snapshot.imageUrls.length) {
    visionImages = await prepareSnapshotVisionImages(snapshot.imageUrls, maxSnapshotVisionImages);
  } else if (visionImages.length) {
    visionImages = (
      await Promise.all(visionImages.map((img) => compressAttachedVisionImage(img)))
    ).filter(Boolean);
  }

  const motorcycleMakes = makesForVehicleType('motorcycle').filter((m) => m !== 'Other').slice(0, 40);

  return callListingModel({
    preferredCategory,
    mode: mode === 'edit' ? 'edit' : 'create',
    attachedImages: visionImages,
    userPayload: {
      source: url ? 'link' : 'prompt',
      url: url || null,
      prompt: prompt || null,
      preferredCategory: preferredCategory || null,
      profile: profile || null,
      currentListing: currentListing || null,
      fetchOk: snapshot?.ok ?? null,
      fetchStatus: snapshot?.status ?? null,
      fetchError: snapshot?.fetchError || null,
      title: snapshot?.title || null,
      description: snapshot?.description || null,
      // Explicit caption field so the model reads the post text, not only images.
      caption: snapshot?.caption || snapshot?.description || null,
      authorName: snapshot?.authorName || null,
      snapshotImageUrls: snapshot?.imageUrls || [],
      imageUrls: snapshot?.imageUrls || [],
      isCarousel: Boolean(snapshot?.isCarousel),
      text: snapshot?.text || null,
      vehicleCatalogHints:
        preferredCategory === 'cars' || !preferredCategory
          ? {
              vehicleTypes: VEHICLE_TYPE_VALUES,
              motorcycleMakes,
              note:
                'If photos/caption show a motorcycle/scooter, set vehicleType=motorcycle and pick make from motorcycleMakes when possible.',
            }
          : null,
      attachedImageCount: visionImages.length,
      attachedImageHints: visionImages.map((img, i) => ({
        index: i,
        hint: img.hint || null,
      })),
      instruction: visionImages.length
        ? 'Photos are primary: OCR every readable word on flyers/posters/labels (roles, business name, street address, landmark, neighborhood/zone, m², phone, price, hours/shifts) AND identify the product/vehicle/property/job from images. Write a concrete title and a listed SEO-friendly form.description (short opener + • keyword bullets including Adresa/Orari/Kompania when visible + CTA — never one paragraph or raw hashtags). Auto-fill every form field you can (title, cityName, zoneName, surfaceM2, contactPhone, enums, salary/price). Phone in caption/photos MUST become form.contactPhone (never substitute profile.phone when a listing number is present). Weave in EVERY useful detail from prompt/caption — especially transport/shipping/RoRo, delivery days, what price includes, warranty, financing, condition notes, parenthetical price notes, and shift/schedule notes. Do not invent unseen specs (including fake m² or zones). Never use authorName / Instagram profile name as title. Apply CONTENT POLICY GUARD only for truly prohibited content; wrong preferredCategory must use CATEGORY GUARD (categoryMatch false), never contentAllowed false.'
        : 'Build the listing from caption/description/text/prompt. Title must come from the post caption (what is offered), never from authorName or profile.businessName when caption exists. Rewrite caption into a listed SEO-friendly form.description (short opener + • keyword bullets + CTA — do not paste raw caption or write one wall of text). Extract structured fields AND preserve buyer-critical caption facts (transport/RoRo/shipping days, inclusions, warranty, financing, condition, street address, phone when present). form.contactPhone must be the caption/prompt/photo number when one exists — profile.phone is only a fallback. Do not invent professions or offers missing from the text. Apply CONTENT POLICY GUARD only for truly prohibited content; wrong preferredCategory must use CATEGORY GUARD (categoryMatch false), never contentAllowed false.',
    },
  });
}

async function finalizeDraft({ interpreted, sourceUrl, warning, profile, sourcePrompt, snapshot }) {
  const hasCaption = Boolean(String(snapshot?.caption || snapshot?.description || '').trim());
  const socialSource = Boolean(snapshot?.social) || isInstagramUrl(sourceUrl);
  // Social posts must not all inherit the same KuTaGjej business/profile name.
  const allowProfileTitle = !(socialSource && hasCaption);

  // Prefer category mismatch so the UI can offer a category switch instead of a hard block.
  if (interpreted?.error === CATEGORY_MISMATCH_CODE || interpreted?.categoryMatch === false) {
    applyCaptionFallbacks(interpreted, snapshot, profile);
    const errorMessage =
      interpreted.errorMessage ||
      categoryMismatchMessage(
        interpreted.preferredCategory,
        interpreted.detectedCategory,
      );
    let form = stringifyFormValues(interpreted.form);
    const detected = interpreted.detectedCategory || interpreted.category || null;
    if (detected === 'cars') {
      form = normalizeCarFormFields(form, snapshot, interpreted);
    }
    await applyResolvedLocation(form, interpreted, profile);
    applyListingContactPhone(form, snapshot, sourcePrompt);
    applyProfileDefaultsToForm(form, profile, { allowProfileTitle });

    const imageCap = maxImagesForCategory(detected);
    let imageUrls = Array.isArray(interpreted.imageUrls)
      ? interpreted.imageUrls.slice(0, imageCap)
      : [];
    if (snapshot?.social && snapshot?.isCarousel === false) {
      imageUrls = imageUrls.slice(0, 1);
    }

    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceUrl: sourceUrl || '',
      // Draft is built for the detected category; blocked until the user switches.
      category: detected,
      detectedCategory: interpreted.detectedCategory || null,
      preferredCategory: interpreted.preferredCategory || null,
      title: interpreted.title || form.title || form.make || '',
      summary: interpreted.summary || '',
      cityName: interpreted.cityName || form.cityName || profile?.preferredCityName || '',
      imageUrls,
      imageRoles: interpreted.imageRoles || [],
      form,
      warning: warning || null,
      error: errorMessage,
      errorCode: CATEGORY_MISMATCH_CODE,
      sourcePrompt: sourcePrompt || null,
    };
  }

  if (interpreted?.error === CONTENT_RESTRICTED_CODE || interpreted?.contentAllowed === false) {
    const reasons = normalizeRestrictedReasons(interpreted.restrictedReasons);
    const errorMessage =
      interpreted.errorMessage || contentRestrictedMessage(reasons.length ? reasons : ['other']);
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceUrl: sourceUrl || '',
      category: null,
      detectedCategory: null,
      preferredCategory: interpreted.preferredCategory || null,
      title: interpreted.title || '',
      summary: interpreted.summary || '',
      cityName: '',
      imageUrls: [],
      imageRoles: [],
      form: {},
      warning: warning || null,
      error: errorMessage,
      errorCode: CONTENT_RESTRICTED_CODE,
      restrictedReasons: reasons.length ? reasons : ['other'],
      sourcePrompt: sourcePrompt || null,
    };
  }

  applyCaptionFallbacks(interpreted, snapshot, profile);
  let form = stringifyFormValues(interpreted.form);
  const category = interpreted.category;
  if (category === 'cars') {
    form = normalizeCarFormFields(form, snapshot, interpreted);
    // Refresh SEO blurb once make/model/type are known.
    const caption = String(snapshot?.caption || snapshot?.description || '').trim();
    const seoMeta = {
      ...listingSeoMetaFromForm(form, interpreted),
      caption,
    };
    if (caption) {
      const desc = String(form.description || '').trim();
      const captionNorm = caption.replace(/\s+/g, ' ').trim();
      const looksRaw =
        !desc ||
        desc === caption ||
        desc === captionNorm ||
        (captionNorm.length > 40 && desc.slice(0, 80) === captionNorm.slice(0, 80));
      if (looksRaw) {
        form.description = refineCaptionToSeoDescription(caption, seoMeta);
      } else {
        form.description = ensureListedSeoDescription(desc, seoMeta);
      }
    } else if (form.description) {
      form.description = ensureListedSeoDescription(form.description, seoMeta);
    }
  } else if (form.description) {
    form.description = ensureListedSeoDescription(form.description, {
      ...listingSeoMetaFromForm(form, interpreted),
      caption: String(snapshot?.caption || snapshot?.description || '').trim(),
    });
  }
  await applyResolvedLocation(form, interpreted, profile);
  applyListingContactPhone(form, snapshot, sourcePrompt);
  applyProfileDefaultsToForm(form, profile, { allowProfileTitle });

  // If profile defaults still left a profile-like title, prefer caption again.
  if (
    hasCaption &&
    isProfileLikeTitle(form.title || interpreted.title, {
      authorName: snapshot?.authorName,
      businessName: profile?.businessName,
      fullName: profile?.fullName,
    })
  ) {
    const captionTitle = titleHintFromCaption(snapshot?.caption || snapshot?.description);
    if (captionTitle) {
      form.title = captionTitle;
      interpreted.title = captionTitle;
    }
  }

  const imageCap = maxImagesForCategory(category);
  const imageUrls = Array.isArray(interpreted.imageUrls)
    ? interpreted.imageUrls.slice(0, imageCap)
    : [];
  // Single-frame Instagram posts: never keep more than one photo.
  const cappedImages =
    snapshot?.social && snapshot?.isCarousel === false ? imageUrls.slice(0, 1) : imageUrls;

  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceUrl: sourceUrl || '',
    category: interpreted.category,
    detectedCategory: interpreted.detectedCategory || interpreted.category,
    title: interpreted.title || form.title || form.make || 'Draft listing',
    summary: interpreted.summary || '',
    cityName: interpreted.cityName || form.cityName || profile?.preferredCityName || '',
    imageUrls: cappedImages,
    imageRoles: interpreted.imageRoles || [],
    form,
    warning: warning || null,
    sourcePrompt: sourcePrompt || null,
  };
}

function friendlyFetchWarning(fetchError) {
  const raw = String(fetchError || '').trim();
  if (!raw || /fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|aborted|timeout/i.test(raw)) {
    return 'Could not open this link; draft may need edits.';
  }
  return raw;
}

function stringifyFormValues(form) {
  const out = {};
  for (const [key, value] of Object.entries(form || {})) {
    if (value == null) {
      out[key] = Array.isArray(value) ? [] : '';
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((v) => String(v ?? '').trim()).filter(Boolean);
      continue;
    }
    if (typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    out[key] = String(value).trim();
  }
  return out;
}

async function importListingsFromLinks({
  urls: rawUrls,
  text,
  category,
  profile: rawProfile,
  images,
  mode: rawMode,
  currentListing: rawCurrent,
}) {
  const prompt = String(text || '').trim();
  const urls = extractUrls(rawUrls?.length ? rawUrls : prompt);
  const attachedImages = normalizeAttachedImages(images);
  const profile = sanitizeProfile(rawProfile);
  const mode = rawMode === 'edit' ? 'edit' : 'create';
  const currentListing = mode === 'edit' ? sanitizeCurrentListing(rawCurrent) : null;
  const preferredCategory = CATEGORIES.includes(category) ? category : null;

  if (!urls.length && !prompt && !attachedImages.length) {
    const err = new Error('Paste a link, describe the listing, or attach images');
    err.status = 400;
    throw err;
  }

  if (mode === 'edit' && !preferredCategory) {
    const err = new Error('Category is required when editing with AI');
    err.status = 400;
    throw err;
  }

  const drafts = [];

  if (!urls.length) {
    try {
      const interpreted = await interpretListing({
        url: null,
        snapshot: null,
        preferredCategory,
        profile,
        attachedImages,
        mode,
        prompt,
        currentListing,
      });
      drafts.push(
        await finalizeDraft({
          interpreted,
          sourceUrl: '',
          warning: null,
          profile,
          sourcePrompt: prompt,
        }),
      );
    } catch (err) {
      const rateLimited = isOpenAiRateLimitError(err?.status, err?.message);
      drafts.push({
        id: `ai-${Date.now()}`,
        sourceUrl: '',
        category: preferredCategory,
        title: '',
        summary: '',
        cityName: '',
        imageUrls: [],
        imageRoles: [],
        form: {},
        error: rateLimited ? OPENAI_RATE_LIMIT_MESSAGE : err?.message || 'Failed to analyze prompt',
        errorCode: rateLimited ? OPENAI_RATE_LIMIT_CODE : null,
      });
    }
    return { drafts };
  }

  const maxSnapshotVisionImages = MAX_SNAPSHOT_VISION_IMAGES;

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    try {
      const snapshot = await fetchPageSnapshot(url);
      const interpreted = await interpretListing({
        url,
        snapshot,
        preferredCategory,
        profile,
        attachedImages,
        mode,
        prompt,
        currentListing,
        maxSnapshotVisionImages,
      });
      interpreted.imageUrls = mergeImageUrlLists(
        snapshot.imageUrls,
        interpreted.imageUrls,
      );
      drafts.push(
        await finalizeDraft({
          interpreted,
          sourceUrl: url,
          warning: snapshot.ok
            ? null
            : friendlyFetchWarning(snapshot.fetchError),
          profile,
          sourcePrompt: prompt,
          snapshot,
        }),
      );
    } catch (err) {
      const rateLimited = isOpenAiRateLimitError(err?.status, err?.message);
      drafts.push({
        id: `ai-${Date.now()}-${drafts.length}`,
        sourceUrl: url,
        category: null,
        title: '',
        summary: '',
        cityName: '',
        imageUrls: [],
        imageRoles: [],
        form: {},
        error: rateLimited ? OPENAI_RATE_LIMIT_MESSAGE : err?.message || 'Failed to analyze link',
        errorCode: rateLimited ? OPENAI_RATE_LIMIT_CODE : null,
      });
      if (rateLimited && i < urls.length - 1) {
        await sleep(parseOpenAiRetryMs(err?.message));
      }
    }
  }

  return { drafts };
}

module.exports = {
  isOpenAiConfigured,
  extractUrls,
  importListingsFromLinks,
  parseAiListingResponse,
  extractContactPhoneFromText,
  MAX_IMPORT_URLS,
  CATEGORIES,
  CATEGORY_MISMATCH_CODE,
  CONTENT_RESTRICTED_CODE,
};

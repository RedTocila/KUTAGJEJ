'use strict';

const { getSupabaseAdmin } = require('./supabase');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
/** Max listing/source links processed in one import request. */
const MAX_IMPORT_URLS = 20;

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
/** Instagram web GraphQL doc used by Polaris post pages. */
const IG_SHORTCODE_DOC_ID = '10015901848480474';
const MAX_SNAPSHOT_IMAGES = 8;

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

function collectInstagramMediaImages(mediaNode) {
  const urls = [];
  if (!mediaNode || typeof mediaNode !== 'object') return urls;
  const push = (raw) => {
    const value = decodeHtmlEntities(String(raw || '').trim());
    if (/^https?:\/\//i.test(value) && !isLikelyJunkImageUrl(value) && !urls.includes(value)) {
      urls.push(value);
    }
  };

  const children = mediaNode.edge_sidecar_to_children?.edges;
  if (Array.isArray(children) && children.length) {
    for (const edge of children) {
      push(edge?.node?.display_url);
      if (urls.length >= MAX_SNAPSHOT_IMAGES) break;
    }
    return urls;
  }

  push(mediaNode.display_url);
  push(mediaNode.thumbnail_src);
  return urls;
}

/** Public Instagram shortcode media (includes carousel children when available). */
async function fetchInstagramShortcodeMedia(shortcode) {
  if (!shortcode) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const body = new URLSearchParams({
      variables: JSON.stringify({
        shortcode,
        fetch_tagged_user_count: null,
        hoisted_comment_id: null,
        hoisted_reply_id: null,
      }),
      doc_id: IG_SHORTCODE_DOC_ID,
    });
    const res = await fetch('https://www.instagram.com/graphql/query', {
      method: 'POST',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: '*/*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-IG-App-ID': IG_WEB_APP_ID,
        Referer: `https://www.instagram.com/p/${shortcode}/`,
      },
      body,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const media = data?.data?.xdt_shortcode_media;
    if (!media || typeof media !== 'object') return null;

    const captionEdges = media.edge_media_to_caption?.edges;
    const caption =
      Array.isArray(captionEdges) && captionEdges[0]?.node?.text
        ? String(captionEdges[0].node.text).trim()
        : null;
    return {
      caption,
      authorName: media.owner?.username ? String(media.owner.username) : null,
      imageUrls: collectInstagramMediaImages(media),
    };
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
        },
      },
    );
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges;
    if (!Array.isArray(edges)) return [];
    const match = edges.find((edge) => edge?.node?.shortcode === shortcode)?.node;
    return collectInstagramMediaImages(match);
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
  let imageUrls = mergeImageUrlLists(
    graphql?.imageUrls,
    oembed?.thumbnailUrl ? [oembed.thumbnailUrl] : [],
    extractImageCandidates(crawlerHtml, url),
  );

  // GraphQL is rate-limited sometimes; profile timeline still includes sidecar children.
  const graphqlCount = Array.isArray(graphql?.imageUrls) ? graphql.imageUrls.length : 0;
  if (shortcode && graphqlCount <= 1) {
    const fromProfile = await fetchInstagramCarouselViaProfile(
      shortcode,
      graphql?.authorName || oembed?.authorName,
    );
    imageUrls = mergeImageUrlLists(fromProfile, imageUrls);
  }

  const caption =
    graphql?.caption ||
    oembed?.caption ||
    extractMeta(crawlerHtml, 'property', 'og:description') ||
    null;
  const authorName = graphql?.authorName || oembed?.authorName || null;
  const title =
    (authorName ? `@${authorName}` : null) ||
    extractMeta(crawlerHtml, 'property', 'og:title') ||
    null;

  const textParts = [];
  if (authorName) textParts.push(`Instagram author: @${authorName}`);
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

async function resolveCityIdByName(cityName) {
  const name = String(cityName || '').trim();
  if (!name) return null;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('real_estate_cities')
    .select('id, name')
    .ilike('name', name)
    .limit(5);
  if (error) throw error;
  if (!data?.length) return null;
  const exact = data.find((c) => String(c.name).toLowerCase() === name.toLowerCase());
  return (exact || data[0]).id;
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
When new photos are attached, re-identify the product/subject from the photos and refresh title/description accordingly, then merge the user's edit notes.
Still apply the CONTENT POLICY GUARD and CATEGORY GUARD: block only truly prohibited content; if new photos/text clearly show a different vertical than preferredCategory, set categoryMatch false with contentAllowed true (wrong category is not prohibited content).`
      : `MODE: CREATE a new listing from the user's prompt and/or website links and/or attached images.
Use seller profile/signup info as defaults when the prompt omits contact details, business name, phone, etc.`;

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
  "imageUrls": ["https://..."],
  "imageRoles": ["cover", "profile", "gallery"],
  "form": { ...category-specific fields as strings when possible... }
}

imageRoles: optional array aligned with attachedImages order. Values: cover | profile | gallery | portfolio | work.
- cover = main/listing cover photo (first image for most categories)
- profile = avatar/profile photo (professionals imageUrls[1])
- gallery / work / portfolio = additional listing photos

Form fields by category:
real-estate: propertyCategory (apartment|villa|penthouse-duplex|room-studio-attic|parking|shop|office|building-plot|agricultural-land|commercial-local|warehouse), title, description, transactionType (rent|sale), price, surfaceM2, currency (EUR|LEK), condition, floor, totalFloors, bedrooms, bathrooms, furnishing, yearBuilt, contactPhone
cars: vehicleType (car|suv|van|truck|motorcycle|boat), make, model, variant, description, year, kilometers, transmission (automatic|manual), fuelType (petrol|diesel|electric|hybrid-petrol|plugin-hybrid|lpg), price, currency (EUR|LEK), color, contactPhone
job-listings: title, description, industry, education, experience, jobType (full-time|part-time|remote|internship|freelance), workLocation (onsite|hybrid|remote), salary, currency, contactPhone, responsibilities (string[]), requirements (string[])
marketplace: transactionType (always "shes"), title, description, category (elektronike|mobilje-shtepi|veshje-aksesore|libra-shkolla|sport-hobi|lodra|automjete-pjese|ushqime-bujqesi|sherbime|te-tjera), condition (i-ri|si-i-ri|shume-mire|mire|me-defekte), price, currency, contactPhone
businesses: title, description, category (restorant|bar|kafe|brunch|piceri-fast-food|pasticeri), contactPhone, servicesHighlight
professionals: title, description, category (konsulent|freelance|sherbim|kurse|dizajn-it|marketing|mjekesi|arsim), servicesHighlight, price, currency, contactPhone, responseTimeHours
  - fitness trainers / personal training / gym coaching / workout courses → category "kurse"
  - apps, digital products, subscriptions sold as products → marketplace (category "sherbime" or "sport-hobi") is OK when the post is mainly selling a product/app

Vision + text fusion (CRITICAL when attached images are present):
1. LOOK carefully at every attached photo. Identify what is shown: product type, brand/model if readable on the item or packaging, color, material, size cues, condition, quantity, accessories, room/context.
2. Write form.title that a buyer would search for (brand + product name + key attribute when visible).
3. Write form.description as a complete marketplace-ready text that COMBINES:
   a) What you see in the photos (concrete visual facts — do not invent specs you cannot see), AND
   b) Extra details from the user's prompt / caption (price notes, condition, city, "used once", delivery, SEO notes, etc.).
   Merge them into one natural description — do not paste two separate blocks. Prefer Albanian when the user wrote in Albanian.
4. Fill marketplace.category / cars.vehicleType / other enum fields from what the photos show (e.g. Instant Pot / multicooker → elektronike; sofa → mobilje-shtepi).
5. Infer condition from photos + user text when possible (i-ri|si-i-ri|shume-mire|mire|me-defekte). If the user says "used once" / "si i ri", prefer si-i-ri or shume-mire.
6. If the user mentions price/currency/city/phone in text, put those in the matching form fields.
7. Photos alone are enough to build a solid draft — never leave title/description empty when images clearly show a product.
8. Do NOT invent brands, model numbers, or technical specs that are not visible in photos and not stated in text. If unsure, describe generically ("multicooker elektrik inox", not a fake SKU).

Link / caption rules (when a URL snapshot is present and few/no attached photos):
- Prefer caption, page description, og:description, and the user's prompt for what is offered.
- Keep snapshotImageUrls as listing photos.
- Do NOT invent a profession from the username alone.

General rules:
- Prefer Albanian for title/description when the caption/prompt is in Albanian; otherwise match the user's language.
- Leave truly unknown fields empty string / empty array / null — but always fill title + description when you can see or read enough.
- Use profile.phone for contactPhone when missing. Use profile.businessName / full name for title when relevant for businesses/professionals.
- cityName should be an Albanian city when mentioned (e.g. Tiranë, Durrës).
- imageUrls: keep absolute http(s) URLs from the page snapshot (snapshotImageUrls) whenever present (max 8). Never drop scraped listing photos. Attached images are sent separately — describe roles via imageRoles; do not invent fake image URLs.
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
  };
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
            'Task: Identify the product/subject in the photos below, then build a complete listing draft.',
            'Merge visual facts from the photos with the user prompt/caption in payload.prompt (and caption/description if present).',
            'Output JSON only. Title + description must be specific and buyer-ready.',
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
      text: `Attached listing photo #${i + 1}.${hint} Describe what you see and use it for title/description/category.`,
    });
    parts.push({
      type: 'image_url',
      image_url: { url: img.url, detail: 'high' },
    });
  }
  return parts;
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
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: mode === 'edit' ? 0.15 : 0.25,
      max_tokens: 1800,
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
  return parseAiListingResponse(raw, {
    forcedCategory,
    fallbackImageUrls: Array.isArray(userPayload.snapshotImageUrls)
      ? userPayload.snapshotImageUrls
      : Array.isArray(userPayload.imageUrls)
        ? userPayload.imageUrls
        : [],
  });
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
}) {
  return callListingModel({
    preferredCategory,
    mode: mode === 'edit' ? 'edit' : 'create',
    attachedImages: attachedImages || [],
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
      text: snapshot?.text || null,
      attachedImageCount: (attachedImages || []).length,
      attachedImageHints: (attachedImages || []).map((img, i) => ({
        index: i,
        hint: img.hint || null,
      })),
      instruction: (attachedImages || []).length
        ? 'Photos are primary: identify the product from images, write a concrete title and description from what you see, then weave in every useful detail from prompt/caption (price, condition, city, extras). Do not invent unseen specs. Apply CONTENT POLICY GUARD only for truly prohibited content; wrong preferredCategory must use CATEGORY GUARD (categoryMatch false), never contentAllowed false.'
        : 'Build the listing from caption/description/text/prompt. Do not invent professions or offers missing from the text. Apply CONTENT POLICY GUARD only for truly prohibited content; wrong preferredCategory must use CATEGORY GUARD (categoryMatch false), never contentAllowed false.',
    },
  });
}

async function finalizeDraft({ interpreted, sourceUrl, warning, profile, sourcePrompt }) {
  // Prefer category mismatch so the UI can offer a category switch instead of a hard block.
  if (interpreted?.error === CATEGORY_MISMATCH_CODE || interpreted?.categoryMatch === false) {
    const errorMessage =
      interpreted.errorMessage ||
      categoryMismatchMessage(
        interpreted.preferredCategory,
        interpreted.detectedCategory,
      );
    const form = stringifyFormValues(interpreted.form);
    const cityId = await resolveCityIdByName(interpreted.cityName || form.cityName);
    if (cityId) form.cityId = cityId;
    if (!form.contactPhone && profile?.phone) {
      form.contactPhone = profile.phone;
    }
    if (!form.title && profile?.businessName) {
      form.title = profile.businessName;
    }

    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceUrl: sourceUrl || '',
      // Draft is built for the detected category; blocked until the user switches.
      category: interpreted.detectedCategory || interpreted.category || null,
      detectedCategory: interpreted.detectedCategory || null,
      preferredCategory: interpreted.preferredCategory || null,
      title: interpreted.title || form.title || form.make || '',
      summary: interpreted.summary || '',
      cityName: interpreted.cityName || '',
      imageUrls: interpreted.imageUrls || [],
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

  const form = stringifyFormValues(interpreted.form);
  const cityId = await resolveCityIdByName(interpreted.cityName || form.cityName);
  if (cityId) form.cityId = cityId;

  if (!form.contactPhone && profile?.phone) {
    form.contactPhone = profile.phone;
  }
  if (!form.title && profile?.businessName) {
    form.title = profile.businessName;
  }

  return {
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceUrl: sourceUrl || '',
    category: interpreted.category,
    detectedCategory: interpreted.detectedCategory || interpreted.category,
    title: interpreted.title || form.title || form.make || 'Draft listing',
    summary: interpreted.summary || '',
    cityName: interpreted.cityName || '',
    imageUrls: interpreted.imageUrls,
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
        error: err?.message || 'Failed to analyze prompt',
      });
    }
    return { drafts };
  }

  for (const url of urls) {
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
        }),
      );
    } catch (err) {
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
        error: err?.message || 'Failed to analyze link',
      });
    }
  }

  return { drafts };
}

module.exports = {
  isOpenAiConfigured,
  extractUrls,
  importListingsFromLinks,
  parseAiListingResponse,
  MAX_IMPORT_URLS,
  CATEGORIES,
  CATEGORY_MISMATCH_CODE,
  CONTENT_RESTRICTED_CODE,
};

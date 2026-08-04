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

function isOpenAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

function normalizeUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function extractUrls(input) {
  const text = Array.isArray(input) ? input.join('\n') : String(input || '');
  const seen = new Set();
  const urls = [];

  for (const line of text.split(/[\n,]+/)) {
    const normalized = normalizeUrl(line);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
    if (urls.length >= MAX_IMPORT_URLS) break;
  }

  if (urls.length === 0) {
    const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
    for (const match of matches) {
      const normalized = normalizeUrl(match.replace(/[),.;]+$/, ''));
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      urls.push(normalized);
      if (urls.length >= MAX_IMPORT_URLS) break;
    }
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

function extractImageCandidates(html, baseUrl) {
  const urls = [];
  const seen = new Set();
  const push = (raw) => {
    if (!raw) return;
    try {
      const absolute = new URL(raw, baseUrl).toString();
      if (seen.has(absolute)) return;
      if (!/^https?:\/\//i.test(absolute)) return;
      seen.add(absolute);
      urls.push(absolute);
    } catch {
      /* ignore */
    }
  };

  push(extractMeta(html, 'property', 'og:image'));
  push(extractMeta(html, 'name', 'twitter:image'));

  const imgTags = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
  for (const tag of imgTags.slice(0, 12)) {
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
    push(src);
    if (urls.length >= 8) break;
  }

  return urls.slice(0, 8);
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
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

async function fetchPageSnapshot(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const social = isSocialMediaUrl(url);
  const instagram = isInstagramUrl(url);
  try {
    const [pageResult, oembed] = await Promise.all([
      fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,sq;q=0.8',
        },
      })
        .then(async (res) => {
          const html = await res.text();
          return { res, html };
        })
        .catch((err) => ({ res: null, html: '', fetchError: err?.message || 'Failed to fetch page' })),
      instagram ? fetchInstagramOEmbed(url) : Promise.resolve(null),
    ]);

    if (!pageResult.res && !oembed?.caption) {
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

    const html = pageResult.html || '';
    const res = pageResult.res;
    const ogTitle =
      extractMeta(html, 'property', 'og:title') ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ||
      null;
    const ogDescription =
      extractMeta(html, 'property', 'og:description') ||
      extractMeta(html, 'name', 'description') ||
      null;

    // Caption / description text is the source of truth for social posts.
    const caption = oembed?.caption || ogDescription || null;
    const title =
      (oembed?.authorName ? `@${oembed.authorName}` : null) ||
      ogTitle ||
      null;
    const description = caption || ogDescription || null;

    const imageUrls = [];
    if (oembed?.thumbnailUrl) imageUrls.push(oembed.thumbnailUrl);
    for (const img of extractImageCandidates(html, url)) {
      if (!imageUrls.includes(img)) imageUrls.push(img);
      if (imageUrls.length >= 8) break;
    }

    // Prefer real caption text; avoid dumping Instagram login-wall HTML into the model.
    const textParts = [];
    if (oembed?.authorName) textParts.push(`Instagram author: @${oembed.authorName}`);
    if (caption) textParts.push(`Post caption / description:\n${caption}`);
    else if (ogTitle || ogDescription) {
      textParts.push([ogTitle, ogDescription].filter(Boolean).join('\n'));
    }
    if (!social && html) {
      textParts.push(stripHtml(html).slice(0, 4000));
    }

    const text = textParts.filter(Boolean).join('\n\n').slice(0, 6000);

    return {
      ok: Boolean(res?.ok || caption),
      status: res?.status || (caption ? 200 : 0),
      finalUrl: res?.url || url,
      title,
      description,
      caption,
      authorName: oembed?.authorName || null,
      text,
      imageUrls,
      social,
      fetchError: caption ? null : pageResult.fetchError || null,
    };
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
  const categoryInstruction = CATEGORIES.includes(preferredCategory)
    ? `You MUST use category "${preferredCategory}" only. Do not pick another category.`
    : `Choose exactly one category:
- real-estate (apartments, houses, villas, offices, shops, land)
- cars (vehicles)
- job-listings (job posts)
- marketplace (products / goods)
- businesses (restaurants, bars, cafés, local businesses)
- professionals (freelancers / service providers)`;

  const modeInstruction =
    mode === 'edit'
      ? `MODE: EDIT an existing listing.
You receive the current listing JSON plus the user's edit instructions (and optional images/links).
Return an UPDATED full draft. Keep fields the user did not ask to change. Apply only the requested edits.
If they ask to add/replace images, set imageRoles for attached images and/or keep/merge imageUrls.`
      : `MODE: CREATE a new listing from the user's prompt and/or website links and/or attached images.
Use seller profile/signup info as defaults when the prompt omits contact details, business name, phone, etc.`;

  return `You are KuTaGjej's listing assistant for Albania.
${modeInstruction}

${categoryInstruction}

Return ONLY valid JSON:
{
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
cars: make, model, variant, description, year, kilometers, transmission (automatic|manual), fuelType (petrol|diesel|electric|hybrid-petrol|plugin-hybrid|lpg), price, currency (EUR|LEK), color, contactPhone
job-listings: title, description, industry, education, experience, jobType (full-time|part-time|remote|internship|freelance), workLocation (onsite|hybrid|remote), salary, currency, contactPhone, responsibilities (string[]), requirements (string[])
marketplace: transactionType (shes|jap-me-qira), title, description, category (elektronike|mobilje-shtepi|veshje-aksesore|libra-shkolla|sport-hobi|lodra|automjete-pjese|ushqime-bujqesi|sherbime|te-tjera), condition (i-ri|si-i-ri|shume-mire|mire|me-defekte), price, currency, contactPhone
businesses: title, description, category (restorant|bar|kafe|brunch|piceri-fast-food|pasticeri), contactPhone, servicesHighlight
professionals: title, description, category (konsulent|freelance|sherbim|kurse|dizajn-it|marketing|mjekesi|arsim), servicesHighlight, price, currency, contactPhone, responseTimeHours
  - fitness trainers / personal training / gym coaching / workout courses → category "kurse"
  - apps, digital products, subscriptions sold as products → marketplace (category "sherbime" or "sport-hobi") is OK when the post is mainly selling a product/app

Rules:
- ALWAYS prioritize written text: post caption, page description, og:description, and the user's prompt. Images are secondary context only.
- For Instagram/TikTok/social links, the field "caption" (post description) is the source of truth for what is being offered.
- Do NOT invent a profession from the username alone (e.g. do not assume "konsulent" / marketing / design unless the caption says so).
- Prefer Albanian for title/description when the caption/prompt is in Albanian; otherwise keep their language.
- Invent as little as possible. Leave unknown fields empty string / empty array / null.
- Always fill description with concrete details from the caption/prompt (offers, prices, product names like apps, services).
- Use profile.phone for contactPhone when missing. Use profile.businessName / full name for title when relevant.
- cityName should be an Albanian city when mentioned (e.g. Tiranë, Durrës).
- imageUrls: keep only absolute http(s) URLs from the page snapshot when relevant (max 8). Attached images are sent separately — describe roles via imageRoles; do not invent fake image URLs.
- If images show work/products/venue, use them only to support details already present in the caption/text.
- If the page is thin (Instagram login wall, blocked scraper) but caption is present, build the draft from the caption + prompt + profile.`;
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
  const parts = [
    {
      type: 'text',
      text: JSON.stringify(payload),
    },
  ];
  for (let i = 0; i < attachedImages.length; i += 1) {
    const img = attachedImages[i];
    const hint = img.hint ? ` Hint: ${img.hint}` : '';
    parts.push({
      type: 'text',
      text: `Attached image #${i}.${hint}`,
    });
    parts.push({
      type: 'image_url',
      image_url: { url: img.url },
    });
  }
  return parts;
}

function parseAiListingResponse(raw, { forcedCategory, fallbackImageUrls = [] }) {
  let parsed;
  try {
    parsed = JSON.parse(typeof raw === 'string' ? raw : '{}');
  } catch {
    parsed = {};
  }

  const category =
    forcedCategory ||
    (CATEGORIES.includes(parsed.category) ? parsed.category : 'marketplace');
  const form = parsed.form && typeof parsed.form === 'object' ? parsed.form : {};
  const imageUrls = Array.isArray(parsed.imageUrls)
    ? parsed.imageUrls
        .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
        .slice(0, 8)
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
    title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    cityName: typeof parsed.cityName === 'string' ? parsed.cityName.trim() : '',
    imageUrls: imageUrls.length ? imageUrls : fallbackImageUrls.slice(0, 8),
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
      max_tokens: 1200,
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
      instruction:
        'Build the listing from caption/description/text first. Use images only as supporting context. Do not invent professions or offers missing from the text.',
    },
  });
}

async function finalizeDraft({ interpreted, sourceUrl, warning, profile }) {
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
    title: interpreted.title || form.title || form.make || 'Draft listing',
    summary: interpreted.summary || '',
    cityName: interpreted.cityName || '',
    imageUrls: interpreted.imageUrls,
    imageRoles: interpreted.imageRoles || [],
    form,
    warning: warning || null,
  };
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
      drafts.push(
        await finalizeDraft({
          interpreted,
          sourceUrl: url,
          warning: snapshot.ok
            ? null
            : snapshot.fetchError || 'Page content was limited; draft may need edits.',
          profile,
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
  MAX_IMPORT_URLS,
};

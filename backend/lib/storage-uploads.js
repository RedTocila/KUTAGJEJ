'use strict';

const crypto = require('crypto');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');
const { getSupabaseAdmin } = require('./supabase');
const { MAX_IMAGE_BYTES, MAX_IMAGES } = require('./image-upload');
const { compressImageBuffer } = require('./compress-image');

const UPLOADS_BUCKET = 'uploads';
const FETCH_TIMEOUT_MS = 25_000;
const MAX_IMAGE_REDIRECTS = 5;
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let bucketReady = false;

function isOurStorageUrl(url) {
  const u = String(url || '');
  return (
    /\/storage\/v1\/object\/public\/uploads\//i.test(u) ||
    /\.public\.blob\.vercel-storage\.com\//i.test(u)
  );
}

async function ensureUploadsBucket() {
  if (bucketReady) return;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb.storage.getBucket(UPLOADS_BUCKET);
  if (error || !data) {
    const { error: createErr } = await sb.storage.createBucket(UPLOADS_BUCKET, {
      public: true,
      fileSizeLimit: MAX_IMAGE_BYTES,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
    if (createErr && !/already exists/i.test(createErr.message || '')) {
      throw createErr;
    }
  }
  bucketReady = true;
}

/**
 * Upload multer-style file objects ({ buffer, originalname, mimetype }) to
 * the public `uploads` Supabase bucket. Returns public URLs in order.
 * Always re-encodes to a compact JPEG before storing.
 */
async function uploadBuffersToSupabase(files, folder = 'listings') {
  await ensureUploadsBucket();
  const sb = getSupabaseAdmin();
  const urls = [];
  for (const file of files || []) {
    const compressed = await compressImageBuffer(file.buffer, {
      folder,
      mimetype: file.mimetype,
      ext: String(file.originalname || 'image').split('.').pop() || 'jpg',
    });
    const path = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${compressed.ext}`;
    const { error } = await sb.storage.from(UPLOADS_BUCKET).upload(path, compressed.buffer, {
      contentType: compressed.mimetype,
      upsert: false,
      cacheControl: 'public, max-age=31536000, immutable',
    });
    if (error) throw error;
    const { data: publicUrlData } = sb.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
    urls.push(publicUrlData.publicUrl);
  }
  return urls;
}

function extFromContentType(contentType) {
  const ct = String(contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (ct === 'image/jpeg' || ct === 'image/jpg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return null;
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop() || '';
    if (/^(jpe?g|png|webp|gif)$/i.test(ext)) {
      return ext.toLowerCase() === 'jpeg' ? 'jpg' : ext.toLowerCase();
    }
  } catch {
    /* ignore */
  }
  return 'jpg';
}

function imageFetchHeaders(url) {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    host = '';
  }
  const isInstagramCdn =
    host.includes('cdninstagram.com') ||
    host.includes('fbcdn.net') ||
    host.includes('instagram.com');
  return {
    Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    // Instagram CDN often blocks generic bots; use a browser UA + referer.
    'User-Agent': BROWSER_UA,
    ...(isInstagramCdn
      ? {
          Referer: 'https://www.instagram.com/',
          Origin: 'https://www.instagram.com',
        }
      : {}),
  };
}

function unsafeUrlError() {
  const err = new Error('UNSAFE_URL');
  err.code = 'UNSAFE_URL';
  return err;
}

function ipv4ToParts(ip) {
  const parts = String(ip || '').split('.');
  if (parts.length !== 4) return null;
  const nums = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    if (part.length > 1 && part.startsWith('0')) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    nums.push(n);
  }
  return nums;
}

function isBlockedIpv4(parts) {
  if (!parts) return true;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function expandIpv6(ip) {
  const lower = String(ip || '').toLowerCase().split('%')[0];
  if (!lower.includes(':')) return null;
  const halves = lower.split('::');
  if (halves.length > 2) return null;
  const parseSide = (side) => (side ? side.split(':').map((part) => parseInt(part, 16)) : []);
  let head = parseSide(halves[0]);
  let tail = halves.length === 2 ? parseSide(halves[1]) : [];
  if (head.some((n) => !Number.isFinite(n) || n < 0 || n > 0xffff)) return null;
  if (tail.some((n) => !Number.isFinite(n) || n < 0 || n > 0xffff)) return null;
  if (halves.length === 1) {
    if (head.length !== 8) return null;
    return head;
  }
  const missing = 8 - head.length - tail.length;
  if (missing < 0) return null;
  return [...head, ...Array(missing).fill(0), ...tail];
}

function ipv4FromMapped(words) {
  if (!words || words.length !== 8) return null;
  const prefix = words.slice(0, 6).every((n, i) => n === (i === 5 ? 0xffff : 0));
  if (!prefix) return null;
  const hi = words[6];
  const lo = words[7];
  return [(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255];
}

function isBlockedIp(ip) {
  const raw = String(ip || '').trim().toLowerCase();
  if (!raw) return true;
  const mappedDotted = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedDotted) return isBlockedIpv4(ipv4ToParts(mappedDotted[1]));
  const family = net.isIP(raw);
  if (family === 4) return isBlockedIpv4(ipv4ToParts(raw));
  if (family !== 6 && !raw.includes(':')) return true;

  const words = expandIpv6(raw);
  if (!words) return true;
  const mapped = ipv4FromMapped(words);
  if (mapped) return isBlockedIpv4(mapped);
  const [a, b] = words;
  if (words.every((n) => n === 0)) return true;
  if (a === 0 && words.slice(1, 7).every((n) => n === 0) && words[7] === 1) return true;
  if ((a & 0xffc0) === 0xfe80) return true;
  if ((a & 0xfe00) === 0xfc00) return true;
  if ((a & 0xff00) === 0xff00) return true;
  if (a === 0x2001 && b === 0x0db8) return true;
  return false;
}

function decimalIpv4(hostname) {
  if (!/^\d+$/.test(hostname)) return null;
  const n = Number(hostname);
  if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return null;
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function blockedHostname(hostname) {
  const host = String(hostname || '')
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
    .toLowerCase();
  if (!host || host.length > 253) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === 'metadata.google.internal') return true;
  const decimal = decimalIpv4(host);
  if (decimal) return isBlockedIp(decimal);
  if (net.isIP(host)) return isBlockedIp(host);
  if (/^[0-9.]+$/.test(host)) {
    const parts = ipv4ToParts(host);
    if (!parts) return true;
    return isBlockedIpv4(parts);
  }
  return false;
}

function normalizeLookupRecords(addresses) {
  if (!addresses) return [];
  const list = Array.isArray(addresses) ? addresses : [addresses];
  return list
    .map((entry) => {
      if (typeof entry === 'string') return { address: entry, family: net.isIP(entry) };
      return { address: entry.address, family: entry.family || net.isIP(entry.address) };
    })
    .filter((entry) => entry.address);
}

function resolveHost(hostname, lookupFn) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err, addresses) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(normalizeLookupRecords(addresses));
    };
    let returned;
    try {
      returned = lookupFn(hostname, { all: true }, finish);
    } catch (err) {
      finish(err);
      return;
    }
    if (returned && typeof returned.then === 'function') {
      returned.then((addresses) => finish(null, addresses), finish);
      return;
    }
    if (returned != null) finish(null, returned);
  });
}

async function assertPublicResolution(hostname, lookupFn = dns.lookup) {
  const host = String(hostname || '').replace(/^\[|\]$/g, '');
  if (blockedHostname(host)) throw unsafeUrlError();
  const decimal = decimalIpv4(host);
  if (decimal) {
    if (isBlockedIp(decimal)) throw unsafeUrlError();
    return [{ address: decimal, family: 4 }];
  }
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw unsafeUrlError();
    return [{ address: host, family: net.isIP(host) }];
  }
  let records = [];
  try {
    records = await resolveHost(host, lookupFn);
  } catch (err) {
    if (err && err.code === 'UNSAFE_URL') throw err;
    throw unsafeUrlError();
  }
  if (!records.length || records.some((record) => isBlockedIp(record.address))) {
    throw unsafeUrlError();
  }
  return records;
}

function assertSafeRemoteImageUrl(url, lookupFn = dns.lookup) {
  let parsed;
  try {
    parsed = new URL(String(url || '').trim());
  } catch {
    throw unsafeUrlError();
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw unsafeUrlError();
  if (parsed.username || parsed.password) throw unsafeUrlError();
  return assertPublicResolution(parsed.hostname, lookupFn);
}

async function isSafeRemoteImageUrl(url, lookupFn = dns.lookup) {
  try {
    await assertSafeRemoteImageUrl(url, lookupFn);
    return true;
  } catch {
    return false;
  }
}

function responseHeader(res, name) {
  if (res.headers && typeof res.headers.get === 'function') return res.headers.get(name);
  const headers = res.headers || {};
  return headers[name] ?? headers[String(name).toLowerCase()] ?? null;
}

function destroyResponse(res) {
  if (res && typeof res.destroy === 'function') res.destroy();
}

function readCappedStream(res, maxBytes, signal) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    let settled = false;
    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(value);
    };
    const onAbort = () => {
      destroyResponse(res);
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      finish(err);
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
    res.on('data', (chunk) => {
      if (typeof res.pause === 'function') res.pause();
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      received += buf.length;
      if (received > maxBytes) {
        destroyResponse(res);
        const err = new Error('image exceeds size limit');
        err.code = 'TOO_LARGE';
        finish(err);
        return;
      }
      chunks.push(buf);
      if (!settled && typeof res.resume === 'function') res.resume();
    });
    res.on('end', () => finish(null, received ? Buffer.concat(chunks, received) : Buffer.alloc(0)));
    res.on('error', (err) => finish(err));
  });
}

function defaultRemoteRequest(targetUrl, { headers, signal, lookup }) {
  return new Promise((resolve, reject) => {
    const lib = targetUrl.protocol === 'https:' ? https : http;
    const req = lib.request(
      {
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || undefined,
        path: `${targetUrl.pathname}${targetUrl.search}`,
        method: 'GET',
        headers,
        lookup,
        signal,
      },
      (res) => resolve(res),
    );
    req.on('error', reject);
    req.end();
  });
}

function nodeLookup(lookupFn) {
  return function lookup(hostname, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    assertPublicResolution(hostname, lookupFn)
      .then((records) => {
        if (options && options.all) {
          callback(null, records);
          return;
        }
        const chosen = records[0];
        callback(null, chosen.address, chosen.family);
      })
      .catch((err) => callback(err));
  };
}

/**
 * Download a remote listing photo. Used by storage mirroring and the public
 * story-image proxy (browser CORS / hotlink protection otherwise blanks Stories).
 * Every redirect is checked again, and DNS is re-resolved when the socket connects.
 */
async function fetchRemoteImageBuffer(
  url,
  {
    timeoutMs = FETCH_TIMEOUT_MS,
    maxBytes = MAX_IMAGE_BYTES,
    lookup = dns.lookup,
    request = defaultRemoteRequest,
  } = {},
) {
  const raw = String(url || '').trim();
  let current;
  try {
    current = new URL(raw);
  } catch {
    return null;
  }
  if (current.protocol !== 'http:' && current.protocol !== 'https:') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let hop = 0; hop <= MAX_IMAGE_REDIRECTS; hop += 1) {
      await assertSafeRemoteImageUrl(current.href, lookup);
      // Resolve again at connect time so a DNS rebinding answer cannot reuse the preflight result.
      await assertPublicResolution(current.hostname, lookup);
      const res = await request(current, {
        headers: imageFetchHeaders(current.href),
        signal: controller.signal,
        lookup: nodeLookup(lookup),
      });
      const status = Number(res.statusCode || res.status || 0);
      if (status >= 300 && status < 400) {
        const location = responseHeader(res, 'location');
        destroyResponse(res);
        if (!location || hop === MAX_IMAGE_REDIRECTS) return null;
        current = new URL(location, current);
        continue;
      }
      if (status < 200 || status >= 300) {
        destroyResponse(res);
        return null;
      }

      const contentType = String(responseHeader(res, 'content-type') || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
      if (contentType && !contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
        destroyResponse(res);
        return null;
      }

      const declared = Number(responseHeader(res, 'content-length'));
      if (Number.isFinite(declared) && declared > maxBytes) {
        destroyResponse(res);
        return null;
      }

      const buf = await readCappedStream(res, maxBytes, controller.signal);
      if (!buf.length) return null;
      const ext = extFromContentType(contentType) || extFromUrl(current.href);
      const mime =
        contentType && contentType.startsWith('image/')
          ? contentType
          : `image/${ext === 'jpg' ? 'jpeg' : ext || 'jpeg'}`;
      return { buffer: buf, mime, ext: ext || 'jpg' };
    }
    return null;
  } catch (err) {
    if (err && err.code === 'UNSAFE_URL') throw err;
    if (err && err.code !== 'TOO_LARGE' && err?.name !== 'AbortError') {
      console.warn('fetchRemoteImageBuffer failed:', raw.slice(0, 120), err?.message || err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a remote image and store it in our uploads bucket.
 * Returns the public URL, or null if the fetch/upload fails.
 */
async function mirrorRemoteImageUrl(url, folder = 'listings') {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw)) return null;
  if (isOurStorageUrl(raw)) return raw;

  try {
    const fetched = await fetchRemoteImageBuffer(raw);
    if (!fetched) return null;

    const [publicUrl] = await uploadBuffersToSupabase(
      [{ buffer: fetched.buffer, originalname: `remote.${fetched.ext}`, mimetype: fetched.mime }],
      folder,
    );
    return publicUrl || null;
  } catch (err) {
    console.warn('mirrorRemoteImageUrl failed:', raw.slice(0, 120), err?.message || err);
    return null;
  }
}

/**
 * Mirror a list of remote image URLs into our storage.
 * Already-hosted KuTaGjej URLs are kept as-is. Failed mirrors are skipped.
 */
async function mirrorRemoteImageUrls(urls, folder = 'listings', max = MAX_IMAGES) {
  const input = Array.isArray(urls) ? urls : [];
  const out = [];
  const seen = new Set();
  for (const raw of input) {
    if (out.length >= max) break;
    const url = String(raw || '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const mirrored = await mirrorRemoteImageUrl(url, folder);
    if (mirrored && !out.includes(mirrored)) out.push(mirrored);
  }
  return out;
}

module.exports = {
  UPLOADS_BUCKET,
  isOurStorageUrl,
  ensureUploadsBucket,
  uploadBuffersToSupabase,
  isBlockedIp,
  assertSafeRemoteImageUrl,
  isSafeRemoteImageUrl,
  fetchRemoteImageBuffer,
  mirrorRemoteImageUrl,
  mirrorRemoteImageUrls,
};

'use strict';

const dns = require('dns').promises;
const net = require('net');
const express = require('express');
const { fetchRemoteImageBuffer } = require('../lib/storage-uploads');

const router = express.Router();

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 6 * 1024 * 1024;
const MAX_URL_LENGTH = 8_000;

function isPrivateIp(ip) {
  const ipType = net.isIP(ip);
  if (!ipType) return true;

  if (ipType === 4) {
    const parts = ip.split('.').map((n) => Number(n));
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('::ffff:')) return isPrivateIp(normalized.slice(7));
  return false;
}

async function assertPublicHostname(hostname) {
  const records = await dns.lookup(hostname, { all: true });
  if (!records.length) throw new Error('unresolved');
  if (records.some((r) => isPrivateIp(r.address))) {
    throw new Error('private');
  }
}

function parseRequestedUrl(raw) {
  const value = String(raw || '').trim();
  if (!value || value.length > MAX_URL_LENGTH) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  if (!parsed.hostname || parsed.hostname.length > 253) return null;
  if (/\/api\/public\/image-proxy(?:\?|$)/i.test(parsed.pathname)) return null;
  return parsed;
}

router.get('/', async (req, res) => {
  const parsed = parseRequestedUrl(req.query.url);
  if (!parsed) {
    return res.status(400).json({ message: 'URL e pavlefshme.' });
  }

  try {
    await assertPublicHostname(parsed.hostname);
  } catch {
    return res.status(400).json({ message: 'URL e pavlefshme.' });
  }

  try {
    const fetched = await fetchRemoteImageBuffer(parsed.toString(), {
      timeoutMs: FETCH_TIMEOUT_MS,
      maxBytes: MAX_BYTES,
    });
    if (!fetched) {
      return res.status(404).json({ message: 'Fotoja nuk u gjet.' });
    }

    res.setHeader('Content-Type', fetched.mime || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(fetched.buffer);
  } catch (err) {
    console.warn('GET /public/image-proxy:', err?.message || err);
    return res.status(502).json({ message: 'Fotoja nuk u ngarkua.' });
  }
});

module.exports = router;

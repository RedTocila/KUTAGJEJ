'use strict';

const express = require('express');
const { fetchRemoteImageBuffer } = require('../lib/storage-uploads');

const router = express.Router();

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 6 * 1024 * 1024;
const MAX_URL_LENGTH = 8_000;

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
    if (err && err.code === 'UNSAFE_URL') {
      return res.status(400).json({ message: 'URL e pavlefshme.' });
    }
    console.warn('GET /public/image-proxy:', err?.message || err);
    return res.status(502).json({ message: 'Fotoja nuk u ngarkua.' });
  }
});

module.exports = router;

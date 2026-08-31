'use strict';

// Public listing payloads are safe to reuse briefly and expensive to rebuild.
// Keep detail routes on their explicit no-store path.
const TTL_MS = 120 * 1000;

/** @type {Map<string, { at: number, json: string }>} */
const store = new Map();

function getCached(key) {
  const hit = store.get(String(key));
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(String(key));
    return null;
  }
  try {
    return JSON.parse(hit.json);
  } catch {
    store.delete(String(key));
    return null;
  }
}

function setCached(key, value) {
  store.set(String(key), { at: Date.now(), json: JSON.stringify(value) });
}

module.exports = { getCached, setCached, TTL_MS };

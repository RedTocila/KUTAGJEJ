'use strict';

const crypto = require('crypto');

const TTL_MS = 20 * 60 * 1000;
const MAX_BATCH = 50;

/** In-memory AI Build batch so one paste of N links still costs one daily use. */
const sessions = new Map();

function pruneExpired() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(id);
  }
}

function clampCap(value) {
  const n = Math.floor(Number(value) || 1);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_BATCH, n);
}

function createAiImportBatch({ userId, cap }) {
  pruneExpired();
  const id = crypto.randomBytes(16).toString('hex');
  sessions.set(id, {
    userId: String(userId),
    cap: clampCap(cap),
    used: 1,
    expiresAt: Date.now() + TTL_MS,
  });
  return id;
}

/**
 * Reserve the next slot in an existing batch.
 * @returns {{ ok: true, remaining: number } | { ok: false, reason: 'invalid' | 'exhausted' }}
 */
function takeAiImportBatchSlot({ batchId, userId }) {
  pruneExpired();
  const id = String(batchId || '').trim();
  if (!id) return { ok: false, reason: 'invalid' };
  const session = sessions.get(id);
  if (!session || session.userId !== String(userId)) {
    return { ok: false, reason: 'invalid' };
  }
  if (session.expiresAt < Date.now()) {
    sessions.delete(id);
    return { ok: false, reason: 'invalid' };
  }
  if (session.used >= session.cap) {
    return { ok: false, reason: 'exhausted' };
  }
  session.used += 1;
  session.expiresAt = Date.now() + TTL_MS;
  return { ok: true, remaining: session.cap - session.used };
}

module.exports = {
  createAiImportBatch,
  takeAiImportBatchSlot,
};

'use strict';

/**
 * Re-encode user uploads to reasonably small JPEGs.
 * Looks fine on phone/desktop cards & galleries without multi‑MB originals.
 */
const LISTING_MAX_EDGE = 1280;
const LISTING_QUALITY = 72;
const LISTING_TARGET_BYTES = 280_000;

const AVATAR_MAX_EDGE = 400;
const AVATAR_QUALITY = 78;
const AVATAR_TARGET_BYTES = 80_000;

function isAvatarFolder(folder) {
  return String(folder || '')
    .trim()
    .toLowerCase() === 'avatars';
}

/**
 * @param {Buffer} buffer
 * @param {{ folder?: string, maxEdge?: number, quality?: number, targetBytes?: number }} [opts]
 * @returns {Promise<{ buffer: Buffer, mimetype: string, ext: string }>}
 */
async function compressImageBuffer(buffer, opts = {}) {
  const folder = opts.folder || 'listings';
  const avatar = isAvatarFolder(folder);
  const maxEdge = opts.maxEdge ?? (avatar ? AVATAR_MAX_EDGE : LISTING_MAX_EDGE);
  const quality = opts.quality ?? (avatar ? AVATAR_QUALITY : LISTING_QUALITY);
  const targetBytes = opts.targetBytes ?? (avatar ? AVATAR_TARGET_BYTES : LISTING_TARGET_BYTES);

  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    return { buffer, mimetype: 'image/jpeg', ext: 'jpg' };
  }

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    return { buffer, mimetype: 'image/jpeg', ext: 'jpg' };
  }

  try {
    const base = sharp(buffer, { failOn: 'none', animated: false }).rotate();
    const meta = await base.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    const longest = Math.max(width, height);

    let pipeline = base;
    if (longest > maxEdge) {
      pipeline = pipeline.resize({
        width: maxEdge,
        height: maxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Flatten transparency onto white so PNG → JPEG stays clean.
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });

    let out = await pipeline.jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:2:0' }).toBuffer();

    // If still heavy, nudge quality down once more.
    if (out.length > targetBytes && quality > 58) {
      const retryQuality = Math.max(58, quality - 12);
      out = await sharp(out, { failOn: 'none' })
        .jpeg({ quality: retryQuality, mozjpeg: true, chromaSubsampling: '4:2:0' })
        .toBuffer();
    }

    return { buffer: out, mimetype: 'image/jpeg', ext: 'jpg' };
  } catch (err) {
    console.warn('compressImageBuffer failed, uploading original:', err?.message || err);
    return {
      buffer,
      mimetype: opts.mimetype || 'image/jpeg',
      ext: opts.ext || 'jpg',
    };
  }
}

module.exports = {
  compressImageBuffer,
  LISTING_MAX_EDGE,
  LISTING_QUALITY,
  AVATAR_MAX_EDGE,
  AVATAR_QUALITY,
};

// ---------------------------------------------------------------------------
// Shared image-upload utilities used by every listing category.
//
// - `imageUpload`        : a configured multer instance (memory storage) that
//                          only accepts JPEG/PNG/WEBP/GIF up to 8 MB each.
// - `uploadBuffersToBlob`: streams uploaded buffers to Vercel Blob and returns
//                          their public URLs (gracefully returns [] in local
//                          dev when BLOB_READ_WRITE_TOKEN is not configured).
// - `sanitizeImageUrls`  : normalises an incoming imageUrls value (array, JSON
//                          string, or comma list) into a clean http(s) URL list.
// ---------------------------------------------------------------------------
const multer = require('multer');
const { put } = require('@vercel/blob');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_IMAGES = 8;

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP and GIF images are allowed.'));
    }
  },
});

/**
 * Upload an array of multer file objects to Vercel Blob.
 * Returns the list of public URLs. When no Blob token is configured (local dev)
 * it silently returns an empty array so listing creation still succeeds.
 */
async function uploadBuffersToBlob(files, folder = 'listings') {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const urls = [];
  for (const file of files || []) {
    const ext = String(file.originalname || 'image').split('.').pop() || 'jpg';
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const blob = await put(filename, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    urls.push(blob.url);
  }
  return urls;
}

/** Normalise an incoming imageUrls value into a clean, capped http(s) URL list. */
function sanitizeImageUrls(input, max = MAX_IMAGES) {
  let list = input;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = list.split(',');
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((u) => String(u || '').trim())
    // Never persist browser-only blob:/data: previews (blob:https://… looks similar but is not http).
    .filter((u) => /^https?:\/\//i.test(u) && !/^blob:/i.test(u) && !/^data:/i.test(u))
    .slice(0, max);
}

function requireListingPhotos(urls, min = 1) {
  if (!Array.isArray(urls) || urls.length < min) {
    return { ok: false, message: 'Shtoni të paktën një foto.' };
  }
  return { ok: true };
}

module.exports = {
  imageUpload,
  uploadBuffersToBlob,
  sanitizeImageUrls,
  requireListingPhotos,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
};
